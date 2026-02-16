import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const MOYSKLAD_LOGIN = process.env.MOYSKLAD_LOGIN || 'admin1@disester1';
const MOYSKLAD_PASSWORD = process.env.MOYSKLAD_PASSWORD || '323282zzzZ-';
const MOYSKLAD_API = 'https://api.moysklad.ru/api/remap/1.2';

const POCKETBASE_URL = 'http://146.103.121.96:8090';
const PB_ADMIN_EMAIL = 'admin@sklad.ru';
const PB_ADMIN_PASSWORD = '323282sssS';

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
  const limit = 100;

  while (true) {
    const url = `${MOYSKLAD_API}${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`МойСклад API ошибка ${res.status}: ${text.substring(0, 200)}`);
    }

    const data = await res.json();
    const rows = data.rows || [];
    allRows.push(...rows);

    if (allRows.length >= (data.meta?.size || 0) || rows.length === 0) break;
    offset += limit;
  }

  return allRows;
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

  // 3. Загружаем розничные смены из МойСклад (последние 90 дней)
  console.log('📡 Загружаем розничные смены из МойСклад (последние 90 дней)...');
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const dateFilterShifts = ninetyDaysAgo.toISOString().split('T')[0];
  
  let retailShifts = [];
  try {
    retailShifts = await fetchAll(`/entity/retailshift?filter=moment>=${dateFilterShifts}&expand=store,organization`);
    console.log(`  ✅ Смен: ${retailShifts.length}\n`);
  } catch (error) {
    console.log(`  ⚠️  Ошибка загрузки смен: ${error.message}\n`);
  }

  // 4. Загружаем розничные продажи из МойСклад (последние 90 дней)
  console.log('📡 Загружаем розничные продажи из МойСклад (последние 90 дней)...');
  const dateFilterDemands = ninetyDaysAgo.toISOString().split('T')[0];
  
  let retailDemands = [];
  try {
    retailDemands = await fetchAll(`/entity/retaildemand?filter=moment>=${dateFilterDemands}&expand=store,agent,positions,retailShift`);
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
  let shiftsSkipped = 0;
  let shiftsErrors = 0;

  const existingShifts = await pb.collection('shifts').getFullList();
  const existingShiftIds = new Set(existingShifts.map(s => s.moysklad_id).filter(Boolean));

  for (const shift of retailShifts) {
    const moyskladId = shift.id;
    
    // Пропускаем если уже импортирована
    if (existingShiftIds.has(moyskladId)) {
      shiftsSkipped++;
      continue;
    }

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
        totalItems: 0, // МойСклад не хранит количество товаров в смене
        moysklad_id: moyskladId
      };

      await pb.collection('shifts').create(shiftData);
      shiftsCreated++;

      if (shiftsCreated % 10 === 0) {
        console.log(`  ✅ Импортировано смен: ${shiftsCreated}...`);
      }
    } catch (error) {
      shiftsErrors++;
      if (shiftsErrors <= 5) {
        console.error(`  ❌ Ошибка импорта смены: ${error.message}`);
      }
    }
  }

  console.log(`  ✅ Создано смен: ${shiftsCreated}`);
  console.log(`  ⚠️  Пропущено: ${shiftsSkipped}`);
  console.log(`  ❌ Ошибок: ${shiftsErrors}\n`);

  // 6. Импортируем продажи
  console.log('📦 Импортируем продажи...');
  let ordersCreated = 0;
  let ordersSkipped = 0;
  let ordersErrors = 0;

  const existingOrders = await pb.collection('orders').getFullList();
  const existingOrderIds = new Set(existingOrders.map(o => o.moysklad_id).filter(Boolean));

  for (const demand of retailDemands) {
    const moyskladId = demand.id;
    
    // Пропускаем если уже импортирована
    if (existingOrderIds.has(moyskladId)) {
      ordersSkipped++;
      continue;
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
      // Загружаем позиции продажи
      let positions = [];
      if (demand.positions?.meta?.href) {
        const posRes = await fetch(demand.positions.meta.href, { headers: getMoySkladHeaders() });
        if (posRes.ok) {
          const posData = await posRes.json();
          positions = posData.rows || [];
        }
      }

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
      const paymentMethod = demand.paymentType === 'card' ? 'transfer' : 'cash';

      const orderData = {
        user: cityUser.id,
        items: items,
        total: Math.round((demand.sum || 0) / 100),
        payment_method: paymentMethod,
        status: 'completed',
        created_date: demand.moment,
        moysklad_id: moyskladId
      };

      await pb.collection('orders').create(orderData);
      ordersCreated++;

      if (ordersCreated % 10 === 0) {
        console.log(`  ✅ Импортировано продаж: ${ordersCreated}...`);
      }
    } catch (error) {
      ordersErrors++;
      if (ordersErrors <= 5) {
        console.error(`  ❌ Ошибка импорта продажи: ${error.message}`);
      }
    }
  }

  console.log(`  ✅ Создано продаж: ${ordersCreated}`);
  console.log(`  ⚠️  Пропущено: ${ordersSkipped}`);
  console.log(`  ❌ Ошибок: ${ordersErrors}\n`);

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
