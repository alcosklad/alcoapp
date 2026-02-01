import PocketBase from 'pocketbase';

const pb = new PocketBase('http://146.103.121.96:8090');

async function setupShifts() {
  try {
    // Авторизация как админ
    await pb.admins.authWithPassword('rostislavkomkov@gmail.com', 'Rostik230399');
    console.log('✅ Авторизация успешна');

    // 1. Добавляем поле timezone в коллекцию users
    try {
      const usersCollection = await pb.collections.getOne('users');
      const existingField = usersCollection.schema.find(field => field.name === 'timezone');
      
      if (!existingField) {
        await pb.collections.update('users', {
          name: usersCollection.name,
          type: usersCollection.type,
          schema: [
            ...usersCollection.schema,
            {
              name: 'timezone',
              type: 'text',
              required: false,
              options: {
                max: 50
              }
            }
          ]
        });
        console.log('✅ Поле timezone добавлено в users');
      } else {
        console.log('✅ Поле timezone уже существует в users');
      }
    } catch (err) {
      console.log('⚠️ Ошибка при добавлении timezone:', err.message);
    }

    // 2. Создаем коллекцию shifts
    try {
      await pb.collections.create({
        name: 'shifts',
        type: 'base',
        schema: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            options: {
              collectionId: '_pb_users_auth_',
              maxSelect: 1,
              minSelect: 1
            }
          },
          {
            name: 'start',
            type: 'text',
            required: true,
            options: {
              max: 100
            }
          },
          {
            name: 'end',
            type: 'text',
            required: false,
            options: {
              max: 100
            }
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            options: {
              values: ['active', 'closed']
            }
          },
          {
            name: 'totalAmount',
            type: 'number',
            required: false
          },
          {
            name: 'totalItems',
            type: 'number',
            required: false
          },
          {
            name: 'sales',
            type: 'json',
            required: false
          }
        ]
      });
      console.log('✅ Коллекция shifts создана');
    } catch (err) {
      console.log('⚠️ Коллекция shifts уже существует');
    }

    // 3. Устанавливаем часовые пояса для существующих пользователей
    const users = await pb.collection('users').getFullList();
    const cityTimezones = {
      'Москва': 'Europe/Moscow',
      'Калининград': 'Europe/Kaliningrad',
      'Самара': 'Europe/Samara',
      'Уфа': 'Asia/Yekaterinburg',
      'Омск': 'Asia/Omsk',
      'Новосибирск': 'Asia/Novosibirsk',
      'Красноярск': 'Asia/Krasnoyarsk',
      'Иркутск': 'Asia/Irkutsk',
      'Якутск': 'Asia/Yakutsk',
      'Владивосток': 'Asia/Vladivostok',
      'Магадан': 'Asia/Magadan',
      'Сахалин': 'Asia/Sakhalin',
      'Камчатка': 'Asia/Kamchatka',
      'Сургут': 'Asia/Yekaterinburg',
      'Сочи': 'Europe/Moscow',
      'Краснодар': 'Europe/Moscow',
      'Мурманск': 'Europe/Moscow',
      'Пермь': 'Asia/Yekaterinburg'
    };

    for (const user of users) {
      if (user.city && cityTimezones[user.city] && !user.timezone) {
        await pb.collection('users').update(user.id, {
          timezone: cityTimezones[user.city]
        });
        console.log(`✅ Установлен часовой пояс для ${user.email}: ${cityTimezones[user.city]}`);
      }
    }

    console.log('\n✅ Настройка завершена!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

setupShifts();
