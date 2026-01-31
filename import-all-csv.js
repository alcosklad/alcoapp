import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

// Подключение к PocketBase
const pb = new PocketBase('http://localhost:8090');

// Авторизация
await pb.admins.authWithPassword('admin@sklad.ru', '326052sssS');

// Функция для определения категории по подкатегории
function getCategoryFromSubcategory(subcategory) {
  const lower = subcategory.toLowerCase();
  
  if (lower.includes('вино')) return 'Вино';
  if (lower.includes('водка')) return 'Водка';
  if (lower.includes('виски')) return 'Виски';
  if (lower.includes('коньяк')) return 'Коньяк';
  if (lower.includes('ром')) return 'Ром';
  if (lower.includes('текила')) return 'Текила';
  if (lower.includes('джин')) return 'Джин';
  if (lower.includes('ликер')) return 'Ликер';
  if (lower.includes('шампан') || lower.includes('брют') || lower.includes('просекко')) return 'Шампанское';
  if (lower.includes('пиво')) return 'Пиво';
  if (lower.includes('напиток')) return 'Напитки';
  if (lower.includes('сигарет')) return 'Сигареты и Стики';
  if (lower.includes('электронн') || lower.includes('vape')) return 'Электронки';
  if (lower.includes('снэк') || lower.includes('чипс') || lower.includes('орешек')) return 'Снэки и Закуски';
  if (lower.includes('шоколад') || lower.includes('конфет')) return 'Шоколад';
  
  return 'Другое';
}

// Функция для извлечения объема из названия
function getVolumeFromName(name) {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*[лL]/,
    /(\d+)\s*мл/i,
    /(\d+(?:\.\d+)?)\s*л/i
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (name.toLowerCase().includes('мл')) {
        return (value / 1000) + 'л';
      }
      return value + 'л';
    }
  }
  return null;
}

// Определяем город по имени файла
function getCityFromFilename(filename) {
  const cityMap = {
    'spb': 'Санкт-Петербург',
    'msk': 'Москва',
    'spb': 'Санкт-Петербург',
    'ufa': 'Уфа',
    'nn': 'Нижний Новгород',
    'ekb': 'Екатеринбург',
    'kazan': 'Казань',
    'rostov': 'Ростов-на-Дону',
    'samara': 'Самара',
    'chelyabinsk': 'Челябинск',
    'omsk': 'Омск',
    'krasnoyarsk': 'Красноярск',
    'perm': 'Пермь',
    'voronezh': 'Воронеж',
    'volgograd': 'Волгоград'
  };
  
  const lower = filename.toLowerCase();
  for (const [key, city] of Object.entries(cityMap)) {
    if (lower.includes(key)) return city;
  }
  
  return 'Неизвестный город';
}

// Основная функция импорта
async function importAllCSV() {
  try {
    console.log('🚀 Начинаю импорт всех CSV файлов...\n');
    
    // Находим все файлы price_*.csv
    const files = fs.readdirSync('.').filter(f => f.startsWith('price_') && f.endsWith('.csv'));
    console.log(`📁 Найдено файлов: ${files.length}`);
    files.forEach(f => console.log(`  - ${f}`));
    
    const allProducts = [];
    
    // Обрабатываем каждый файл
    for (const file of files) {
      console.log(`\n📖 Обработка файла: ${file}`);
      const city = getCityFromFilename(file);
      console.log(`🏙️ Город: ${city}`);
      
      const csvData = fs.readFileSync(file, 'utf8');
      const lines = csvData.split('\n');
      
      let currentSubcategory = '';
      let productCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
        const colA = columns[0] || '';
        const colB = columns[1] || '';
        const colD = columns[3] || '';
        
        // Если это подкатегория
        if (!colB && !colD && colA) {
          currentSubcategory = colA;
          continue;
        }
        
        // Если это товар
        if (colA && (colB || colD)) {
          const product = {
            name: colA,
            price: colB ? parseFloat(colB.replace(/[^\d.]/g, '')) : null,
            cost: colD ? parseFloat(colD.replace(/[^\d.]/g, '')) : null,
            category: getCategoryFromSubcategory(currentSubcategory),
            subcategory: currentSubcategory,
            volume: getVolumeFromName(colA),
            cities: [city], // Товар доступен в этом городе
            source_file: file,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          };
          
          allProducts.push(product);
          productCount++;
        }
      }
      
      console.log(`✅ Добавлено товаров из ${file}: ${productCount}`);
    }
    
    console.log(`\n📦 Всего товаров из всех файлов: ${allProducts.length}`);
    
    // Группируем товары по названию
    const uniqueProducts = {};
    for (const product of allProducts) {
      if (!uniqueProducts[product.name]) {
        uniqueProducts[product.name] = {
          ...product,
          cities: [...product.cities]
        };
      } else {
        // Добавляем город если его еще нет
        product.cities.forEach(city => {
          if (!uniqueProducts[product.name].cities.includes(city)) {
            uniqueProducts[product.name].cities.push(city);
          }
        });
      }
    }
    
    console.log(`📊 Уникальных товаров: ${Object.keys(uniqueProducts).length}`);
    
    // Сохраняем результат
    fs.writeFileSync('all-products.json', JSON.stringify(Object.values(uniqueProducts), null, 2));
    console.log('💾 Сохранено в all-products.json');
    
    // Импортируем в PocketBase
    let imported = 0;
    let updated = 0;
    
    for (const product of Object.values(uniqueProducts)) {
      try {
        const existing = await pb.collection('products').getFirstListItem(`name="${product.name}"`, {
          skipTotal: true
        }).catch(() => null);
        
        if (existing) {
          await pb.collection('products').update(existing.id, {
            price: product.price,
            cost: product.cost,
            category: product.category,
            subcategory: product.subcategory,
            volume: product.volume,
            cities: product.cities
          });
          console.log(`🔄 Обновлен: ${product.name} (${product.cities.join(', ')})`);
          updated++;
        } else {
          await pb.collection('products').create(product);
          console.log(`✅ Добавлен: ${product.name} (${product.cities.join(', ')})`);
          imported++;
        }
      } catch (error) {
        console.log(`❌ Ошибка с "${product.name}":`, error.message);
      }
    }
    
    console.log(`\n🎉 Готово!`);
    console.log(`📊 Добавлено: ${imported}`);
    console.log(`🔄 Обновлено: ${updated}`);
    
    // Статистика по городам
    console.log('\n📊 Товары по городам:');
    const cityStats = {};
    Object.values(uniqueProducts).forEach(p => {
      p.cities.forEach(city => {
        cityStats[city] = (cityStats[city] || 0) + 1;
      });
    });
    Object.entries(cityStats).forEach(([city, count]) => {
      console.log(`  ${city}: ${count} товаров`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Запуск
importAllCSV();
