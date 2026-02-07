import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

// === CONFIG ===
const MOYSKLAD_LOGIN = process.env.MOYSKLAD_LOGIN || 'admin1@disester1';
const MOYSKLAD_PASSWORD = process.env.MOYSKLAD_PASSWORD || '323282zzzZ-';
const MOYSKLAD_API = 'https://api.moysklad.ru/api/remap/1.2';

const POCKETBASE_URL = 'http://146.103.121.96:8090';
const PB_ADMIN_EMAIL = 'admin@sklad.ru';
const PB_ADMIN_PASSWORD = '326052sssS';

const DRY_RUN = process.argv.includes('--dry-run');
const YEAR_FILTER = '2026-01-01 00:00:00';

// === МойСклад employee → PocketBase user маппинг ===
// МС employees named by city → PB users named by city
const EMPLOYEE_TO_PB_USER = {
  // MS employee name → PB user name
  'Самара': 'Самара',
  'НН': 'НН',
  'Пермь': 'Пермь',
  'Иркутск': 'Иркутск',
  'Омск': 'Омск',
  'клд': 'КЛД',
  'красноярск': 'Красноярск',
  'Красноярск утро': 'Красноярск',
  'Волгоград': 'Волгоград',
  'Сочи': 'Сочи',
  'Сургут': 'Сургут',
  'Уфа': 'Уфа',
  'Саратов': 'Саратов',
  'Новосибирск': 'НСК',
  'Казань': 'Казань',
  'Аня': null,         // оператор, не курьер
  'Александр': null,    // оператор
  'Владимир': null,     // владелец
};

// MS store name → city name for display
const STORE_TO_CITY = {
  'Самара': 'Самара',
  'Нижний Новгород': 'НН',
  'СПБ Заставская 46к2 П1': 'СПБ',
  'Калининград': 'КЛД',
  'Красноярск': 'Красноярск',
  'Красноярск УТРО': 'Красноярск',
  'Новосибирск': 'НСК',
  'Омск': 'Омск',
  'Иркутск': 'Иркутск',
  'Уфа': 'Уфа',
  'Пермь': 'Пермь',
  'Сургут': 'Сургут',
  'Казань': 'Казань',
  'Сочи': 'Сочи',
  'Волгоград': 'Волгоград',
  'Воронеж': 'Воронеж',
  'Саратов': 'Саратов',
};

// === HELPERS ===
function getMoySkladHeaders() {
  const auth = Buffer.from(`${MOYSKLAD_LOGIN}:${MOYSKLAD_PASSWORD}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json;charset=utf-8',
    'Content-Type': 'application/json'
  };
}

async function fetchAllPaginated(endpoint, filter = '', order = '') {
  const headers = getMoySkladHeaders();
  const allRows = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    let url = `${MOYSKLAD_API}${endpoint}?limit=${limit}&offset=${offset}`;
    if (filter) url += `&filter=${encodeURIComponent(filter)}`;
    if (order) url += `&order=${encodeURIComponent(order)}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`❌ API error ${res.status}: ${await res.text()}`);
      break;
    }
    const data = await res.json();
    const rows = data.rows || [];
    allRows.push(...rows);

    console.log(`  📦 Loaded ${allRows.length} / ${data.meta?.size || '?'}`);

    if (allRows.length >= (data.meta?.size || 0)) break;
    offset += limit;
  }
  return allRows;
}

async function fetchJson(url) {
  const headers = getMoySkladHeaders();
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// Extract UUID from href like ".../entity/employee/UUID"
function extractId(meta) {
  if (!meta?.meta?.href) return null;
  const parts = meta.meta.href.split('/');
  return parts[parts.length - 1];
}

// === MAIN ===
async function main() {
  console.log('🚀 Импорт продаж из МойСклад → PocketBase');
  console.log(`📋 Режим: ${DRY_RUN ? 'DRY RUN (без записи)' : 'РЕАЛЬНЫЙ ИМПОРТ'}`);
  console.log(`📅 Фильтр: moment >= ${YEAR_FILTER}\n`);

  // 1. Connect to PocketBase
  const pb = new PocketBase(POCKETBASE_URL);
  await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  console.log('✅ PocketBase: подключен\n');

  // 2. Load PB users (workers) for mapping
  const pbUsers = await pb.collection('users').getFullList({ sort: 'name' });
  const pbUserMap = {}; // name → user record
  pbUsers.forEach(u => { pbUserMap[u.name] = u; });
  console.log(`👥 PB Users: ${pbUsers.length}`);

  // 3. Load MS employees & stores for name resolution
  console.log('\n📡 Загрузка справочников МойСклад...');
  const [employeesData, storesData] = await Promise.all([
    fetchJson(`${MOYSKLAD_API}/entity/employee?limit=100`),
    fetchJson(`${MOYSKLAD_API}/entity/store?limit=100`),
  ]);

  const msEmployees = {}; // id → name
  (employeesData.rows || []).forEach(e => { msEmployees[e.id] = e.name; });

  const msStores = {}; // id → name
  (storesData.rows || []).forEach(s => { msStores[s.id] = s.name; });

  console.log(`  Сотрудники МС: ${Object.keys(msEmployees).length}`);
  console.log(`  Склады МС: ${Object.keys(msStores).length}`);

  // 4. Load retail shifts from МС
  console.log('\n📦 Загрузка розничных смен (retailshift)...');
  const msShifts = await fetchAllPaginated('/entity/retailshift', `moment>=${YEAR_FILTER}`, 'moment,asc');
  console.log(`✅ Загружено смен: ${msShifts.length}`);

  // 5. Load retail demands from МС
  console.log('\n📦 Загрузка розничных продаж (retaildemand)...');
  const msDemands = await fetchAllPaginated('/entity/retaildemand', `moment>=${YEAR_FILTER}`, 'moment,asc');
  console.log(`✅ Загружено продаж: ${msDemands.length}`);

  // 6. Load MS products for name resolution (for positions)
  console.log('\n📦 Загрузка товаров МС для названий...');
  const msProductsData = await fetchAllPaginated('/entity/product', '', '');
  const msProducts = {}; // id → { name, ... }
  msProductsData.forEach(p => { msProducts[p.id] = { name: p.name, article: p.article }; });
  console.log(`✅ Товаров МС: ${Object.keys(msProducts).length}`);

  // 7. Clear old data in PocketBase
  if (!DRY_RUN) {
    console.log('\n🗑️  Очистка старых данных...');

    // Clear orders
    try {
      const oldOrders = await pb.collection('orders').getFullList();
      for (const o of oldOrders) {
        await pb.collection('orders').delete(o.id);
      }
      console.log(`  Удалено orders: ${oldOrders.length}`);
    } catch (e) {
      console.log('  orders: коллекция пуста или не существует');
    }

    // Clear shifts
    try {
      const oldShifts = await pb.collection('shifts').getFullList();
      for (const s of oldShifts) {
        await pb.collection('shifts').delete(s.id);
      }
      console.log(`  Удалено shifts: ${oldShifts.length}`);
    } catch (e) {
      console.log('  shifts: коллекция пуста или не существует');
    }
  }

  // 8. Process shifts
  console.log('\n📝 Обработка смен...');
  const shiftMap = {}; // ms shift id → PB shift id
  let shiftsCreated = 0;
  let shiftsSkipped = 0;

  for (const shift of msShifts) {
    const ownerId = extractId(shift.owner);
    const storeId = extractId(shift.store);

    const employeeName = msEmployees[ownerId] || 'Unknown';
    const storeName = msStores[storeId] || 'Unknown';
    const cityName = STORE_TO_CITY[storeName] || storeName;

    // Map to PB user
    const pbUserName = EMPLOYEE_TO_PB_USER[employeeName];
    if (pbUserName === null || pbUserName === undefined) {
      // Unknown employee or operator — try to match by city from store
      const cityUser = pbUserMap[cityName];
      if (!cityUser) {
        shiftsSkipped++;
        continue;
      }
    }
    const targetPbName = pbUserName || cityName;
    const pbUser = pbUserMap[targetPbName];
    if (!pbUser) {
      console.warn(`  ⚠️  Нет PB user для: ${employeeName} → ${targetPbName}`);
      shiftsSkipped++;
      continue;
    }

    // Calculate totals from shift data
    const totalCash = (shift.receivedCash || 0) / 100;
    const totalNoCash = (shift.receivedNoCash || 0) / 100;
    const totalAmount = totalCash + totalNoCash;

    const shiftData = {
      user: pbUser.id,
      start: shift.moment,
      end: shift.closeDate || shift.moment,
      status: shift.closeDate ? 'closed' : 'active',
      totalAmount: totalAmount,
      totalItems: 0, // will be updated after processing demands
      sales: [],     // will be filled with demand references
      ms_id: shift.id,
      city: cityName,
    };

    if (DRY_RUN) {
      console.log(`  [DRY] Смена: ${employeeName} (${cityName}) ${shift.moment} — ${totalAmount.toLocaleString('ru-RU')} ₽`);
      shiftMap[shift.id] = `dry_${shift.id}`;
      shiftsCreated++;
    } else {
      try {
        const record = await pb.collection('shifts').create(shiftData);
        shiftMap[shift.id] = record.id;
        shiftsCreated++;
      } catch (e) {
        console.error(`  ❌ Ошибка создания смены: ${e.message}`);
        shiftsSkipped++;
      }
    }
  }

  console.log(`✅ Смены: создано ${shiftsCreated}, пропущено ${shiftsSkipped}`);

  // 9. Process demands (sales) — load positions for each
  console.log('\n📝 Обработка продаж...');
  let salesCreated = 0;
  let salesSkipped = 0;
  const shiftSalesCounts = {}; // shift PB id → count of sales
  const shiftSalesData = {};   // shift PB id → array of sale summaries

  // Batch demands by shift for efficiency
  for (let i = 0; i < msDemands.length; i++) {
    const demand = msDemands[i];

    if (i % 50 === 0 && i > 0) {
      console.log(`  Обработано ${i} / ${msDemands.length}...`);
    }

    const ownerId = extractId(demand.owner);
    const storeId = extractId(demand.store);
    const retailShiftId = extractId(demand.retailShift);

    const employeeName = msEmployees[ownerId] || 'Unknown';
    const storeName = msStores[storeId] || 'Unknown';
    const cityName = STORE_TO_CITY[storeName] || storeName;

    // Map to PB user
    let targetPbName = EMPLOYEE_TO_PB_USER[employeeName];
    if (targetPbName === null || targetPbName === undefined) {
      targetPbName = cityName;
    }
    const pbUser = pbUserMap[targetPbName];
    if (!pbUser) {
      salesSkipped++;
      continue;
    }

    // Load positions (items in the receipt)
    let items = [];
    try {
      const positionsUrl = demand.positions?.meta?.href;
      if (positionsUrl) {
        const posData = await fetchJson(positionsUrl);
        items = (posData.rows || []).map(pos => {
          const assortmentId = extractId(pos.assortment);
          const productInfo = msProducts[assortmentId] || {};
          return {
            name: productInfo.name || 'Неизвестный товар',
            article: productInfo.article || '',
            quantity: pos.quantity || 1,
            price: (pos.price || 0) / 100,
            discount: pos.discount || 0,
            total: ((pos.price || 0) * (pos.quantity || 1) * (1 - (pos.discount || 0) / 100)) / 100,
          };
        });
      }
    } catch (e) {
      // Positions load failed, continue without items
    }

    const total = (demand.sum || 0) / 100;
    const cashSum = (demand.cashSum || 0) / 100;
    const noCashSum = (demand.noCashSum || 0) / 100;

    // Determine payment method
    let paymentMethod = '0'; // cash
    if (noCashSum > 0 && cashSum === 0) {
      paymentMethod = '1'; // card/transfer
    }

    const orderData = {
      user: pbUser.id,
      items: items,
      subtotal: total,
      discount: 0,
      discount_type: '',
      discount_value: '',
      total: total,
      payment_method: paymentMethod,
      local_time: demand.moment,
      created_date: demand.moment,
      ms_id: demand.id,
      city: cityName,
    };

    // Track for shift updates
    const pbShiftId = shiftMap[retailShiftId];
    if (pbShiftId) {
      shiftSalesCounts[pbShiftId] = (shiftSalesCounts[pbShiftId] || 0) + 1;
      if (!shiftSalesData[pbShiftId]) shiftSalesData[pbShiftId] = [];
      shiftSalesData[pbShiftId].push({
        total: total,
        items: items.length,
        created: demand.moment,
        payment_method: paymentMethod === '0' ? 'cash' : 'card',
      });
    }

    if (DRY_RUN) {
      if (i < 5) {
        console.log(`  [DRY] Продажа: ${cityName} ${demand.moment} — ${total.toLocaleString('ru-RU')} ₽ (${items.length} товаров)`);
      }
      salesCreated++;
    } else {
      try {
        await pb.collection('orders').create(orderData);
        salesCreated++;
      } catch (e) {
        console.error(`  ❌ Ошибка создания продажи: ${e.message}`);
        salesSkipped++;
      }
    }
  }

  console.log(`✅ Продажи: создано ${salesCreated}, пропущено ${salesSkipped}`);

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

  // 11. Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГО:');
  console.log(`  Смены: ${shiftsCreated} создано, ${shiftsSkipped} пропущено`);
  console.log(`  Продажи: ${salesCreated} создано, ${salesSkipped} пропущено`);
  if (DRY_RUN) {
    console.log('\n💡 Это был DRY RUN. Для реального импорта запустите без --dry-run');
  }
  console.log('='.repeat(50));
}

main().catch(e => {
  console.error('💥 Fatal error:', e);
  process.exit(1);
});
