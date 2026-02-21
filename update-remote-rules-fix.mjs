import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function updateRules() {
  try {
    await pb.admins.authWithPassword('admin@alcoapp.ru', 'admin123456');
    console.log('Auth successful');

    const orders = await pb.collections.getOne('orders');
    orders.listRule = '@request.auth.id != ""';
    orders.viewRule = '@request.auth.id != ""';
    orders.updateRule = '@request.auth.id != ""';
    orders.deleteRule = '@request.auth.id != ""';
    await pb.collections.update('orders', orders);
    console.log('Orders rules updated');

    const sales = await pb.collections.getOne('sales');
    sales.listRule = '@request.auth.id != ""';
    sales.viewRule = '@request.auth.id != ""';
    sales.updateRule = '@request.auth.id != ""';
    sales.deleteRule = '@request.auth.id != ""';
    await pb.collections.update('sales', sales);
    console.log('Sales rules updated');

    try {
      const shifts = await pb.collections.getOne('shifts');
      shifts.listRule = '@request.auth.id != ""';
      shifts.viewRule = '@request.auth.id != ""';
      shifts.updateRule = '@request.auth.id != ""';
      shifts.deleteRule = '@request.auth.id != ""';
      await pb.collections.update('shifts', shifts);
      console.log('Shifts rules updated');
    } catch(e) {
      console.log('Shifts not found, creating...');
      await pb.collections.create({
        name: 'shifts',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        schema: [
          { name: 'user', type: 'relation', required: true, options: { collectionId: '_pb_users_auth_', maxSelect: 1 } },
          { name: 'start', type: 'text', required: true },
          { name: 'end', type: 'text' },
          { name: 'status', type: 'select', required: true, options: { values: ['active', 'closed'] } },
          { name: 'totalAmount', type: 'number' },
          { name: 'totalItems', type: 'number' },
          { name: 'sales', type: 'json' },
          { name: 'city', type: 'text' }
        ]
      });
      console.log('Shifts collection created with rules');
    }

  } catch (e) {
    console.error(e.message, e.response);
  }
}

updateRules();
