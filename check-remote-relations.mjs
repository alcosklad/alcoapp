import PocketBase from 'pocketbase';

const pb = new PocketBase('http://146.103.121.96:8090');

async function check() {
  try {
    await pb.admins.authWithPassword('admin@sklad.ru', 'admin123456');
    const collections = await pb.collections.getFullList();
    
    for (const c of collections) {
      if (!c.schema) continue;
      for (const field of c.schema) {
        if (field.type === 'relation') {
          const target = collections.find(col => col.id === field.options.collectionId);
          if (target && target.name === 'products') {
            console.log(`Collection '${c.name}' references 'products' in field '${field.name}'. Cascade delete: ${field.options.cascadeDelete}`);
          }
        }
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}
check();
