import PocketBase from 'pocketbase';
import fs from 'fs';

// Подключение к PocketBase
const pb = new PocketBase('http://localhost:8090');

// Авторизация
await pb.admins.authWithPassword('admin@sklad.ru', '326052sssS');

// Определяем город по имени файла
function getCityFromFilename(filename) {
  const cityMap = {
    'price_spb.csv': 'Санкт-Петербург',
    'price_msk.csv': 'Москва',
    'price_ufa.csv': 'Уфа',
    'price_ekb.csv': 'Екатеринбург',
    'price_kazan.csv': 'Казань',
    'price_nn.csv': 'Нижний Новгород',
    'price_samara.csv': 'Самара',
    'price_voronej.csv': 'Воронеж',
    'price_volgograd.csv': 'Волгоград',
    'price_rostov.csv': 'Ростов-на-Дону',
    'price_krasnoyarsk.csv': 'Красноярск',
    'price_perm.csv': 'Пермь',
    'price_chelyabinsk.csv': 'Челябинск',
    'price_omsk.csv': 'Омск',
    'price_barnaul.csv': 'Барнаул',
    'price_izhevsk.csv': 'Ижевск',
    'price_vladivostok.csv': 'Владивосток',
    'price_krasnodar.csv': 'Краснодар',
    'price_saratov.csv': 'Саратов',
    'price_tumen.csv': 'Тюмень'
  };
  
  return cityMap[filename] || 'Неизвестный город';
}

// Функция для определения категории по названию
function getCategoryFromName(name) {
  const lower = name.toLowerCase();
  
  if (lower.includes('вино')) return 'Вино';
  if (lower.includes('водка')) return 'Водка';
  if (lower.includes('виски')) return 'Виски';
  if (lower.includes('коньяк')) return 'Коньяк';
  if (lower.includes('ром')) return 'Ром';
  if (lower.includes('текила')) return 'Текила';
  if (lower.includes('джин')) return 'Джин';
  if (lower.includes('ликер')) return 'Ликер';
  if (lower.includes('шампан') || lower.includes('брют') || lower.includes('просекко')) return 'Шампанское';
  if (lower.includes('вермут')) return 'Вермут';
  if (lower.includes('пиво')) return 'Пиво';
  if (lower.includes('сидр')) return 'Сидр';
  if (lower.includes('напиток')) return 'Напитки';
  if (lower.includes('сигарет')) return 'Сигареты и Стики';
  if (lower.includes('электронн') || lower.includes('vape')) return 'Электронные сигареты';
  if (lower.includes('снэк') || lower.includes('чипс') || lower.includes('орешек') || lower.includes('сухарик')) return 'Снэки и Закуски';
  if (lower.includes('шоколад') || lower.includes('конфет') || lower.includes('батончик')) return 'Шоколад и Конфеты';
  if (lower.includes('энергетик') || lower.includes('energy')) return 'Энергетики';
  if (lower.includes('вода') || lower.includes('juice') || lower.includes('сок')) return 'Безалкогольные напитки';
  
  return 'Другое';
}

// Функция для извлечения объема из названия
function getVolumeFromName(name) {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*л/i,
    /(\d+)\s*мл/i,
    /(\d+(?:\.\d+)?)\s*l/i
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (name.toLowerCase().includes('мл') || name.toLowerCase().includes('ml')) {
        return (value / 1000) + 'л';
      }
      return value + 'л';
    }
  }
  return null;
}

// Основная функция импорта
async function importAllCSV() {
  try {
    console.log('🚀 Начинаю импорт CSV файлов...\n');
    
    // Находим все файлы price_*.csv
    const files = fs.readdirSync('.').filter(f => f.startsWith('price_') && f.endsWith('.csv'));
    console.log(`📁 Найдено файлов: ${files.length}`);
    files.forEach(f => console.log(`  - ${f} → ${getCityFromFilename(f)}`));
    
    const allProducts = [];
    
    // Обрабатываем каждый файл
    for (const file of files) {
      console.log(`\n📖 Обработка файла: ${file}`);
      const city = getCityFromFilename(file);
      console.log(`🏙️ Город: ${city}`);
      
      const csvData = fs.readFileSync(file, 'utf8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      let productCount = 0;
      
      // Пропускаем заголовок если есть
      const startIndex = lines[0].includes('Название') ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Разбираем CSV с учетом возможных пробелов после запятых
        const columns = line.split(',').map(col => col.trim());
        
        if (columns.length >= 3) {
          const name = columns[0] || '';
          const price = columns[1] ? parseFloat(columns[1].replace(/[^\d.]/g, '')) : null;
          const cost = columns[2] ? parseFloat(columns[2].replace(/[^\d.]/g, '')) : null;
          
          // Пропускаем если нет названия
          if (!name) continue;
          
          const product = {
            name: name,
            price: price,
            cost: cost,
            category: getCategoryFromName(name),
            volume: getVolumeFromName(name),
            cities: [city],
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          };
          
          allProducts.push(product);
          productCount++;
          console.log(`  ✓ ${name} - ${price}₽/${cost}₽`);
        }
      }
      
      console.log(`✅ Добавлено товаров из ${file}: ${productCount}`);
    }
    
    console.log(`\n📦 Всего товаров из всех файлов: ${allProducts.length}`);
    
    // Группируем товары по названию (убираем дубликаты)
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
        // Обновляем цены если в новом товаре они есть
        if (product.price && !uniqueProducts[product.name].price) {
          uniqueProducts[product.name].price = product.price;
        }
        if (product.cost && !uniqueProducts[product.name].cost) {
          uniqueProducts[product.name].cost = product.cost;
        }
      }
    }
    
    console.log(`📊 Уникальных товаров: ${Object.keys(uniqueProducts).length}`);
    
    // Сохраняем результат для проверки
    fs.writeFileSync('all-products-import.json', JSON.stringify(Object.values(uniqueProducts), null, 2));
    console.log('💾 Сохранено в all-products-import.json');
    
    // Импортируем в PocketBase
    let imported = 0;
    let errors = 0;
    
    for (const [name, product] of Object.entries(uniqueProducts)) {
      try {
        await pb.collection('products').create(product);
        console.log(`✅ Добавлен: ${name} (${product.cities.join(', ')})`);
        imported++;
      } catch (error) {
        console.log(`❌ Ошибка с "${name}": ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n🎉 Импорт завершен!`);
    console.log(`📊 Успешно добавлено: ${imported}`);
    console.log(`❌ Ошибок: ${errors}`);
    
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
