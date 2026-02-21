const url = "http://127.0.0.1:8090/api/collections/stocks/records?filter=" + encodeURIComponent('quantity > 0 && (supplier = "iyonqkscjkdwrvi" || supplier = "izl0ujjh2gsde42")');
fetch(url)
  .then(r => r.json())
  .then(data => console.log('Found:', data.items?.length, 'Total:', data.totalItems))
  .catch(e => console.error(e));
