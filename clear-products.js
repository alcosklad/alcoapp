import PocketBase from 'pocketbase';

// Подключение к PocketBase
const pb = new PocketBase('http://localhost:8090');

// Авторизация
await pb.admins.authWithPassword('admin@sklad.ru', '326052sssS');

console.log('🗑️ Очистка коллекции products...');

try {
  // Получаем все товары
  const products = await pb.collection('products').getFullList();
  console.log(`📦 Найдено товаров для удаления: ${products.length}`);
  
  // Удаляем все
  let deleted = 0;
  for (const product of products) {
    await pb.collection('products').delete(product.id);
    deleted++;
    
    if (deleted % 100 === 0) {
      console.log(`Удалено: ${deleted}/${products.length}`);
    }
  }
  
  console.log(`✅ Удалено всего: ${deleted} товаров`);
  console.log('🧹 База очищена!');
  
} catch (error) {
  console.error('❌ Ошибка:', error);
}
