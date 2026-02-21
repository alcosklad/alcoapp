import PocketBase from 'pocketbase';

const pb = new PocketBase('http://146.103.121.96:8090');

async function verify() {
  try {
    // Авторизуемся как админ (но через коллекцию users, чтобы проверить обычный доступ)
    // Или просто как админ PocketBase
    await pb.admins.authWithPassword('admin@sklad.ru', 'admin123456');
    
    const orders = await pb.collection('orders').getList(1, 1);
    console.log('Orders fetch successful, total:', orders.totalItems);
    
    const shifts = await pb.collection('shifts').getList(1, 1);
    console.log('Shifts fetch successful, total:', shifts.totalItems);
    
    const sales = await pb.collection('sales').getList(1, 1);
    console.log('Sales fetch successful, total:', sales.totalItems);

  } catch (e) {
    console.error('Verify error:', e.message);
  }
}

verify();
