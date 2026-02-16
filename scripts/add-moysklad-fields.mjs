import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://146.103.121.96:8090';
const PB_ADMIN_EMAIL = 'admin@sklad.ru';
const PB_ADMIN_PASSWORD = '323282sssS';

async function addMoySkladFields() {
  console.log('🔧 Добавление полей moysklad_id в коллекции...\n');

  const pb = new PocketBase(POCKETBASE_URL);
  
  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✅ Авторизация успешна\n');
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error.message);
    process.exit(1);
  }

  // Инструкции для добавления полей вручную через админ-панель
  console.log('📋 ИНСТРУКЦИЯ ПО ДОБАВЛЕНИЮ ПОЛЕЙ:\n');
  console.log('1. Откройте админ-панель PocketBase: http://146.103.121.96:8090/_/');
  console.log('2. Войдите с учетными данными админа\n');
  
  console.log('3. Для коллекции "shifts":');
  console.log('   - Перейдите в Collections → shifts');
  console.log('   - Нажмите "Edit collection"');
  console.log('   - Добавьте новое поле:');
  console.log('     * Name: moysklad_id');
  console.log('     * Type: Text');
  console.log('     * Options: Max length = 255, Unique = true');
  console.log('   - Сохраните изменения\n');
  
  console.log('4. Для коллекции "orders":');
  console.log('   - Перейдите в Collections → orders');
  console.log('   - Нажмите "Edit collection"');
  console.log('   - Добавьте новое поле:');
  console.log('     * Name: moysklad_id');
  console.log('     * Type: Text');
  console.log('     * Options: Max length = 255, Unique = true');
  console.log('   - Сохраните изменения\n');
  
  console.log('5. После добавления полей запустите синхронизацию:');
  console.log('   node import-moysklad.mjs');
  console.log('   node import-moysklad-sales.mjs\n');
  
  console.log('═══════════════════════════════════════════');
  console.log('⚠️  ВАЖНО: Поля нужно добавить вручную через');
  console.log('    админ-панель PocketBase, так как API не');
  console.log('    позволяет изменять схему коллекций.');
  console.log('═══════════════════════════════════════════');
}

addMoySkladFields();
