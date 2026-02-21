import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const MOYSKLAD_LOGIN = process.env.MOYSKLAD_LOGIN || 'admin1@disester1';
const MOYSKLAD_PASSWORD = process.env.MOYSKLAD_PASSWORD || '323282zzzZ-';
const MOYSKLAD_API = 'https://api.moysklad.ru/api/remap/1.2';

const POCKETBASE_URL = 'http://146.103.121.96:8090';
const PB_ADMIN_EMAIL = 'admin@nashsklad.store';
const PB_ADMIN_PASSWORD = 'admin12345';

const DRY_RUN = process.argv.includes('--dry-run');

function getMoySkladHeaders() {
  const auth = Buffer.from(`${MOYSKLAD_LOGIN}:${MOYSKLAD_PASSWORD}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json;charset=utf-8',
    'Content-Type': 'application/json'
  };
}

async function fetchAll(endpoint) {
  const headers = getMoySkladHeaders();
  let allRows = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const url = `${MOYSKLAD_API}${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`;
    
    // Добавляем таймаут и обработку ошибок сети
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 секунд таймаут

      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`МойСклад API ошибка ${res.status}: ${text.substring(0, 200)}`);
      }

      const data = await res.json();
      const rows = data.rows || [];
      allRows.push(...rows);

      if (offset % 50 === 0) {
        process.stdout.write(`.`); // Индикатор прогресса
      }
      
      // Log progress every 500 rows
      if (allRows.length % 500 === 0) {
         console.log(` (${allRows.length} загружено)`);
      }

      if (allRows.length >= (data.meta?.size || 0) || rows.length === 0) break;
      offset += limit;
    } catch (e) {
      console.error(`\nОшибка при загрузке (offset ${offset}): ${e.message}`);
      // Пробуем повторить один раз через 5 секунд
      await new Promise(resolve => setTimeout(resolve, 5000));
      // Если это повторная ошибка, цикл прервется или можно добавить счетчик попыток
      // Пока просто продолжаем (или выбрасываем ошибку если критично)
      throw e; 
    }
  }
  console.log(''); // Перенос строки после точек
  return allRows;
}

// Extract UUID from href like ".../entity/employee/UUID"
function extractId(meta) {
  if (!meta?.meta?.href) return null;
  const parts = meta.meta.href.split('/');
  return parts[parts.length - 1];
}

// Маппинг складов
const STORE_CITY_MAP = {
  'Самара': 'Самара',
  'Нижний Новгород': 'НН',
  'Красноярск УТРО': 'Красноярск',
  'Красноярск': 'Красноярск',
  'Новосибирск': 'Новосибирск',
  'СПБ Заставская 46к2 П1': 'СПБ',
  'Саратов': 'Саратов',
  'Калининград': 'Калининград',
  'Сочи': 'Сочи',
  'Иркутск': 'Иркутск',
  'Омск': 'Омск',
  'Уфа': 'Уфа',
  'Казань': 'Казань',
  'Пермь': 'Пермь',
  'Сургут': 'Сургут',
  'Волгоград': 'Волгоград',
  'Воронеж': 'Воронеж'
};

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  🛒 Импорт смен и продаж из МойСклад');
  console.log('═══════════════════════════════════════════');
  if (DRY_RUN) console.log('🧪 ТЕСТОВЫЙ ПРОГОН — записи в БД не будет\n');

  // 1. Подключаемся к PocketBase
  console.log('🔐 Подключаемся к PocketBase...');
  const pb = new PocketBase(POCKETBASE_URL);
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('  ✅ Авторизация успешна\n');
  } catch (error) {
    console.error('  ❌ Ошибка авторизации PocketBase:', error.message);
    process.exit(1);
  }

  // 2. Загружаем справочники из PocketBase
  console.log('📋 Загружаем справочники из PocketBase...');
  const [suppliers, users, products] = await Promise.all([
    pb.collection('suppliers').getFullList(),
    pb.collection('users').getFullList(),
    pb.collection('products').getFullList()
  ]);

  const supplierMap = new Map(suppliers.map(s => [s.name, s.id]));
  const productMap = new Map(products.map(p => [(p.name || '').toLowerCase().trim(), p]));
  
  console.log(`  ✅ Городов: ${suppliers.length}`);
  console.log(`  ✅ Пользователей: ${users.length}`);
  console.log(`  ✅ Товаров: ${products.length}\n`);

  // 3. Загружаем розничные смены из МойСклад (с начала 2026 года)
  console.log('📡 Загружаем розничные смены из МойСклад (с 2026-01-01)...');
  const dateFilterShifts = '2026-01-01';
  
  let retailShifts = [];
  try {
    retailShifts = await fetchAll(`/entity/retailshift?filter=moment>=${dateFilterShifts}&expand=store,organization`);
    console.log(`  ✅ Смен: ${retailShifts.length}\n`);
  } catch (error) {
    console.log(`  ⚠️  Ошибка загрузки смен: ${error.message}\n`);
  }

  // 4. Загружаем розничные продажи из МойСклад (с начала 2026 года)
  console.log('📡 Загружаем розничные продажи из МойСклад (с 2026-01-01)...');
  const dateFilterDemands = '2026-01-01';
  
  let retailDemands = [];
  try {
    // Expand positions.assortment to get product details immediately
    retailDemands = await fetchAll(`/entity/retaildemand?filter=moment>=${dateFilterDemands}&expand=store,agent,positions.assortment,retailShift`);
    console.log(`  ✅ Продаж: ${retailDemands.length}\n`);
  } catch (error) {
    console.log(`  ⚠️  Ошибка загрузки продаж: ${error.message}\n`);
  }

  if (DRY_RUN) {
    console.log('🧪 Тестовый прогон. Примеры данных:');
    console.log('\nПример смены:');
    if (retailShifts[0]) {
      console.log(`  Название: ${retailShifts[0].name}`);
      console.log(`  Склад: ${retailShifts[0].store?.name}`);
      console.log(`  Открыта: ${retailShifts[0].moment}`);
    }
    console.log('\nПример продажи:');
    if (retailDemands[0]) {
      console.log(`  Номер: ${retailDemands[0].name}`);
      console.log(`  Сумма: ${(retailDemands[0].sum || 0) / 100}₽`);
      console.log(`  Дата: ${retailDemands[0].moment}`);
    }
    console.log('\n═══════════════════════════════════════════');
    return;
  }

  // 5. Импортируем смены
  console.log('📦 Импортируем смены...');
  let shiftsCreated = 0;
  let shiftsUpdated = 0;
  let shiftsSkipped = 0;
  let shiftsErrors = 0;

  const existingShifts = await pb.collection('shifts').getFullList();
  const existingShiftMap = new Map(existingShifts.map(s => [s.moysklad_id, s]));

  for (const shift of retailShifts) {
    const moyskladId = shift.id;
    
    const storeName = shift.store?.name;
    const city = STORE_CITY_MAP[storeName];
    
    if (!city) {
      shiftsSkipped++;
      continue;
    }

    const supplierId = supplierMap.get(city);
    if (!supplierId) {
      shiftsSkipped++;
      continue;
    }

    // Находим первого пользователя этого города (можно улучшить логику)
    const cityUser = users.find(u => u.supplier === supplierId && u.role === 'worker');
    if (!cityUser) {
      shiftsSkipped++;
      continue;
    }

    try {
      const shiftData = {
        user: cityUser.id,
        city: city,
        start: shift.moment,
        end: shift.closeDate || null,
        status: shift.closeDate ? 'closed' : 'active',
        totalAmount: Math.round((shift.proceed || 0) / 100),
        // totalItems: 0, // Не обновляем, так как МС не дает инфо
        moysklad_id: moyskladId
      };

      if (existingShiftMap.has(moyskladId)) {
        const existingShift = existingShiftMap.get(moyskladId);
        // Обновляем если статус или даты изменились
        if (existingShift.status !== shiftData.status || existingShift.end !== shiftData.end || existingShift.totalAmount !== shiftData.totalAmount) {
           await pb.collection('shifts').update(existingShift.id, shiftData);
           shiftsUpdated++;
           if (shiftsUpdated % 10 === 0) console.log(`  🔄 Обновлено смен: ${shiftsUpdated}...`);
        } else {
           shiftsSkipped++;
        }
      } else {
        await pb.collection('shifts').create(shiftData);
        shiftsCreated++;
        if (shiftsCreated % 10 === 0) console.log(`  ✅ Создано смен: ${shiftsCreated}...`);
      }

    } catch (error) {
      shiftsErrors++;
      if (shiftsErrors <= 5) {
        console.error(`  ❌ Ошибка импорта смены: ${error.message}`);
      }
    }
  }

  console.log(`  ✅ Создано смен: ${shiftsCreated}`);
  console.log(`  🔄 Обновлено смен: ${shiftsUpdated}`);
  console.log(`  ⚠️  Пропущено (без изменений): ${shiftsSkipped}`);
  console.log(`  ❌ Ошибок: ${shiftsErrors}\n`);

  // 6. Импортируем продажи
  console.log('📦 Импортируем продажи...');
  let ordersCreated = 0;
  let ordersSkipped = 0;
  let ordersErrors = 0;
  const shiftSalesCounts = {}; // shift PB id → count of sales
  const shiftSalesData = {};   // shift PB id → array of sale summaries

  // Инициализируем shiftMap из существующих смен для корректной привязки продаж
  const allShifts = await pb.collection('shifts').getFullList();
  const shiftMap = {};
  allShifts.forEach(s => {
    if (s.moysklad_id) shiftMap[s.moysklad_id] = s.id;
  });

  const existingOrders = await pb.collection('orders').getFullList();
  // Map for fast access to existing orders
  const existingOrderMap = new Map(existingOrders.map(o => [o.moysklad_id, o]));

  for (const demand of retailDemands) {
    const moyskladId = demand.id;
    const retailShiftId = extractId(demand.retailShift);
    
    // Check if order exists
    const existingOrder = existingOrderMap.get(moyskladId);
    
    // If order exists, we still need to aggregate it into the shift stats
    if (existingOrder) {
      const pbShiftId = shiftMap[retailShiftId];
      if (pbShiftId) {
        shiftSalesCounts[pbShiftId] = (shiftSalesCounts[pbShiftId] || 0) + 1;
        if (!shiftSalesData[pbShiftId]) shiftSalesData[pbShiftId] = [];
        
        // Use data from existing PB order
        const total = existingOrder.total || 0;
        const items = existingOrder.items || [];
        // Determine payment method string for UI
        const pmStr = existingOrder.payment_method === '0' ? 'cash' : 'card';
        
        shiftSalesData[pbShiftId].push({
          total: total,
          items: items,
          created: existingOrder.created_date || existingOrder.created,
          payment_method: pmStr,
        });
      }
      
      // If order exists and has items, we can skip update/create
      if (existingOrder.items && existingOrder.items.length > 0) {
        ordersSkipped++;
        continue;
      }
      // If items missing, we proceed to update it (fall through to fetch logic)
    }

    const storeName = demand.store?.name;
    const city = STORE_CITY_MAP[storeName];
    
    if (!city) {
      ordersSkipped++;
      continue;
    }

    const supplierId = supplierMap.get(city);
    if (!supplierId) {
      ordersSkipped++;
      continue;
    }

    // Находим пользователя
    const cityUser = users.find(u => u.supplier === supplierId && u.role === 'worker');
    if (!cityUser) {
      ordersSkipped++;
      continue;
    }

    try {
      // Позиции уже загружены благодаря expand=positions.assortment
      const positions = demand.positions?.rows || [];

      // Формируем items для заказа
      const items = [];
      for (const pos of positions) {
        const productName = pos.assortment?.name;
        if (!productName) continue;

        const product = productMap.get(productName.toLowerCase().trim());
        if (!product) continue;

        items.push({
          product: product.id,
          quantity: pos.quantity || 1,
          price: Math.round((pos.price || 0) / 100)
        });
      }

      if (items.length === 0) {
        ordersSkipped++;
        continue;
      }

      // Определяем способ оплаты (по умолчанию наличные)
      // 0 - Наличные, 1 - Перевод (Карта), 2 - Предоплата
      let paymentMethod = '0'; // Default cash
      if (demand.paymentType === 'card') {
        paymentMethod = '1';
      } else if (demand.paymentType === 'cash') {
        paymentMethod = '0';
      }
      
      const { generateOrderNumber } = await import('./src/lib/orderNumbers.js');
      const orderNumber = await generateOrderNumber(city);

      const orderData = {
        user: cityUser.id,
        items: items,
        total: Math.round((demand.sum || 0) / 100),
        payment_method: paymentMethod,
        status: 'completed',
        created_date: demand.moment,
        moysklad_id: moyskladId,
        city: city,
        supplier: supplierId,
        order_number: orderNumber,
        city_code: orderNumber.split('-')[0] || orderNumber.charAt(0)
      };

      if (existingOrder) {
        // Если обновляем существующий заказ, сохраняем его ID но обновляем данные
        await pb.collection('orders').update(existingOrder.id, orderData);
        // Не увеличиваем ordersCreated, так как это обновление
        // Можно добавить счетчик ordersUpdated
      } else {
        await pb.collection('orders').create(orderData);
        ordersCreated++;
      }

      if (ordersCreated % 10 === 0) {
        console.log(`  ✅ Импортировано продаж: ${ordersCreated}...`);
      }
    } catch (error) {
      ordersErrors++;
      if (ordersErrors <= 10) {
        console.error(`  ❌ Ошибка импорта продажи: ${error.message}`);
        if (error.response?.data) {
          console.error('  🔍 Детали ошибки:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }
  }

  console.log(`  ✅ Создано продаж: ${ordersCreated}`);
  console.log(`  ⚠️  Пропущено: ${ordersSkipped}`);
  console.log(`  ❌ Ошибок: ${ordersErrors}\n`);

  // 10. Update shifts with totalItems and sales data
  if (!DRY_RUN) {
    console.log('\n📝 Обновление смен (totalItems, sales)...');
    let shiftsUpdated = 0;
    for (const [pbShiftId, count] of Object.entries(shiftSalesCounts)) {
      if (pbShiftId.startsWith('dry_')) continue;
      try {
        await pb.collection('shifts').update(pbShiftId, {
          totalItems: count,
          sales: shiftSalesData[pbShiftId] || [],
        });
        shiftsUpdated++;
      } catch (e) {
        console.error(`  ❌ Ошибка обновления смены ${pbShiftId}: ${e.message}`);
      }
    }
    console.log(`✅ Обновлено смен: ${shiftsUpdated}`);
  }

  // 7. Итоги
  console.log('═══════════════════════════════════════════');
  console.log('📊 РЕЗУЛЬТАТ:');
  console.log(`  ✅ Создано смен: ${shiftsCreated}`);
  console.log(`  ✅ Создано продаж: ${ordersCreated}`);
  console.log(`  ⚠️  Пропущено смен: ${shiftsSkipped}`);
  console.log(`  ⚠️  Пропущено продаж: ${ordersSkipped}`);
  console.log(`  ❌ Ошибок смен: ${shiftsErrors}`);
  console.log(`  ❌ Ошибок продаж: ${ordersErrors}`);
  console.log(`\n🌐 Проверьте: ${POCKETBASE_URL}/_/`);
  console.log('═══════════════════════════════════════════');
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error.message);
  console.error(error.stack);
  process.exit(1);
});
