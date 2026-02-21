import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function createShifts() {
  try {
    await pb.admins.authWithPassword('admin@sklad.ru', 'admin123456');
    console.log('Auth successful');

    try {
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
      console.log('Shifts collection created!');
    } catch(e) {
      console.log('Shifts already exists or error:', e.response);
    }
  } catch (e) {
    console.error('Auth error:', e.message, e.response);
  }
}

createShifts();
