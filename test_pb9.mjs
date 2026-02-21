import pb from './src/lib/pocketbase.js';

async function test() {
  const { getDashboardStats } = await import('./src/lib/pocketbase.js');
  const res = await getDashboardStats("iyonqkscjkdwrvi,izl0ujjh2gsde42");
  console.log("Total products:", res.totalProducts);
  console.log("Purchase value:", res.totalPurchaseValue);
}
test();
