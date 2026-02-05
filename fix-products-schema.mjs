import PocketBase from 'pocketbase';

const SERVER_URL = 'http://146.103.121.96:8090';
const ADMIN_EMAIL = 'admin@sklad.ru';
const ADMIN_PASSWORD = '326052sssS';

async function fixSchema() {
  console.log('🔧 Подключаемся к серверу для обновления схемы...');
  const pb = new PocketBase(SERVER_URL);
  
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Авторизация успешна');
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error.message);
    process.exit(1);
  }
  
  console.log('\n📋 Текущая схема коллекции products:');
  try {
    const collections = await pb.collections.getFullList();
    const productsCollection = collections.find(c => c.name === 'products');
    
    if (productsCollection) {
      console.log('✅ Коллекция products найдена');
      console.log('Поля:', productsCollection.schema.map(f => `${f.name} (${f.type})`).join(', '));
      
      // Проверяем есть ли поле cities
      const hasCitiesField = productsCollection.schema.some(f => f.name === 'cities');
      
      if (!hasCitiesField) {
        console.log('\n⚠️  Поле cities отсутствует, добавляем...');
        
        // Добавляем поле cities
        productsCollection.schema.push({
          name: 'cities',
          type: 'select',
          required: false,
          options: {
            maxSelect: 20,
            values: [
              'Пермь',
              'Екатеринбург',
              'Иркутск',
              'Казань',
              'Калининград',
              'Красноярск',
              'Краснодар',
              'Москва',
              'Мурманск',
              'Нижний Новгород',
              'Новосибирск',
              'Омск',
              'Самара',
              'Саратов',
              'Сочи',
              'Санкт-Петербург',
              'Сургут',
              'Уфа',
              'Волгоград',
              'Воронеж'
            ]
          }
        });
        
        await pb.collections.update(productsCollection.id, {
          schema: productsCollection.schema
        });
        
        console.log('✅ Поле cities успешно добавлено!');
      } else {
        console.log('✅ Поле cities уже существует');
      }
    } else {
      console.log('❌ Коллекция products не найдена!');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

fixSchema();
