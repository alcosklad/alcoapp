import PocketBase from 'pocketbase';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const SERVER_URL = 'http://146.103.121.96:8090';
const ADMIN_EMAIL = 'admin@sklad.ru';
const ADMIN_PASSWORD = '326052sssS';

// Режим работы из аргументов командной строки
const args = process.argv.slice(2);
const MODE_FULL_IMPORT = args.includes('--full-import');
const DRY_RUN = args.includes('--dry-run');

// Маппинг городов (код файла → название)
const cityMapping = {
  '59': 'Пермь',
  'ekb': 'Екатеринбург',
  'irk': 'Иркутск',
  'kazan': 'Казань',
  'kld': 'Калининград',
  'krasno9rsk': 'Красноярск',
  'krasnodar': 'Краснодар',
  'msk': 'Москва',
  'mur': 'Мурманск',
  'nn': 'Нижний Новгород',
  'nsk': 'Новосибирск',
  'omsk': 'Омск',
  'samara': 'Самара',
  'saratov': 'Саратов',
  'sochi': 'Сочи',
  'spb': 'Санкт-Петербург',
  'surgut': 'Сургут',
  'ufa': 'Уфа',
  'vlg': 'Волгоград',
  'vrn': 'Воронеж'
};

// Определяем категорию по первому слову названия
function getCategory(productName) {
  if (!productName) return 'Прочее';
  
  const firstWord = productName.trim().split(/\s+/)[0].toLowerCase();
  
  const categoryMap = {
    'вино': 'Вино',
    'водка': 'Водка',
    'виски': 'Виски',
    'коньяк': 'Коньяк',
    'ром': 'Ром',
    'текила': 'Текила',
    'джин': 'Джин',
    'ликер': 'Ликер',
    'ликёр': 'Ликер',
    'брют': 'Брют',
    'асти': 'Асти',
    'просекко': 'Просекко',
    'шампанское': 'Шампанское',
    'пиво': 'Пиво',
    'напиток': 'Напитки',
    'сигареты': 'Сигареты и Стики',
    'стики': 'Сигареты и Стики',
    'электронка': 'Электронки',
    'снэк': 'Снэки и Закуски',
    'шоколад': 'Шоколад',
    'настойка': 'Настойки',
    'бурбон': 'Виски',
    'абсент': 'Настойки'
  };
  
  return categoryMap[firstWord] || 'Прочее';
}

// Парсим один CSV файл
function parseCSV(filePath, cityCode) {
  const cityName = cityMapping[cityCode];
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true
    });
    
    const products = [];
    
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      if (!row[0]) continue;
      
      const name = row[0]?.trim();
      
      // Пропускаем заголовки (капсом) и строки без цен
      if (!name || 
          name === cityName || 
          name.toUpperCase() === name ||
          !row[1] ||
          !row[3]) {
        continue;
      }
      
      const priceStr = row[1]?.toString().replace(/\s/g, '').replace(',', '.');
      const costStr = row[3]?.toString().replace(/\s/g, '').replace(',', '.');
      
      const price = parseFloat(priceStr);
      const cost = parseFloat(costStr);
      
      if (isNaN(price) || isNaN(cost) || price <= 0 || cost <= 0) {
        continue;
      }
      
      products.push({
        name,
        price,
        cost,
        category: getCategory(name),
        city: cityName
      });
    }
    
    return products;
  } catch (error) {
    console.error(`❌ Ошибка чтения ${filePath}: ${error.message}`);
    return [];
  }
}

// Собираем уникальные товары из всех CSV
function collectUniqueProducts(allProducts) {
  const productMap = new Map();
  
  for (const product of allProducts) {
    const key = product.name.toLowerCase().trim();
    
    if (productMap.has(key)) {
      const existing = productMap.get(key);
      if (!existing.cities.includes(product.city)) {
        existing.cities.push(product.city);
      }
      // Обновляем цены (берём последнее значение)
      existing.price = product.price;
      existing.cost = product.cost;
    } else {
      productMap.set(key, {
        name: product.name,
        price: product.price,
        cost: product.cost,
        category: product.category,
        cities: [product.city]
      });
    }
  }
  
  return productMap;
}

// Читаем все CSV файлы
function readAllCSV() {
  const allProducts = [];
  let filesFound = 0;
  
  console.log('📄 Читаем CSV файлы...');
  
  for (const [cityCode, cityName] of Object.entries(cityMapping)) {
    const filePath = `./price_${cityCode}.csv`;
    
    if (fs.existsSync(filePath)) {
      const products = parseCSV(filePath, cityCode);
      allProducts.push(...products);
      filesFound++;
      console.log(`  ✅ ${cityName}: ${products.length} товаров`);
    } else {
      console.log(`  ⚠️  ${filePath} не найден, пропускаем`);
    }
  }
  
  console.log(`\n📊 Прочитано ${filesFound} файлов, ${allProducts.length} записей`);
  return allProducts;
}

// === РЕЖИМ 1: Обновление только cost у существующих товаров ===
async function updateCostOnly(pb, productMap) {
  console.log('\n🔄 Режим: ОБНОВЛЕНИЕ цен закупа (cost)');
  if (DRY_RUN) console.log('🧪 ТЕСТОВЫЙ ПРОГОН — записи в БД не будет\n');
  
  // Получаем все товары из БД
  console.log('📦 Загружаем товары из базы...');
  const serverProducts = await pb.collection('products').getFullList();
  console.log(`   Найдено ${serverProducts.length} товаров в базе\n`);
  
  let updated = 0;
  let notFound = 0;
  let unchanged = 0;
  let errors = 0;
  
  for (const serverProduct of serverProducts) {
    const key = serverProduct.name?.toLowerCase().trim();
    if (!key) continue;
    
    const csvData = productMap.get(key);
    
    if (csvData) {
      const newCost = csvData.cost;
      const oldCost = serverProduct.cost || 0;
      
      if (Math.abs(newCost - oldCost) < 0.01) {
        unchanged++;
        continue;
      }
      
      if (DRY_RUN) {
        console.log(`  🔍 "${serverProduct.name}": cost ${oldCost} → ${newCost}`);
        updated++;
      } else {
        try {
          await pb.collection('products').update(serverProduct.id, {
            cost: newCost
          });
          updated++;
          
          if (updated % 50 === 0) {
            console.log(`  ✅ Обновлено ${updated}...`);
          }
        } catch (error) {
          errors++;
          console.error(`  ❌ Ошибка "${serverProduct.name}": ${error.message}`);
        }
      }
    } else {
      notFound++;
    }
  }
  
  console.log('\n📊 Результат:');
  console.log(`  ✅ Обновлено: ${updated}`);
  console.log(`  ⏭️  Без изменений: ${unchanged}`);
  console.log(`  ⚠️  Не найдено в CSV: ${notFound}`);
  console.log(`  ❌ Ошибок: ${errors}`);
}

// === РЕЖИМ 2: Полный реимпорт (удалить всё + загрузить заново) ===
async function fullImport(pb, productMap) {
  console.log('\n🔄 Режим: ПОЛНЫЙ РЕИМПОРТ');
  if (DRY_RUN) {
    console.log('🧪 ТЕСТОВЫЙ ПРОГОН — записи в БД не будет\n');
    console.log(`  Было бы создано ${productMap.size} товаров`);
    return;
  }
  
  // Удаляем старые товары
  console.log('🗑️  Удаляем старые товары...');
  try {
    const oldProducts = await pb.collection('products').getFullList();
    console.log(`   Найдено ${oldProducts.length} товаров для удаления`);
    
    const chunks = [];
    for (let i = 0; i < oldProducts.length; i += 100) {
      chunks.push(oldProducts.slice(i, i + 100));
    }
    
    for (const chunk of chunks) {
      await Promise.all(chunk.map(p => pb.collection('products').delete(p.id)));
    }
    console.log('   ✅ Удалено');
  } catch (error) {
    console.error('   ❌ Ошибка удаления:', error.message);
  }
  
  // Загружаем новые товары
  console.log('\n📦 Загружаем товары...');
  const uniqueProducts = Array.from(productMap.values());
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < uniqueProducts.length; i++) {
    const product = uniqueProducts[i];
    
    try {
      await pb.collection('products').create({
        name: product.name,
        price: product.price,
        cost: product.cost,
        category: product.category,
        cities: product.cities
      });
      
      successCount++;
      
      if ((i + 1) % 50 === 0) {
        console.log(`   ✅ Загружено ${i + 1} из ${uniqueProducts.length}...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`   ❌ "${product.name}": ${error.message}`);
    }
  }
  
  console.log('\n📊 Результат:');
  console.log(`  ✅ Загружено: ${successCount}`);
  console.log(`  ❌ Ошибок: ${errorCount}`);
}

// === MAIN ===
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  📋 Обновление цен из CSV файлов');
  console.log('═══════════════════════════════════════════');
  console.log(`📡 Сервер: ${SERVER_URL}`);
  console.log(`🔧 Режим: ${MODE_FULL_IMPORT ? 'ПОЛНЫЙ РЕИМПОРТ' : 'ОБНОВЛЕНИЕ COST'}`);
  if (DRY_RUN) console.log('🧪 Тестовый прогон (--dry-run)');
  console.log('');
  
  // 1. Читаем CSV
  const allProducts = readAllCSV();
  if (allProducts.length === 0) {
    console.error('\n❌ Не найдено ни одного товара в CSV файлах!');
    process.exit(1);
  }
  
  // 2. Собираем уникальные
  const productMap = collectUniqueProducts(allProducts);
  console.log(`✨ Уникальных товаров: ${productMap.size}\n`);
  
  // 3. Подключаемся к PocketBase
  console.log('🔐 Подключаемся к серверу...');
  const pb = new PocketBase(SERVER_URL);
  
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('   ✅ Авторизация успешна\n');
  } catch (error) {
    console.error('   ❌ Ошибка авторизации:', error.message);
    process.exit(1);
  }
  
  // 4. Выполняем нужный режим
  if (MODE_FULL_IMPORT) {
    await fullImport(pb, productMap);
  } else {
    await updateCostOnly(pb, productMap);
  }
  
  console.log(`\n🌐 Проверьте в админке: ${SERVER_URL}/_/`);
  console.log('═══════════════════════════════════════════');
}

main().catch(error => {
  console.error('❌ Критическая ошибка:', error.message);
  process.exit(1);
});
