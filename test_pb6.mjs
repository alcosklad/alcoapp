import fetch from 'node-fetch';
const filter = 'quantity > 0 && (supplier = "iyonqkscjkdwrvi" || supplier = "izl0ujjh2gsde42")';
const url = "http://146.103.121.96:8090/api/collections/stocks/records?filter=" + encodeURIComponent(filter);
console.log(url);
const r = await fetch(url);
const data = await r.json();
if (data.code >= 400) console.error("Error:", data);
else console.log('Found:', data.items?.length, 'Total:', data.totalItems);
