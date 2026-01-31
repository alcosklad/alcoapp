import PocketBase from 'pocketbase';

// URL PocketBase для локальной разработки
const pb = new PocketBase('http://localhost:8090');

// Администраторские данные (измени если нужно)
pb.admins.authWithPassword('admin@example.com', 'password123456').catch(() => {
  console.log('Ошибка авторизации. Проверь данные админа в PocketBase');
});

// Функция для определения категории по названию
function getCategoryFromName(name) {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('водка')) return 'Водка';
  if (lowerName.includes('виски') || lowerName.includes('whisky') || lowerName.includes('whiskey')) return 'Виски';
  if (lowerName.includes('вино') || lowerName.includes('wine')) return 'Вино';
  if (lowerName.includes('коньяк') || lowerName.includes('cognac')) return 'Коньяк';
  if (lowerName.includes('ром') || lowerName.includes('rum')) return 'Ром';
  if (lowerName.includes('текила') || lowerName.includes('tequila')) return 'Текила';
  if (lowerName.includes('джин') || lowerName.includes('gin')) return 'Джин';
  if (lowerName.includes('ликер') || lowerName.includes('liqueur')) return 'Ликер';
  if (lowerName.includes('шампан') || lowerName.includes('шампанское') || lowerName.includes('champagne')) return 'Шампанское';
  if (lowerName.includes('пиво') || lowerName.includes('beer')) return 'Пиво';
  
  return 'Другое';
}

// Функция для извлечения объема из названия
function getVolumeFromName(name) {
  // Ищем объем в разных форматах: 0.7л, 0.7 л, 0.7L, 700мл, 700 мл
  const patterns = [
    /(\d+(?:\.\d+)?)\s*[лL]/,  // 0.7л, 0.7 л, 0.7L
    /(\d+)\s*мл/i,            // 700мл, 700 мл
    /(\d+(?:\.\d+)?)\s*л/i     // дополнительный паттерн для кириллицы
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      
      // Если это миллилитры, конвертируем в литры
      if (name.toLowerCase().includes('мл')) {
        return (value / 1000) + 'л';
      }
      
      return value + 'л';
    }
  }
  
  return null;
}

// Основная функция обновления товаров
async function updateProducts() {
  try {
    console.log('Загрузка товаров...');
    const products = await pb.collection('products').getFullList();
    
    console.log(`Найдено товаров: ${products.length}`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      const needsUpdate = {};
      
      // Проверяем категорию
      if (!product.category) {
        needsUpdate.category = getCategoryFromName(product.name);
      }
      
      // Проверяем объем
      if (!product.volume) {
        const volume = getVolumeFromName(product.name);
        if (volume) {
          needsUpdate.volume = volume;
        }
      }
      
      // Если есть что обновить
      if (Object.keys(needsUpdate).length > 0) {
        console.log(`Обновление товара "${product.name}":`, needsUpdate);
        
        await pb.collection('products').update(product.id, needsUpdate);
        updated++;
      } else {
        skipped++;
      }
    }
    
    console.log(`\nГотово!`);
    console.log(`Обновлено: ${updated}`);
    console.log(`Пропущено: ${skipped}`);
    
  } catch (error) {
    console.error('Ошибка при обновлении товаров:', error);
  }
}

// Запуск обновления
updateProducts();
