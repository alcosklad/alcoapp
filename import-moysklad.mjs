import PocketBase from 'pocketbase';
import fs from 'fs';
import { config } from 'dotenv';

// Загружаем .env
config();

const MOYSKLAD_LOGIN = process.env.MOYSKLAD_LOGIN || 'admin1@disester1';
const MOYSKLAD_PASSWORD = process.env.MOYSKLAD_PASSWORD || '323282zzzZ-';
const MOYSKLAD_API = 'https://api.moysklad.ru/api/remap/1.2';

const POCKETBASE_URL = 'http://146.103.121.96:8090';
const PB_ADMIN_EMAIL = 'admin@sklad.ru';
const PB_ADMIN_PASSWORD = '323282sssS';

const DRY_RUN = process.argv.includes('--dry-run');

// Заголовки для МойСклад API
function getMoySkladHeaders() {
  const auth = Buffer.from(`${MOYSKLAD_LOGIN}:${MOYSKLAD_PASSWORD}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json;charset=utf-8',
    'Content-Type': 'application/json'
  };
}

// Запрос к МойСклад API с пагинацией
async function fetchAll(endpoint) {
  const headers = getMoySkladHeaders();
  let allRows = [];
  let offset = 0;
  const limit = 1000;

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

// Определяем категорию по первому слову названия
function getCategory(productName) {
  if (!productName) return 'Прочее';
  const firstWord = productName.trim().split(/\s+/)[0].toLowerCase();
  const categoryMap = {
    'вино': 'Вино', 'водка': 'Водка', 'виски': 'Виски', 'коньяк': 'Коньяк',
    'ром': 'Ром', 'текила': 'Текила', 'джин': 'Джин', 'ликер': 'Ликер',
    'ликёр': 'Ликер', 'брют': 'Брют', 'асти': 'Асти', 'просекко': 'Просекко',
    'шампанское': 'Шампанское', 'пиво': 'Пиво', 'напиток': 'Напитки',
    'настойка': 'Настойки', 'бурбон': 'Виски', 'абсент': 'Настойки',
    'бренди': 'Коньяк', 'кальвадос': 'Коньяк', 'граппа': 'Коньяк'
  };
  return categoryMap[firstWord] || 'Прочее';
}

// Маппинг: название склада в МойСклад → название города в PocketBase (suppliers)
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
  console.log('  📦 Импорт остатков из МойСклад');
  console.log('═══════════════════════════════════════════');
  if (DRY_RUN) console.log('🧪 ТЕСТОВЫЙ ПРОГОН — записи в БД не будет\n');

  // 1. Получаем данные из МойСклад
  console.log('📡 Загружаем данные из МойСклад...');

  console.log('  Загружаем остатки...');
  const stockAll = await fetchAll('/report/stock/all');
  console.log(`  ✅ Остатки: ${stockAll.length} позиций`);

  console.log('  Загружаем остатки по складам...');
  const stockByStore = await fetchAll('/report/stock/bystore');
  console.log(`  ✅ По складам: ${stockByStore.length} позиций`);

  // Строим карту product href → данные товара
  const productMap = new Map();
  for (const item of stockAll) {
    const href = item.meta?.href;
    if (href && item.stock > 0) {
      productMap.set(href, {
        name: item.name,
        totalStock: item.stock,
        buyPrice: Math.round((item.price || 0) / 100),
        salePrice: Math.round((item.salePrice || 0) / 100),
        code: item.code || ''
      });
    }
  }
  console.log(`  ✅ Товаров с остатком > 0: ${productMap.size}\n`);

  // 2. Собираем остатки по складам (товар → склад → кол-во)
  const stockEntries = []; // { name, storeName, city, quantity, buyPrice, salePrice }

  for (const item of stockByStore) {
    const href = item.meta?.href;
    const productInfo = productMap.get(href);
    if (!productInfo) continue;

    for (const store of (item.stockByStore || [])) {
      if (store.stock <= 0) continue;

      const storeName = store.name;
      const city = STORE_CITY_MAP[storeName];
      if (!city) {
        console.log(`  ⚠️  Неизвестный склад: "${storeName}", пропускаем`);
        continue;
      }

      stockEntries.push({
        name: productInfo.name,
        storeName,
        city,
        quantity: store.stock,
        buyPrice: productInfo.buyPrice,
        salePrice: productInfo.salePrice,
        code: productInfo.code
      });
    }
  }

  console.log(`📊 Собрано ${stockEntries.length} записей (товар × склад)`);

  // Выводим статистику по городам
  const cityStats = {};
  for (const entry of stockEntries) {
    if (!cityStats[entry.city]) cityStats[entry.city] = { count: 0, totalQty: 0 };
    cityStats[entry.city].count++;
    cityStats[entry.city].totalQty += entry.quantity;
  }
  console.log('\n📊 Остатки по городам:');
  for (const [city, stats] of Object.entries(cityStats).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${city}: ${stats.count} позиций, ${stats.totalQty} шт`);
  }

  if (DRY_RUN) {
    console.log('\n🧪 Тестовый прогон завершён. Примеры записей:');
    stockEntries.slice(0, 5).forEach(e => {
      console.log(`  "${e.name}" → ${e.city}: ${e.quantity} шт, закуп ${e.buyPrice}₽, продажа ${e.salePrice}₽`);
    });
    console.log('\n═══════════════════════════════════════════');
    return;
  }

  // 3. Подключаемся к PocketBase
  console.log('\n🔐 Подключаемся к PocketBase...');
  const pb = new PocketBase(POCKETBASE_URL);
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('  ✅ Авторизация успешна');
  } catch (error) {
    console.error('  ❌ Ошибка авторизации PocketBase:', error.message);
    process.exit(1);
  }

  // 4. Получаем suppliers (города) из PocketBase
  console.log('\n📋 Загружаем города (suppliers) из PocketBase...');
  const suppliers = await pb.collection('suppliers').getFullList();
  const supplierMap = new Map(); // city name → supplier id
  for (const s of suppliers) {
    supplierMap.set(s.name, s.id);
  }
  console.log(`  ✅ Городов: ${suppliers.length}`);

  // 5. Получаем products из PocketBase
  console.log('📋 Загружаем товары из PocketBase...');
  const pbProducts = await pb.collection('products').getFullList();
  const pbProductMap = new Map(); // name (lowercase) → product
  for (const p of pbProducts) {
    pbProductMap.set((p.name || '').toLowerCase().trim(), p);
  }
  console.log(`  ✅ Товаров: ${pbProducts.length}`);

  // 6. Получаем существующие stocks из PocketBase
  console.log('📋 Загружаем текущие остатки из PocketBase...');
  let existingStocks = [];
  try {
    existingStocks = await pb.collection('stocks').getFullList();
  } catch (e) {
    console.log('  ⚠️  Коллекция stocks пока пуста или не существует');
  }
  console.log(`  ✅ Текущих остатков: ${existingStocks.length}`);

  // Строим карту существующих остатков: product_id + supplier_id → stock record
  const existingStockMap = new Map();
  for (const s of existingStocks) {
    const key = `${s.product}_${s.supplier}`;
    existingStockMap.set(key, s);
  }

  // 7. Импортируем остатки
  console.log('\n📦 Импортируем остатки...');
  let created = 0;
  let updated = 0;
  let createdProducts = 0;
  let skippedNoProduct = 0;
  let skippedNoSupplier = 0;
  let errors = 0;

  for (let i = 0; i < stockEntries.length; i++) {
    const entry = stockEntries[i];

    // Находим supplier (город) в PocketBase
    const supplierId = supplierMap.get(entry.city);
    if (!supplierId) {
      skippedNoSupplier++;
      if (skippedNoSupplier <= 3) {
        console.log(`  ⚠️  Город "${entry.city}" не найден в PocketBase`);
      }
      continue;
    }

    // Находим товар в PocketBase по имени
    const productKey = entry.name.toLowerCase().trim();
    let product = pbProductMap.get(productKey);

    // Если не нашли — создаём новый товар в PocketBase
    if (!product) {
      try {
        const category = getCategory(entry.name);
        product = await pb.collection('products').create({
          name: entry.name,
          price: entry.salePrice,
          cost: entry.buyPrice,
          category: category
        });
        pbProductMap.set(productKey, product);
        createdProducts++;
        if (createdProducts <= 5) {
          console.log(`  ➕ Создан товар: "${entry.name}" (закуп ${entry.buyPrice}₽, продажа ${entry.salePrice}₽)`);
        }
      } catch (e) {
        skippedNoProduct++;
        if (skippedNoProduct <= 5) {
          console.log(`  ⚠️  Не удалось создать товар: "${entry.name}" - ${e.message}`);
        }
        continue;
      }
    }

    // Проверяем, есть ли уже такой остаток
    const stockKey = `${product.id}_${supplierId}`;
    const existing = existingStockMap.get(stockKey);

    try {
      if (existing) {
        // Обновляем количество
        await pb.collection('stocks').update(existing.id, {
          quantity: entry.quantity
        });
        updated++;
      } else {
        // Создаём новый остаток
        await pb.collection('stocks').create({
          product: product.id,
          supplier: supplierId,
          quantity: entry.quantity
        });
        created++;
      }

      if ((created + updated) % 20 === 0) {
        console.log(`  ✅ Обработано ${created + updated} из ${stockEntries.length}...`);
      }
    } catch (error) {
      errors++;
      if (errors <= 5) {
        console.error(`  ❌ Ошибка для "${entry.name}" (${entry.city}): ${error.message}`);
      }
    }
  }

  // 8. Обновляем цены (cost) у товаров из МойСклад
  console.log('\n💰 Обновляем цены закупа из МойСклад...');
  let pricesUpdated = 0;
  for (const [href, info] of productMap) {
    const productKey = info.name.toLowerCase().trim();
    const product = pbProductMap.get(productKey);
    if (product && info.buyPrice > 0 && product.cost !== info.buyPrice) {
      try {
        await pb.collection('products').update(product.id, {
          cost: info.buyPrice
        });
        pricesUpdated++;
      } catch (e) {
        // Тихо пропускаем ошибки обновления цен
      }
    }
  }
  console.log(`  ✅ Обновлено цен: ${pricesUpdated}`);

  // 9. Итоги
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 РЕЗУЛЬТАТ:');
  console.log(`  ✅ Создано новых остатков: ${created}`);
  console.log(`  🔄 Обновлено остатков: ${updated}`);
  console.log(`  💰 Обновлено цен закупа: ${pricesUpdated}`);
  console.log(`  ➕ Создано новых товаров: ${createdProducts}`);
  console.log(`  ⚠️  Ошибки создания товаров: ${skippedNoProduct}`);
  console.log(`  ⚠️  Город не найден в PB: ${skippedNoSupplier}`);
  console.log(`  ❌ Ошибок: ${errors}`);
  console.log(`\n🌐 Проверьте: ${POCKETBASE_URL}/_/`);
  console.log('═══════════════════════════════════════════');
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error.message);
  process.exit(1);
});
