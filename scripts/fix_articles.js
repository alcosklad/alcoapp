import PocketBase from 'pocketbase';

const pb = new PocketBase('http://146.103.121.96:8090');

async function fixArticles() {
  try {
    // Авторизуемся как пользователь с ролью admin
    await pb.collection('users').authWithPassword('admin', 'Komkov2005!');
    
    // Получаем все товары
    const products = await pb.collection('products').getFullList({ sort: 'created' });
    
    console.log(`Всего товаров: ${products.length}`);
    
    // Находим максимальный артикул
    let maxArticle = 0;
    products.forEach(p => {
      const num = parseInt(p.article, 10);
      if (!isNaN(num) && num > maxArticle) {
        maxArticle = num;
      }
    });
    
    console.log(`Максимальный артикул: ${maxArticle}`);
    
    // Обновляем товары без артикула
    let updated = 0;
    for (const product of products) {
      if (!product.article || product.article.trim() === '' || product.article === '-') {
        maxArticle++;
        const newArticle = String(maxArticle).padStart(4, '0');
        await pb.collection('products').update(product.id, { article: newArticle });
        console.log(`${product.name} → ${newArticle}`);
        updated++;
      }
    }
    
    console.log(`\nОбновлено товаров: ${updated}`);
    process.exit(0);
  } catch (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }
}

fixArticles();
