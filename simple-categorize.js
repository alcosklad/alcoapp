import PocketBase from 'pocketbase';

// URL PocketBase на сервере
const pb = new PocketBase('http://localhost:8090');

console.log('Открой http://nashsklad.store:8090/_/ чтобы войти в админку');
console.log('Создай админа или войди с существующими данными');
console.log('Затем обнови этот файл с правильными данными');

// Запрос данных у пользователя
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Email админа: ', (email) => {
  rl.question('Пароль админа: ', async (password) => {
    try {
      // Авторизация
      await pb.admins.authWithPassword(email, password);
      console.log('\n✅ Успешная авторизация!');
      
      // Загружаем товары
      const products = await pb.collection('products').getFullList(50);
      console.log(`\n📦 Найдено товаров: ${products.length}`);
      
      // Показываем первые 10 товаров без категории
      console.log('\n📋 Товары без категории:');
      let count = 0;
      for (const product of products) {
        if (!product.category || (Array.isArray(product.category) && product.category.length === 0)) {
          console.log(`${count + 1}. "${product.name}"`);
          count++;
          if (count >= 10) break;
        }
      }
      
      rl.close();
    } catch (error) {
      console.error('\n❌ Ошибка авторизации:', error.message);
      rl.close();
    }
  });
});
