import PocketBase from 'pocketbase';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const SERVER_URL = 'http://146.103.121.96:8090';
const ADMIN_EMAIL = 'admin@sklad.ru';
const ADMIN_PASSWORD = '326052sssS';

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

function parseCSV(filePath, cityCode) {
  const cityName = cityMapping[cityCode];
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true
    });
    
    const productNames = [];
    
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      
      if (!row[0]) continue;
      
      const name = row[0]?.trim();
      
      // Пропускаем заголовки
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
      
      productNames.push(name);
    }
    
    return productNames;
  } catch (error) {
    console.error(`Ошибка парсинга ${filePath}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Обновляем города для товаров на сервере');
  console.log(`📡 Сервер: ${SERVER_URL}\n`);
  
  // Собираем карту: название товара -> список городов
  const productCitiesMap = new Map();
  
  console.log('📄 Читаем CSV файлы...');
  for (const [cityCode, cityName] of Object.entries(cityMapping)) {
    const filePath = `./price_${cityCode}.csv`;
    
    if (fs.existsSync(filePath)) {
      const productNames = parseCSV(filePath, cityCode);
      
      for (const name of productNames) {
        const key = name.toLowerCase().trim();
        
        if (!productCitiesMap.has(key)) {
          productCitiesMap.set(key, {
            originalName: name,
            cities: []
          });
        }
        
        const product = productCitiesMap.get(key);
        if (!product.cities.includes(cityName)) {
          product.cities.push(cityName);
        }
      }
    }
  }
  
  console.log(`✅ Собрано ${productCitiesMap.size} уникальных товаров с городами\n`);
  
  // Подключаемся к серверу
  console.log('🔐 Подключаемся к серверу...');
  const pb = new PocketBase(SERVER_URL);
  
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Авторизация успешна\n');
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error.message);
    process.exit(1);
  }
  
  // Получаем все товары с сервера
  console.log('📦 Загружаем товары с сервера...');
  let serverProducts;
  try {
    serverProducts = await pb.collection('products').getFullList();
    console.log(`✅ Загружено ${serverProducts.length} товаров с сервера\n`);
  } catch (error) {
    console.error('❌ Ошибка загрузки товаров:', error.message);
    process.exit(1);
  }
  
  // Обновляем города для каждого товара
  console.log('🔄 Обновляем города для товаров...');
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  for (const serverProduct of serverProducts) {
    const key = serverProduct.name?.toLowerCase().trim();
    
    if (!key) {
      console.log(`⚠️  Товар без имени: ${serverProduct.id}`);
      continue;
    }
    
    const productData = productCitiesMap.get(key);
    
    if (productData && productData.cities.length > 0) {
      try {
        await pb.collection('products').update(serverProduct.id, {
          cities: productData.cities
        });
        
        updated++;
        
        if (updated % 50 === 0) {
          console.log(`✅ Обновлено ${updated} из ${serverProducts.length}...`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Ошибка обновления "${serverProduct.name}":`, error.message);
      }
    } else {
      notFound++;
      console.log(`⚠️  Не найдены города для: "${serverProduct.name}"`);
    }
  }
  
  console.log('\n🎉 ГОТОВО!');
  console.log(`✅ Обновлено: ${updated}`);
  console.log(`⚠️  Без городов: ${notFound}`);
  console.log(`❌ Ошибок: ${errors}`);
  console.log(`\n🌐 Проверьте в админке: ${SERVER_URL}/_/`);
}

main().catch(console.error);
