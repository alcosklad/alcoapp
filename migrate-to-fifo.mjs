/**
 * Скрипт миграции существующих данных в FIFO систему
 * Преобразует текущие остатки в партии с batch_number
 */

import PocketBase from 'pocketbase';
import { getCityCode } from './src/lib/cityCodes.js';

const POCKETBASE_URL = 'http://146.103.121.96:8090';
const PB_ADMIN_EMAIL = 'admin@sklad.ru';
const PB_ADMIN_PASSWORD = '323282sssS';

// Функции генерации номеров (копируем логику из orderNumbers.js)
async function generateBatchNumber(pb, cityName, date = new Date()) {
  const cityCode = getCityCode(cityName);
  
  if (!cityCode) {
    throw new Error(`Неизвестный город: ${cityName}`);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  try {
    const lastBatch = await pb.collection('stocks').getFirstListItem(
      `batch_number ~ "${cityCode}-${dateStr}-%"`,
      {
        sort: '-batch_number',
        fields: 'batch_number'
      }
    ).catch(() => null);

    let sequence = 1;

    if (lastBatch && lastBatch.batch_number) {
      const parts = lastBatch.batch_number.split('-');
      const lastSequence = parseInt(parts[parts.length - 1], 10);
      sequence = lastSequence + 1;
    }

    const batchNumber = `${cityCode}-${dateStr}-${String(sequence).padStart(3, '0')}`;
    return batchNumber;
  } catch (error) {
    console.error('Error generating batch number:', error);
    const timestamp = Date.now().toString().slice(-3);
    return `${cityCode}-${dateStr}-${timestamp}`;
  }
}

async function generateOrderNumber(pb, cityName) {
  const cityCode = getCityCode(cityName);
  
  if (!cityCode) {
    throw new Error(`Неизвестный город: ${cityName}`);
  }

  try {
    const lastOrder = await pb.collection('orders').getFirstListItem(
      `city_code = "${cityCode}"`,
      {
        sort: '-order_number',
        fields: 'order_number'
      }
    ).catch(() => null);

    let nextNumber = 1;

    if (lastOrder && lastOrder.order_number) {
      const numberPart = lastOrder.order_number.substring(1);
      const currentNumber = parseInt(numberPart, 10);
      nextNumber = currentNumber + 1;
    }

    const orderNumber = `${cityCode}${String(nextNumber).padStart(5, '0')}`;
    return orderNumber;
  } catch (error) {
    console.error('Error generating order number:', error);
    const timestamp = Date.now().toString().slice(-5);
    return `${cityCode}${timestamp}`;
  }
}

const DRY_RUN = process.argv.includes('--dry-run');

console.log('═══════════════════════════════════════════');
console.log('  🔄 Миграция в FIFO систему');
console.log('═══════════════════════════════════════════');
if (DRY_RUN) {
  console.log('🧪 ТЕСТОВЫЙ ПРОГОН — изменения не будут сохранены\n');
} else {
  console.log('⚠️  РЕАЛЬНАЯ МИГРАЦИЯ — данные будут изменены!\n');
}

async function main() {
  const pb = new PocketBase(POCKETBASE_URL);
  
  try {
    // Авторизация
    console.log('🔐 Авторизация...');
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('  ✅ Успешно\n');
    
    // Загружаем данные
    console.log('📡 Загружаем данные...');
    const [stocks, suppliers, orders] = await Promise.all([
      pb.collection('stocks').getFullList({ expand: 'product,supplier' }),
      pb.collection('suppliers').getFullList(),
      pb.collection('orders').getFullList({ expand: 'user' })
    ]);
    
    console.log(`  ✅ Остатков: ${stocks.length}`);
    console.log(`  ✅ Городов: ${suppliers.length}`);
    console.log(`  ✅ Продаж: ${orders.length}\n`);
    
    // Создаем маппинг городов
    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
    
    // ==========================================
    // ЭТАП 1: Миграция остатков в партии
    // ==========================================
    console.log('📦 ЭТАП 1: Миграция остатков в партии...\n');
    
    let stocksUpdated = 0;
    let stocksSkipped = 0;
    
    for (const stock of stocks) {
      // Пропускаем если уже есть batch_number
      if (stock.batch_number) {
        stocksSkipped++;
        continue;
      }
      
      const cityName = supplierMap.get(stock.supplier) || 'Unknown';
      
      // Генерируем batch_number для существующего остатка
      const batchNumber = await generateBatchNumber(pb, cityName, new Date(stock.created));
      
      // Устанавливаем reception_date как дату создания записи
      const receptionDate = new Date(stock.created).toISOString().split('T')[0];
      
      // Устанавливаем cost_per_unit
      const costPerUnit = stock.cost || stock.purchase_price || 0;
      
      if (!DRY_RUN) {
        try {
          await pb.collection('stocks').update(stock.id, {
            batch_number: batchNumber,
            reception_date: receptionDate,
            cost_per_unit: costPerUnit
          });
          stocksUpdated++;
        } catch (error) {
          console.error(`  ❌ Ошибка обновления остатка ${stock.id}:`, error.message);
        }
      } else {
        stocksUpdated++;
      }
      
      if (stocksUpdated % 50 === 0) {
        console.log(`  ✅ Обработано остатков: ${stocksUpdated}...`);
      }
    }
    
    console.log(`\n  ✅ Обновлено остатков: ${stocksUpdated}`);
    console.log(`  ⏭️  Пропущено (уже с batch_number): ${stocksSkipped}\n`);
    
    // ==========================================
    // ЭТАП 2: Добавление номеров к продажам
    // ==========================================
    console.log('🛒 ЭТАП 2: Добавление номеров к продажам...\n');
    
    let ordersUpdated = 0;
    let ordersSkipped = 0;
    let ordersWithCost = 0;
    
    for (const order of orders) {
      // Пропускаем если уже есть order_number
      if (order.order_number) {
        ordersSkipped++;
        continue;
      }
      
      // Определяем город из пользователя или напрямую
      let cityName = order.city;
      if (!cityName && order.expand?.user?.supplier) {
        const userSupplier = suppliers.find(s => s.id === order.expand.user.supplier);
        cityName = userSupplier?.name;
      }
      
      if (!cityName) {
        console.log(`  ⚠️  Продажа ${order.id} - город не определен, пропускаем`);
        ordersSkipped++;
        continue;
      }
      
      // Генерируем order_number
      const orderNumber = await generateOrderNumber(pb, cityName);
      const cityCode = getCityCode(cityName);
      
      // Рассчитываем себестоимость и прибыль (если возможно)
      let costTotal = 0;
      let profit = 0;
      let hasValidCost = false;
      
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          // Пытаемся найти себестоимость товара
          const itemCost = item.cost || 0;
          const itemQuantity = item.quantity || 1;
          costTotal += itemCost * itemQuantity;
          
          if (itemCost > 0) hasValidCost = true;
        }
        
        profit = (order.total || 0) - costTotal;
      }
      
      if (!DRY_RUN) {
        try {
          const updateData = {
            order_number: orderNumber,
            city_code: cityCode
          };
          
          if (hasValidCost) {
            updateData.cost_total = costTotal;
            updateData.profit = profit;
            ordersWithCost++;
          }
          
          await pb.collection('orders').update(order.id, updateData);
          ordersUpdated++;
        } catch (error) {
          console.error(`  ❌ Ошибка обновления продажи ${order.id}:`, error.message);
        }
      } else {
        ordersUpdated++;
        if (hasValidCost) ordersWithCost++;
      }
      
      if (ordersUpdated % 50 === 0) {
        console.log(`  ✅ Обработано продаж: ${ordersUpdated}...`);
      }
    }
    
    console.log(`\n  ✅ Обновлено продаж: ${ordersUpdated}`);
    console.log(`  💰 С себестоимостью: ${ordersWithCost}`);
    console.log(`  ⏭️  Пропущено (уже с номером): ${ordersSkipped}\n`);
    
    // ==========================================
    // ИТОГИ
    // ==========================================
    console.log('═══════════════════════════════════════════');
    console.log('📊 ИТОГИ МИГРАЦИИ:');
    console.log('═══════════════════════════════════════════');
    console.log(`Остатки:`);
    console.log(`  ✅ Преобразовано в партии: ${stocksUpdated}`);
    console.log(`  ⏭️  Уже были партиями: ${stocksSkipped}`);
    console.log(``);
    console.log(`Продажи:`);
    console.log(`  ✅ Добавлены номера: ${ordersUpdated}`);
    console.log(`  💰 С себестоимостью: ${ordersWithCost}`);
    console.log(`  ⏭️  Уже имели номера: ${ordersSkipped}`);
    console.log('═══════════════════════════════════════════');
    
    if (DRY_RUN) {
      console.log('\n🧪 Тестовый прогон завершен. Для реальной миграции запустите:');
      console.log('   node migrate-to-fifo.mjs');
    } else {
      console.log('\n✅ Миграция завершена успешно!');
      console.log('\n📝 Следующие шаги:');
      console.log('   1. Проверьте данные в админ-панели PocketBase');
      console.log('   2. Протестируйте создание новых приемок');
      console.log('   3. Протестируйте продажу товаров (FIFO)');
      console.log('   4. Проверьте отображение партий в остатках');
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА МИГРАЦИИ:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
