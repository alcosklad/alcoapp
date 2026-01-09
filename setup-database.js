import PocketBase from 'pocketbase';
import fs from 'fs';

const pb = new PocketBase('http://localhost:8090');

async function setupDatabase() {
  try {
    console.log('🔧 Настраиваю базу данных...');
    
    // Создаем админа если его нет
    try {
      await pb.collection('_users').create({
        email: 'admin@example.com',
        password: 'admin123456',
        passwordConfirm: 'admin123456',
        role: 'admin'
      });
      console.log('✅ Админ создан: admin@example.com / admin123456');
    } catch (e) {
      console.log('ℹ️ Админ уже существует');
    }
    
    // Авторизуемся
    await pb.collection('_users').authWithPassword('admin@example.com', 'admin123456');
    
    // Создаем коллекции если их нет
    const collections = [
      {
        name: 'suppliers',
        type: 'base',
        schema: [
          { name: 'name', type: 'text', required: true }
        ]
      },
      {
        name: 'warehouses',
        type: 'base',
        schema: [
          { name: 'name', type: 'text', required: true }
        ]
      },
      {
        name: 'products',
        type: 'base',
        schema: [
          { name: 'name', type: 'text', required: true },
          { name: 'article', type: 'text' },
          { name: 'barcode', type: 'text' },
          { name: 'price', type: 'number', required: true },
          { name: 'cost', type: 'number' }
        ]
      },
      {
        name: 'stocks',
        type: 'base',
        schema: [
          { name: 'product', type: 'relation', required: true, collectionId: 'products' },
          { name: 'warehouse', type: 'relation', required: true, collectionId: 'warehouses' },
          { name: 'quantity', type: 'number', required: true }
        ]
      },
      {
        name: 'documents',
        type: 'base',
        schema: [
          { name: 'type', type: 'text', required: true },
          { name: 'supplier', type: 'relation', required: true, collectionId: 'suppliers' },
          { name: 'warehouse', type: 'relation', required: true, collectionId: 'warehouses' },
          { name: 'date', type: 'date', required: true },
          { name: 'total_amount', type: 'number', required: true },
          { name: 'status', type: 'text', required: true }
        ]
      },
      {
        name: 'document_items',
        type: 'base',
        schema: [
          { name: 'document', type: 'relation', required: true, collectionId: 'documents' },
          { name: 'product', type: 'relation', required: true, collectionId: 'products' },
          { name: 'quantity', type: 'number', required: true },
          { name: 'cost', type: 'number', required: true }
        ]
      }
    ];
    
    for (const collection of collections) {
      try {
        await pb.collections.create(collection);
        console.log(`✅ Коллекция ${collection.name} создана`);
      } catch (e) {
        console.log(`ℹ️ Коллекция ${collection.name} уже существует`);
      }
    }
    
    // Добавляем тестовые данные
    await addTestData();
    
    console.log('✅ База данных настроена!');
    console.log('');
    console.log('📱 Админ-панель: http://localhost:8090/_/');
    console.log('🔐 Логин: admin@example.com');
    console.log('🔐 Пароль: admin123456');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

async function addTestData() {
  // Создаем поставщиков (города)
  const suppliers = [
    { name: 'Москва' },
    { name: 'Санкт-Петербург' },
    { name: 'Новосибирск' }
  ];
  
  for (const supplier of suppliers) {
    try {
      await pb.collection('suppliers').create(supplier);
    } catch (e) {}
  }
  
  // Создаем склады (магазины)
  const warehouses = [
    { name: 'Магазин Центральный' },
    { name: 'Магазин Северный' },
    { name: 'Магазин Южный' }
  ];
  
  for (const warehouse of warehouses) {
    try {
      await pb.collection('warehouses').create(warehouse);
    } catch (e) {}
  }
  
  // Создаем товары
  const products = [
    { name: 'Вино красное', article: 'W001', price: 1500, cost: 1000 },
    { name: 'Вино белое', article: 'W002', price: 1200, cost: 800 },
    { name: 'Водка', article: 'V001', price: 800, cost: 500 },
    { name: 'Коньяк', article: 'C001', price: 2000, cost: 1500 },
    { name: 'Шампанское', article: 'S001', price: 1800, cost: 1200 }
  ];
  
  for (const product of products) {
    try {
      await pb.collection('products').create(product);
    } catch (e) {}
  }
}

setupDatabase();
