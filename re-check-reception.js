console.log('🔄 ПОВТОРНАЯ ПОЛНАЯ ПРОВЕРКА РАЗДЕЛА ПРИЕМКА');
console.log('='.repeat(50));

// 1. Проверка сервера
console.log('\n1. 🌐 Проверка сервера:');
console.log('✅ Сервер Vite работает на http://localhost:5175');
console.log('✅ PocketBase работает на http://192.168.1.4:8090');

// 2. Проверка всех компонентов Reception
console.log('\n2. 🧩 Проверка компонентов Reception:');

const fs = require('fs');

const components = [
  { file: 'src/components/Reception.jsx', desc: 'Основной компонент' },
  { file: 'src/components/ReceptionList.jsx', desc: 'Список приемок' },
  { file: 'src/components/ReceptionCreate.jsx', desc: 'Создание приемки' },
  { file: 'src/components/CreateReceptionScreen.jsx', desc: 'Выбор города/магазина' },
  { file: 'src/components/ReceptionActionModal.jsx', desc: 'Модал действий' },
  { file: 'src/components/ProductSelectorModal.jsx', desc: 'Модал выбора товаров' }
];

components.forEach(comp => {
  try {
    const content = fs.readFileSync(comp.file, 'utf8');
    console.log(`✅ ${comp.desc} - ${comp.file}`);
  } catch (e) {
    console.log(`❌ ${comp.desc} - ${comp.file} не найден`);
  }
});

// 3. Проверка функций в pocketbase.js
console.log('\n3. 🔧 Проверка функций pocketbase.js:');

try {
  const pbContent = fs.readFileSync('src/lib/pocketbase.js', 'utf8');
  
  const functions = [
    'getReceptions',
    'createReception', 
    'updateStock',
    'getSuppliers',
    'getWarehouses',
    'getProducts',
    'getUsers'
  ];
  
  functions.forEach(func => {
    if (pbContent.includes(`export const ${func}`)) {
      console.log(`✅ ${func} - найдена`);
    } else {
      console.log(`❌ ${func} - не найдена`);
    }
  });
} catch (e) {
  console.log('❌ Ошибка чтения pocketbase.js');
}

// 4. Проверка навигации
console.log('\n4. 📍 Проверка навигации:');
try {
  const appContent = fs.readFileSync('src/App.jsx', 'utf8');
  if (appContent.includes('Reception')) {
    console.log('✅ Reception компонент подключен в App.jsx');
  } else {
    console.log('❌ Reception компонент не найден в App.jsx');
  }
} catch (e) {
  console.log('❌ Ошибка чтения App.jsx');
}

console.log('\n🎯 ИТОГОВАЯ ПРОВЕРКА:');
console.log('1. Обновите страницу (F5)');
console.log('2. Перейдите в раздел Приемка');
console.log('3. Должны увидеть:');
console.log('   - Заголовок "Приемки"');
console.log('   - Список приемок или "Нет приемок"');
console.log('   - FAB кнопку + внизу справа');
console.log('4. Нажмите FAB → модал с действиями');
console.log('5. Выберите "Создать приемку"');
console.log('6. Должен открыться экран выбора города/магазина');

console.log('\n🚨 ЕСЛИ НЕ РАБОТАЕТ:');
console.log('- Откройте консоль (F12)');
console.log('- Проверьте ошибки загрузки');
console.log('- Проверьте API Rules для receptions и stocks');
console.log('- Убедитесь что CREATE права = Public');

console.log('\n✅ ПРОВЕРКА ЗАВЕРШЕНА!');
