import PocketBase from 'pocketbase';

// Определяем URL в зависимости от окружения
const isLocalhost = true; // Для локального тестирования
let pbUrl = 'http://localhost:8090';

if (!isLocalhost) {
  pbUrl = 'http://146.103.121.96:8090';
}

const pb = new PocketBase(pbUrl);

// Входим в систему (нужно указать реальные данные)
async function clearOrders() {
  try {
    // Входим как админ для получения прав на удаление
    await pb.admins.authWithPassword('admin@example.com', 'password');
    console.log('Авторизация успешна');
    
    // Получаем все заказы
    const records = await pb.collection('orders').getFullList();
    console.log('Найдено записей:', records.length);
    
    // Удаляем каждую запись
    for (const record of records) {
      await pb.collection('orders').delete(record.id);
      console.log('Удален заказ:', record.id);
    }
    
    console.log('Все заказы удалены!');
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

clearOrders();
