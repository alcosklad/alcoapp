import PocketBase from 'pocketbase';
import fs from 'fs';

// Подключение к локальному PocketBase
const pbLocal = new PocketBase('http://localhost:8090');

// Авторизация
await pbLocal.admins.authWithPassword('admin@example.com', 'password123456');

console.log('🚀 Экспорт товаров из локального PocketBase...');

try {
  // Получаем все товары
  const products = await pbLocal.collection('products').getFullList({
    batch: 200
  });
  
  console.log(`📦 Найдено товаров: ${products.length}`);
  
  // Сохраняем в файл
  const exportData = {
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      cost: p.cost,
      category: p.category,
      volume: p.volume,
      barcode: p.barcode,
      description: p.description,
      city: p.city || 'Москва', // Добавляем город по умолчанию
      created: p.created,
      updated: p.updated
    }))
  };
  
  fs.writeFileSync('products-export.json', JSON.stringify(exportData, null, 2));
  console.log('✅ Товары экспортированы в products-export.json');
  
  // Показываем статистику по городам
  const cities = {};
  products.forEach(p => {
    const city = p.city || 'Не указан';
    cities[city] = (cities[city] || 0) + 1;
  });
  
  console.log('\n📊 Товары по городам:');
  Object.entries(cities).forEach(([city, count]) => {
    console.log(`  ${city}: ${count} товаров`);
  });
  
} catch (error) {
  console.error('❌ Ошибка:', error);
}
