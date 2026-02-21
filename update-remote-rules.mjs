import PocketBase from 'pocketbase';

const pb = new PocketBase('http://146.103.121.96:8090');

async function updateRules() {
  try {
    await pb.admins.authWithPassword('rostislavkomkov@gmail.com', 'Rostik230399');
    console.log('Auth successful');

    const orders = await pb.collections.getOne('orders');
    orders.listRule = '@request.auth.id != ""';
    orders.viewRule = '@request.auth.id != ""';
    await pb.collections.update('orders', orders);
    console.log('Orders rules updated');

    const sales = await pb.collections.getOne('sales');
    sales.listRule = '@request.auth.id != ""';
    sales.viewRule = '@request.auth.id != ""';
    await pb.collections.update('sales', sales);
    console.log('Sales (shifts) rules updated');

  } catch (e) {
    console.error(e.message, e.response);
  }
}

updateRules();
