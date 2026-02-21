import pb from './src/lib/pocketbase.js';

async function test() {
  const filterId = "iyonqkscjkdwrvi,izl0ujjh2gsde42";
  const ids = filterId.split(',');
  const supplierConditions = ids.map(id => `supplier = "${id}"`).join(' || ');
  const filter = `quantity > 0 && (${supplierConditions})`;
  console.log('Filter:', filter);
  try {
    const res = await pb.collection('stocks').getFullList({ filter });
    console.log('Found:', res.length);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
