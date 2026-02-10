// Скрипт для заполнения подкатегорий товаров в PocketBase
// Запускать на сервере: node scripts/fill-subcategories.js

const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = 'http://127.0.0.1:8090';

// Правила определения подкатегории по названию товара
const SUBCATEGORY_RULES = [
  { name: 'Экстра Драй', test: (n) => /экстра\s*драй|extra\s*dry/i.test(n) },
  { name: 'Брют', test: (n) => /брют|brut/i.test(n) },
  { name: 'Просекко', test: (n) => /просекко|prosecco/i.test(n) },
  { name: 'Асти', test: (n) => /асти|asti/i.test(n) },
  { name: 'Кагор', test: (n) => /кагор/i.test(n) },
  { name: 'Настойки', test: (n) => /настойк/i.test(n) },
  { name: 'Розовое', test: (n) => /розов/i.test(n) },
  { name: 'Красное полусладкое', test: (n) => /красн/i.test(n) && /полусладк/i.test(n) },
  { name: 'Красное полусухое', test: (n) => /красн/i.test(n) && /полусух/i.test(n) },
  { name: 'Красное сладкое', test: (n) => /красн/i.test(n) && /сладк/i.test(n) },
  { name: 'Красное сухое', test: (n) => /красн/i.test(n) && /сух/i.test(n) },
  { name: 'Белое полусладкое', test: (n) => /бел/i.test(n) && /полусладк/i.test(n) },
  { name: 'Белое полусухое', test: (n) => /бел/i.test(n) && /полусух/i.test(n) },
  { name: 'Белое сладкое', test: (n) => /бел/i.test(n) && /сладк/i.test(n) },
  { name: 'Белое сухое', test: (n) => /бел/i.test(n) && /сух/i.test(n) },
  { name: 'Полусладкое', test: (n) => /полусладк/i.test(n) },
  { name: 'Полусухое', test: (n) => /полусух/i.test(n) },
  { name: 'Сладкое', test: (n) => /сладк/i.test(n) && !/полусладк/i.test(n) },
  { name: 'Сухое', test: (n) => /сух/i.test(n) && !/полусух/i.test(n) },
];

function detectSubcategory(name) {
  if (!name) return '';
  for (const rule of SUBCATEGORY_RULES) {
    if (rule.test(name)) return rule.name;
  }
  return '';
}

async function main() {
  const pb = new PocketBase(POCKETBASE_URL);

  // Авторизация как admin
  // ЗАМЕНИ email и password на свои admin-данные PocketBase
  await pb.admins.authWithPassword('ADMIN_EMAIL', 'ADMIN_PASSWORD');

  console.log('Загружаю все товары...');
  const products = await pb.collection('products').getFullList({ sort: 'name' });
  console.log(`Найдено ${products.length} товаров`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const sub = detectSubcategory(product.name);
    if (sub) {
      try {
        await pb.collection('products').update(product.id, { subcategory: sub });
        console.log(`  ✅ ${product.name} → ${sub}`);
        updated++;
      } catch (e) {
        console.error(`  ❌ Ошибка для ${product.name}:`, e.message);
      }
    } else {
      console.log(`  ⏭ ${product.name} → (не определено)`);
      skipped++;
    }
  }

  console.log(`\nГотово! Обновлено: ${updated}, пропущено: ${skipped}`);
}

main().catch(console.error);
