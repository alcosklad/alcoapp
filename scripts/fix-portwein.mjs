import PocketBase from 'pocketbase';

const pb = new PocketBase('http://146.103.121.96:8090');

async function main() {
  // Авторизуемся как админ
  await pb.admins.authWithPassword('admin@admin.com', 'adminadmin');
  console.log('✅ Авторизация успешна');

  // Получаем все товары
  const products = await pb.collection('products').getFullList({ sort: 'name' });
  console.log(`📦 Всего товаров: ${products.length}`);

  // Ищем товары с "ликерн" или "ликёрн" в названии
  const portweinProducts = products.filter(p => {
    const name = (p.name || '').toLowerCase();
    return /ликерн|ликёрн|портвейн/i.test(name);
  });

  console.log(`🍷 Найдено товаров для подкатегории "Портвейн": ${portweinProducts.length}`);

  for (const product of portweinProducts) {
    console.log(`  → ${product.name} (текущая подкатегория: "${product.subcategory || ''}")`);
    
    if (product.subcategory !== 'Портвейн') {
      await pb.collection('products').update(product.id, { subcategory: 'Портвейн' });
      console.log(`    ✅ Обновлено на "Портвейн"`);
    } else {
      console.log(`    — уже "Портвейн", пропускаем`);
    }
  }

  console.log('\n✅ Готово!');
}

main().catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
