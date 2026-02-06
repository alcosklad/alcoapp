import PocketBase from 'pocketbase';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const SERVER_URL = 'http://146.103.121.96:8090';
const ADMIN_EMAIL = 'admin@sklad.ru';
const ADMIN_PASSWORD = '326052sssS';

// Маппинг городов
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

// Функция для определения категории по первому слову
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

// Функция для парсинга одного CSV файла
function parseCSV(filePath, cityCode) {
  const cityName = cityMapping[cityCode];
  console.log(`\n📄 Парсим ${filePath} (${cityName})...`);
  
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
      
      // Пропускаем заголовки и пустые строки
      if (!row[0]) continue;
      
      const name = row[0]?.trim();
      
      // Пропускаем заголовки категорий (написаны капсом без цифр в названии)
      if (!name || 
          name === cityName || 
          name.toUpperCase() === name ||
          !row[1] ||  // Нет цены продажи
          !row[3]) {  // Нет цены закупа
        continue;
      }
      
      const priceStr = row[1]?.toString().replace(/\s/g, '').replace(',', '.');
      const costStr = row[3]?.toString().replace(/\s/g, '').replace(',', '.');
      
      const price = parseFloat(priceStr);
      const cost = parseFloat(costStr);
      
      // Проверяем валидность цен
      if (isNaN(price) || isNaN(cost) || price <= 0 || cost <= 0) {
        continue;
      }
      
      const category = getCategory(name);
      
      products.push({
        name,
        price,
        cost,
        category,
        city: cityName
      });
    }
    
    console.log(`✅ Найдено ${products.length} товаров в ${cityName}`);
    return products;
  } catch (error) {
    console.error(`❌ Ошибка парсинга ${filePath}:`, error.message);
    return [];
  }
}

// Функция для сбора уникальных товаров
function collectUniqueProducts(allProducts) {
  const productMap = new Map();
  
  for (const product of allProducts) {
    const key = product.name.toLowerCase().trim();
    
    if (productMap.has(key)) {
      const existing = productMap.get(key);
      
      // Добавляем город если его еще нет
      if (!existing.cities.includes(product.city)) {
        existing.cities.push(product.city);
      }
      
      // Обновляем цены (берем среднее или последнее значение)
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
  
  return Array.from(productMap.values());
}

async function updateCollectionSchema(pb) {
  try {
    console.log('🔄 Проверяем схему коллекции products...');
    const collection = await pb.collections.getOne('products');
    
    // Проверяем наличие поля cities
    const hasCities = collection.schema.find(f => f.name === 'cities');
    const hasCategory = collection.schema.find(f => f.name === 'category');
    
    let schemaChanged = false;
    
    if (!hasCities) {
      console.log('➕ Добавляем поле cities (JSON)...');
      collection.schema.push({
        name: 'cities',
        type: 'json',
        required: false,
        options: {}
      });
      schemaChanged = true;
    }
    
    if (!hasCategory) {
      console.log('➕ Добавляем поле category (text)...');
      collection.schema.push({
        name: 'category',
        type: 'text',
        required: false,
        options: {}
      });
      schemaChanged = true;
    }

    // Также проверим price и cost
    if (!collection.schema.find(f => f.name === 'price')) {
      collection.schema.push({ name: 'price', type: 'number', required: false, options: {} });
      schemaChanged = true;
    }
    if (!collection.schema.find(f => f.name === 'cost')) {
      collection.schema.push({ name: 'cost', type: 'number', required: false, options: {} });
      schemaChanged = true;
    }
    
    if (schemaChanged) {
      await pb.collections.update('products', collection);
      console.log('✅ Схема коллекции обновлена');
    } else {
      console.log('✅ Схема коллекции уже актуальна');
    }
    
  } catch (error) {
    if (error.status === 404) {
      console.log('✨ Создаем коллекцию products...');
      await pb.collections.create({
        name: 'products',
        type: 'base',
        schema: [
          { name: 'name', type: 'text', required: true },
          { name: 'price', type: 'number' },
          { name: 'cost', type: 'number' },
          { name: 'category', type: 'text' },
          { name: 'cities', type: 'json' }
        ]
      });
      console.log('✅ Коллекция создана');
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log('🚀 Начинаем импорт товаров на сервер PocketBase');
  console.log(`📡 Сервер: ${SERVER_URL}`);
  
  // Собираем все товары из CSV файлов
  const allProducts = [];
  
  for (const [cityCode, cityName] of Object.entries(cityMapping)) {
    const filePath = `./price_${cityCode}.csv`;
    
    if (fs.existsSync(filePath)) {
      const products = parseCSV(filePath, cityCode);
      allProducts.push(...products);
    } else {
      console.log(`⚠️  Файл ${filePath} не найден, пропускаем`);
    }
  }
  
  console.log(`\n📊 Всего собрано ${allProducts.length} записей товаров`);
  
  // Собираем уникальные товары
  const uniqueProducts = collectUniqueProducts(allProducts);
  console.log(`✨ Уникальных товаров: ${uniqueProducts.length}`);
  
  // Подключаемся к серверу PocketBase
  console.log(`\n🔐 Подключаемся к серверу...`);
  const pb = new PocketBase(SERVER_URL);
  
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Авторизация успешна');
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error.message);
    process.exit(1);
  }
  
  // Обновляем схему
  await updateCollectionSchema(pb);
  
  // Очищаем старые товары
  console.log('\n🗑️  Удаляем старые товары...');
  try {
    const oldProducts = await pb.collection('products').getFullList();
    console.log(`Найдено ${oldProducts.length} старых товаров`);
    
    // Удаляем пачками по 100
    const chunks = [];
    for (let i = 0; i < oldProducts.length; i += 100) {
      chunks.push(oldProducts.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(p => pb.collection('products').delete(p.id)));
    }
    console.log('✅ Старые товары удалены');
  } catch (error) {
    console.log('⚠️  Ошибка удаления старых товаров:', error.message);
  }
  
  // Загружаем новые товары
  console.log('\n📦 Загружаем товары на сервер...');
  let successCount = 0;
  let errorCount = 0;
  
  // Загружаем последовательно, чтобы не положить сервер
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
        console.log(`✅ Загружено ${i + 1} из ${uniqueProducts.length}...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Ошибка загрузки "${product.name}":`, error.message);
    }
  }
  
  console.log('\n🎉 ГОТОВО!');
  console.log(`✅ Успешно загружено: ${successCount}`);
  console.log(`❌ Ошибок: ${errorCount}`);
  console.log(`\n🌐 Проверьте в админке: ${SERVER_URL}/_/`);
}

main().catch(console.error);
