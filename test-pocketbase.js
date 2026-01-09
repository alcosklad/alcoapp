// Вставьте это в консоль браузера для проверки PocketBase

(async function testPocketBase() {
  try {
    const pb = new PocketBase('https://pocketbase-zk4wws8kg4c80kck4o8k8g8c.146.103.121.96.sslip.io');
    pb.autoCancellation(false);
    
    console.log('Тест подключения к PocketBase');
    console.log('URL:', pb.baseUrl);
    
    // Проверяем здоровье сервера
    const health = await pb.health.check();
    console.log('Health check:', health);
    
    // Проверяем коллекции
    console.log('\n--- Проверка коллекций ---');
    
    // Suppliers
    try {
      const suppliers = await pb.collection('suppliers').getList(1, 10);
      console.log('Suppliers:', suppliers);
    } catch (e) {
      console.error('Suppliers error:', e);
    }
    
    // Warehouses
    try {
      const warehouses = await pb.collection('warehouses').getList(1, 10);
      console.log('Warehouses:', warehouses);
    } catch (e) {
      console.error('Warehouses error:', e);
    }
    
    // Products
    try {
      const products = await pb.collection('products').getList(1, 10);
      console.log('Products:', products);
    } catch (e) {
      console.error('Products error:', e);
    }
    
  } catch (error) {
    console.error('Общая ошибка:', error);
  }
})();
