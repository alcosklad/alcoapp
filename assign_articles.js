// Script to auto-assign ALC-XXXX articles to all products in PocketBase
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://146.103.121.96:8090');

async function main() {
  await pb.admins.authWithPassword('admin@nashsklad.store', 'admin12345');
  console.log('Authenticated as admin');

  const products = await pb.collection('products').getFullList({ sort: '+created' });
  console.log(`Found ${products.length} products`);

  let counter = 1;
  for (const product of products) {
    const newArticle = `ALC-${String(counter).padStart(4, '0')}`;
    await pb.collection('products').update(product.id, { article: newArticle });
    console.log(`${product.name} => ${newArticle}`);
    counter++;
  }

  console.log(`\nDone! Assigned ${counter - 1} articles (ALC-0001 to ALC-${String(counter - 1).padStart(4, '0')})`);
}

main().catch(console.error);
