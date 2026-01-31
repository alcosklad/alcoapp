import PocketBase from 'pocketbase';

// URL PocketBase на сервере
const pb = new PocketBase('http://localhost:8090');

// Авторизация
await pb.admins.authWithPassword('admin@example.com', 'password123456');

// Функция для определения категории по названию
function getCategoryFromName(name) {
  const lowerName = name.toLowerCase();
  
  // Проверяем по ключевым словам
  if (lowerName.includes('ликер') || lowerName.includes('liqueur')) return 'Ликер';
  if (lowerName.includes('водка')) return 'Водка';
  if (lowerName.includes('виски') || lowerName.includes('whisky') || lowerName.includes('whiskey')) return 'Виски';
  if (lowerName.includes('вино') || lowerName.includes('wine')) return 'Вино';
  if (lowerName.includes('коньяк') || lowerName.includes('cognac')) return 'Коньяк';
  if (lowerName.includes('ром') || lowerName.includes('rum')) return 'Ром';
  if (lowerName.includes('текила') || lowerName.includes('tequila')) return 'Текила';
  if (lowerName.includes('джин') || lowerName.includes('gin')) return 'Джин';
  if (lowerName.includes('настойка') || lowerName.includes('настойки') || lowerName.includes('bitters')) return 'Настойки';
  if (lowerName.includes('шампан') || lowerName.includes('champagne')) return 'Шампанское';
  if (lowerName.includes('брют') || lowerName.includes('brut')) return 'Брют';
  if (lowerName.includes('асти') || lowerName.includes('asti')) return 'Асти';
  if (lowerName.includes('просекко') || lowerName.includes('prosecco')) return 'Просекко';
  if (lowerName.includes('пиво')) return lowerName.includes('разлив') ? 'Пиво Разливное' : 'Пиво';
  if (lowerName.includes('напиток') || lowerName.includes('drink') || lowerName.includes('juice')) return 'Напитки';
  if (lowerName.includes('сигарет') || lowerName.includes('cigarette')) return 'Сигареты и Стики';
  if (lowerName.includes('стик') || lowerName.includes('stick') || lowerName.includes('iqos') || lowerName.includes('glo')) return 'Сигареты и Стики';
  if (lowerName.includes('электронн') || lowerName.includes('vape') || lowerName.includes('pod')) return 'Электронки';
  if (lowerName.includes('снэк') || lowerName.includes('закус') || lowerName.includes('чипс') || lowerName.includes('орешек')) return 'Снэки и Закуски';
  if (lowerName.includes('шоколад') || lowerName.includes('chocolate') || lowerName.includes('конфет') || lowerName.includes('батончик')) return 'Шоколад';
  
  return 'Другое';
}

// Основная функция
async function autoCategorizeProducts() {
  try {
    console.log('🚀 Загрузка товаров...');
    const products = await pb.collection('products').getFullList();
    
    console.log(`📦 Найдено товаров: ${products.length}`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      // Пропускаем если категория уже есть
      if (product.category && (Array.isArray(product.category) ? product.category.length > 0 : true)) {
        console.log(`⏭️ Пропускаем "${product.name}" - категория уже есть`);
        skipped++;
        continue;
      }
      
      const category = getCategoryFromName(product.name);
      console.log(`📝 "${product.name}" → ${category}`);
      
      await pb.collection('products').update(product.id, { category: category });
      updated++;
    }
    
    console.log(`\n✅ Готово!`);
    console.log(`📊 Обновлено: ${updated}`);
    console.log(`⏭️ Пропущено: ${skipped}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Запуск
autoCategorizeProducts();
