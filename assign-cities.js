import PocketBase from 'pocketbase';

// Подключение к PocketBase
const pb = new PocketBase('http://localhost:8090');

// Авторизация
await pb.admins.authWithPassword('admin@example.com', 'password123456');

// Структура городов из таблицы
const cityStructure = {
  'Санкт-Петербург': {
    page: 1,
    products: [] // Заполнится после парсинга
  },
  'Москва': {
    page: 2,
    products: []
  },
  'Уфа': {
    page: 3,
    products: []
  },
  // Добавь другие города по мере необходимости
};

async function assignCitiesToProducts() {
  try {
    console.log('🏙️ Распределение товаров по городам...');
    
    // Получаем все товары
    const products = await pb.collection('products').getFullList();
    console.log(`📦 Всего товаров: ${products.length}`);
    
    // Получаем уникальные названия товаров
    const uniqueProducts = {};
    products.forEach(p => {
      if (!uniqueProducts[p.name]) {
        uniqueProducts[p.name] = [];
      }
      uniqueProducts[p.name].push(p);
    });
    
    console.log(`📊 Уникальных товаров: ${Object.keys(uniqueProducts).length}`);
    
    // Здесь нужно логику распределения по городам
    // Пока распределим все товары во все города для теста
    let updated = 0;
    
    for (const [productName, productList] of Object.entries(uniqueProducts)) {
      // Определяем в каких городах есть товар
      // Это нужно настроить вручную или на основе данных
      
      // Временно добавляем во все города
      const cities = ['Санкт-Петербург', 'Москва', 'Уфа'];
      
      // Обновляем все версии товара
      for (const product of productList) {
        await pb.collection('products').update(product.id, {
          cities: cities
        });
        updated++;
      }
      
      console.log(`📍 "${productName}" → ${cities.join(', ')}`);
    }
    
    console.log(`\n✅ Обновлено записей: ${updated}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

// Создадим также скрипт для ручного распределения
console.log('📋 Для ручного распределения:');
console.log('1. Открой products-parsed.json');
console.log('2. Для каждого товара укажи в поле cities массив городов');
console.log('3. Запусти: node assign-cities.js');

assignCitiesToProducts();
