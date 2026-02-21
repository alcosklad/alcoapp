import PocketBase from 'pocketbase';

const pb = new PocketBase('http://146.103.121.96:8090');

async function checkRelations() {
  try {
    await pb.admins.authWithPassword('admin@sklad.ru', 'admin123456');
    
    // Get all collections
    const collections = await pb.collections.getFullList();
    
    for (const collection of collections) {
      if (collection.schema) {
        for (const field of collection.schema) {
          if (field.type === 'relation') {
            const relCollection = collections.find(c => c.id === field.options.collectionId);
            if (relCollection && relCollection.name === 'products') {
              console.log(`Collection '${collection.name}' references 'products' in field '${field.name}'`);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkRelations();
