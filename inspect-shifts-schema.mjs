import PocketBase from 'pocketbase';
import { config } from 'dotenv';

config();

const POCKETBASE_URL = 'http://146.103.121.96:8090';
const PB_ADMIN_EMAIL = 'admin@nashsklad.store';
const PB_ADMIN_PASSWORD = 'admin12345';

async function main() {
  const pb = new PocketBase(POCKETBASE_URL);
  await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);

  const collection = await pb.collections.getOne('shifts');
  console.log(JSON.stringify(collection.schema, null, 2));
}

main().catch(console.error);
