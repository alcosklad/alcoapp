import PocketBase from 'pocketbase';
import fs from 'fs';

// Подключение к серверному PocketBase
const pb = new PocketBase('http://localhost:8090');

// Авторизация (измени данные)
await pb.admins.authWithPassword('admin@example.com', 'password123456');

console.log('🚀 Импорт товаров на сервер...');

try {
  // Читаем файл экспорта
  const exportData = JSON.parse(fs.readFileSync('products-export.json', 'utf8'));
  console.log(`📦 Загружено товаров из файла: ${exportData.products.length}`);
  
  // Очищаем существующие товары
  const existingProducts = await pb.collection('products').getFullList();
  console.log(`🗑️ Удаление существующих товаров: ${existingProducts.length}`);
  
  for (const product of existingProducts) {
    await pb.collection('products').delete(product.id);
  }
  
  // Импортируем товары
  let imported = 0;
  let skipped = 0;
  
  for (const productData of exportData.products) {
    try {
      // Создаем новый товар без id (чтобы сгенерировался новый)
      const { id, created, updated, ...productFields } = productData;
      
      await pb.collection('products').create(productFields);
      console.log(`✅ Импортирован: ${productData.name} (${productData.city || 'Без города'})`);
      imported++;
    } catch (error) {
      console.log(`❌ Ошибка импорта "${productData.name}":`, error.message);
      skipped++;
    }
  }
  
  console.log(`\n✅ Импорт завершен!`);
  console.log(`📊 Импортировано: ${imported}`);
  console.log(`⏭️ Пропущено: ${skipped}`);
  
} catch (error) {
  console.error('❌ Ошибка:', error);
}
