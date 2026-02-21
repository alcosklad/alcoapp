import PocketBase from 'pocketbase';

const pb = new PocketBase('http://146.103.121.96:8090');

async function checkRules() {
  try {
    await pb.admins.authWithPassword('admin@sklad.ru', 'admin123456');
    console.log('Auth successful');

    const orders = await pb.collections.getOne('orders');
    console.log('Orders rules:');
    console.log('listRule:', orders.listRule);
    console.log('viewRule:', orders.viewRule);
    console.log('createRule:', orders.createRule);
    console.log('updateRule:', orders.updateRule);
    console.log('deleteRule:', orders.deleteRule);

  } catch (e) {
    console.error('Auth error:', e.message, e.response);
  }
}

checkRules();
