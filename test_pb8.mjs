import PocketBase from 'pocketbase';
const pb = new PocketBase("http://146.103.121.96:8090");
await pb.admins.authWithPassword("admin@nashsklad.store", "admin12345");

const filterId = "iyonqkscjkdwrvi,izl0ujjh2gsde42";
let stocksFilter = 'quantity > 0';
if (filterId) {
  const ids = filterId.split(',');
  const supplierConditions = ids.map(id => `supplier = "${id}"`).join(' || ');
  stocksFilter += ` && (${supplierConditions})`;
}
console.log('stocksFilter:', stocksFilter);
const stocks = await pb.collection('stocks').getFullList({
  filter: stocksFilter,
  expand: 'product,supplier'
}).catch(e => { console.error('Error:', e); return []; });

let totalStockQuantity = 0;
let totalPurchaseValue = 0;

stocks.forEach(stock => {
  const quantity = stock.quantity || 0;
  const costPrice = stock?.expand?.product?.cost || stock?.cost || 0;
  totalStockQuantity += quantity;
  totalPurchaseValue += costPrice * quantity;
});

console.log('Total products:', totalStockQuantity);
console.log('Total purchase value:', totalPurchaseValue);
