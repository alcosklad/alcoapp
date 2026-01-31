import PocketBase from 'pocketbase';
import fs from 'fs';

// Подключение к PocketBase
const pb = new PocketBase('http://localhost:8090');

// Авторизация
await pb.admins.authWithPassword('admin@example.com', 'password123456');

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

// Основная функция импорта
async function importFromCSV() {
  try {
    console.log('🚀 Начинаю импорт...');
    
    // Читаем CSV файл
    const csvData = fs.readFileSync('price-list.csv', 'utf8');
    const lines = csvData.split('\n');
    
    const products = [];
    let currentSubcategory = '';
    let currentCity = '';
    
    // Пропускаем заголовок и начинаем со второй строки
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      
      // Колонка A - название/подкатегория
      const colA = columns[0] || '';
      // Колонка B - цена продажи
      const colB = columns[1] || '';
      // Колонка D - цена закупа
      const colD = columns[3] || '';
      
      // Если в колонке А нет цены и закупа - это подкатегория
      if (!colB && !colD && colA) {
        currentSubcategory = colA;
        console.log(`📁 Подкатегория: ${currentSubcategory}`);
        continue;
      }
      
      // Если есть товар
      if (colA && (colB || colD)) {
        const product = {
          name: colA,
          price: colB ? parseFloat(colB.replace(/[^\d.]/g, '')) : null,
          cost: colD ? parseFloat(colD.replace(/[^\d.]/g, '')) : null,
          category: getCategoryFromSubcategory(currentSubcategory),
          subcategory: currentSubcategory,
          volume: getVolumeFromName(colA),
          cities: [], // Будем заполнять позже
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        };
        
        products.push(product);
        console.log(`📦 Товар: ${product.name} - ${product.category} - ${product.price || 'нет цены'}₽`);
      }
    }
    
    console.log(`\n✅ Найдено товаров: ${products.length}`);
    
    // Сохраняем в JSON для проверки
    fs.writeFileSync('products-parsed.json', JSON.stringify(products, null, 2));
    console.log('💾 Сохранено в products-parsed.json');
    
    // Импортируем в PocketBase
    let imported = 0;
    let updated = 0;
    
    for (const product of products) {
      try {
        // Проверяем есть ли такой товар
        const existing = await pb.collection('products').getFirstListItem(`name="${product.name}"`, {
          skipTotal: true
        }).catch(() => null);
        
        if (existing) {
          // Обновляем существующий
          await pb.collection('products').update(existing.id, {
            price: product.price,
            cost: product.cost,
            category: product.category,
            subcategory: product.subcategory,
            volume: product.volume
          });
          console.log(`🔄 Обновлен: ${product.name}`);
          updated++;
        } else {
          // Создаем новый
          await pb.collection('products').create(product);
          console.log(`✅ Добавлен: ${product.name}`);
          imported++;
        }
      } catch (error) {
        console.log(`❌ Ошибка с "${product.name}":`, error.message);
      }
    }
    
    console.log(`\n🎉 Готово!`);
    console.log(`📊 Добавлено: ${imported}`);
    console.log(`🔄 Обновлено: ${updated}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Инструкция
console.log('📋 Инструкция:');
console.log('1. Скачай CSV из Google Sheets: Файл → Скачать → CSV');
console.log('2. Переименуй файл в price-list.csv');
console.log('3. Положи файл в папку с проектом');
console.log('4. Запусти: node import-from-csv.js\n');

// Проверяем есть ли файл
if (fs.existsSync('price-list.csv')) {
  importFromCSV();
} else {
  console.log('❌ Файл price-list.csv не найден!');
}
