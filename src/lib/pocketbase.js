import PocketBase from 'pocketbase';

// Определяем URL в зависимости от окружения
let pbUrl = import.meta.env.VITE_POCKETBASE_URL;

if (!pbUrl) {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isLocalNetwork = window.location.hostname.startsWith('192.168.') || 
                         window.location.hostname.startsWith('10.') ||
                         window.location.hostname.startsWith('172.');
  const isHTTPS = window.location.protocol === 'https:';

  if (isLocalhost) {
    pbUrl = 'http://localhost:8090';
  } else if (isLocalNetwork) {
    pbUrl = 'http://192.168.1.4:8090';
  } else if (isHTTPS) {
    // На HTTPS используем тот же origin — запросы пойдут через Vite proxy
    // /api/* → http://127.0.0.1:8090/api/*  (без mixed content)
    pbUrl = window.location.origin;
  } else {
    pbUrl = 'http://146.103.121.96:8090';
  }
}

const pb = new PocketBase(pbUrl);

// Отключаем автоотмену запросов для мобильных устройств
pb.autoCancellation(false);

// Логирование только в dev режиме
if (import.meta.env.DEV) {
  console.log('PocketBase: URL сервера:', pb.baseUrl);
  console.log('PocketBase: Протокол страницы:', window.location.protocol);
  console.log('PocketBase: Хост страницы:', window.location.host);
  console.log('PocketBase: Auth state:', pb.authStore.isValid);
  pb.beforeSend = function(url, options) {
    console.log('PocketBase Request:', url);
    return { url, options };
  };
}

// Функции для работы с поставщиками
export const getSuppliers = async () => {
  try {
    const records = await pb.collection('suppliers').getFullList({
      sort: 'name'
    });
    return records;
  } catch (error) {
    console.error('PocketBase: Error loading suppliers:', error);
    return [];
  }
};

// Функции для работы с магазинами
export const getStores = async () => {
  try {
    const stores = await pb.collection('stores').getFullList({
      sort: 'name'
    });
    return stores;
  } catch (error) {
    console.error('PocketBase: Error loading stores:', error);
    return [];
  }
};

// Функции для работы со складами
export const getWarehouses = async () => {
  try {
    const records = await pb.collection('warehouses').getFullList({
      sort: 'name'
    });
    return records;
  } catch (error) {
    console.error('PocketBase: Error loading warehouses:', error);
    return [];
  }
};

// Проверка API Rules
export const checkApiRules = async () => {
  try {
    const suppliersTest = await pb.collection('suppliers').getFirstListItem('').catch(e => ({ error: e.message }));
    const warehousesTest = await pb.collection('warehouses').getFirstListItem('').catch(e => ({ error: e.message }));
    const productsTest = await pb.collection('products').getFirstListItem('').catch(e => ({ error: e.message }));
    if (import.meta.env.DEV) {
      console.log('Suppliers test:', suppliersTest);
      console.log('Warehouses test:', warehousesTest);
      console.log('Products test:', productsTest);
    }
  } catch (error) {
    console.error('API Rules check error:', error);
  }
};

// Функции для работы с пользователями
export const getUsers = async () => {
  try {
    return await pb.collection('users').getFullList({
      sort: 'name'
    });
  } catch (error) {
    console.error('PocketBase: Error loading users:', error);
    return [];
  }
};

// Функции для работы с товарами
export const getProducts = async (search = '') => {
  try {
    const allProducts = await pb.collection('products').getFullList({
      sort: 'name'
    });
    
    if (!search) {
      return allProducts;
    }
    
    // Фильтруем на клиенте без учета регистра
    const searchLower = search.toLowerCase();
    return allProducts.filter(product => {
      const name = product?.name || '';
      return name.toLowerCase().includes(searchLower);
    });
  } catch (error) {
    console.error('PocketBase: Error loading products:', error);
    return [];
  }
};

export const createProduct = async (data) => {
  try {
    const result = await pb.collection('products').create(data);
    return result;
  } catch (error) {
    console.error('PocketBase: Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id, data) => {
  try {
    const result = await pb.collection('products').update(id, data);
    return result;
  } catch (error) {
    console.error('PocketBase: Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id) => {
  try {
    await pb.collection('products').delete(id);
    return true;
  } catch (error) {
    console.error('PocketBase: Error deleting product:', error);
    throw error;
  }
};

// CRUD для stocks (раздел Остатки)
export const createStockRecord = async (data) => {
  try {
    return await pb.collection('stocks').create(data);
  } catch (error) {
    console.error('PocketBase: Error creating stock record:', error);
    throw error;
  }
};

export const updateStockRecord = async (id, data) => {
  try {
    return await pb.collection('stocks').update(id, data);
  } catch (error) {
    console.error('PocketBase: Error updating stock record:', error);
    throw error;
  }
};

export const deleteStockRecord = async (id) => {
  try {
    await pb.collection('stocks').delete(id);
    return true;
  } catch (error) {
    console.error('PocketBase: Error deleting stock record:', error);
    throw error;
  }
};

export const getStocksForProduct = async (productId) => {
  try {
    return await pb.collection('stocks').getFullList({
      filter: `product = "${productId}"`,
      expand: 'supplier'
    });
  } catch (error) {
    console.error('PocketBase: Error loading stocks for product:', error);
    return [];
  }
};

// Функции для работы с приемками
export const createReception = async (data) => {
  try {
    // Импортируем функцию генерации batch_number
    const { generateBatchNumber } = await import('./orderNumbers.js');
    
    // Рассчитываем суммы
    let totalPurchaseValue = 0;
    let totalSaleValue = 0;
    
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach(item => {
        const purchasePrice = item.cost || item.purchase_price || 0;
        const salePrice = item.sale_price || item.price || 0;
        const quantity = item.quantity || 0;
        
        totalPurchaseValue += purchasePrice * quantity;
        totalSaleValue += salePrice * quantity;
      });
    }
    
    // Генерируем batch_number для этой приемки
    const supplierData = await pb.collection('suppliers').getOne(data.supplier).catch(() => null);
    const cityName = supplierData?.name || 'Unknown';
    const batchNumber = await generateBatchNumber(cityName);
    
    // Добавляем суммы и batch_number в данные приемки
    const receptionData = {
      ...data,
      total_amount: totalPurchaseValue,  
      total_sale: totalSaleValue,
      batch_number: batchNumber
    };
    
    const result = await pb.collection('receptions').create(receptionData);
    
    // Создаем партии товаров (вместо обновления агрегированных остатков)
    if (data.items && data.supplier) {
      const receptionDate = new Date().toISOString();
      
      for (const item of data.items) {
        const purchasePrice = item.cost ?? item.purchase_price ?? 0;
        
        // Создаем новую партию для каждого товара
        await pb.collection('stocks').create({
          product: item.product,
          supplier: data.supplier,
          quantity: item.quantity,
          cost: purchasePrice,
          cost_per_unit: purchasePrice,
          reception_id: result.id,
          reception_date: receptionDate,
          batch_number: batchNumber
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('PocketBase: Error creating reception:', error);
    if (error.data) {
      console.error('PocketBase: Error data:', JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
};

// Функция для обновления остатков
export const updateStock = async (productId, warehouseId, quantity, supplierId = null, cost = null) => {
  try {
    // Строим фильтр для поиска существующего остатка
    const filterParts = [`product = "${productId}"`];
    if (supplierId) {
      filterParts.push(`supplier = "${supplierId}"`);
    }
    if (warehouseId) {
      filterParts.push(`warehouse = "${warehouseId}"`);
    }
    const filterQuery = filterParts.join(' && ');
    
    const existingStock = await pb.collection('stocks').getFirstListItem(
      filterQuery
    ).catch(() => null);
    
    if (existingStock) {
      // Проверяем что не уходим в минус при продаже
      const newQuantity = existingStock.quantity + quantity;
      if (newQuantity < 0) {
        throw new Error('Нельзя продать больше чем есть в наличии');
      }
      
      // Обновляем существующий остаток
      const updateData = { quantity: newQuantity };
      
      // Если передали закупочную цену (обычно из приёмки) — сохраняем её в остатке
      if (cost !== null && cost !== undefined) {
        updateData.cost = Number(cost);
      }

      // Если передан supplierId, обновляем и его
      if (supplierId) {
        updateData.supplier = supplierId;
      }
      
      // Если количество стало 0, удаляем остаток
      if (newQuantity === 0) {
        await pb.collection('stocks').delete(existingStock.id);
      } else {
        try {
          await pb.collection('stocks').update(existingStock.id, updateData);
        } catch (e) {
          if (cost !== null && cost !== undefined) {
            const fallbackData = { ...updateData };
            delete fallbackData.cost;
            fallbackData.purchase_price = Number(cost);
            await pb.collection('stocks').update(existingStock.id, fallbackData);
          } else {
            throw e;
          }
        }
      }
    } else {
      // Создаем новую запись остатка (только для положительного количества)
      if (quantity <= 0) {
        throw new Error('Нельзя создать остаток с отрицательным количеством');
      }
      
      const newStockData = {
        product: productId,
        supplier: supplierId,
        quantity: quantity
      };

      if (warehouseId) {
        newStockData.warehouse = warehouseId;
      }

      if (cost !== null && cost !== undefined) {
        newStockData.cost = Number(cost);
      }
      
      try {
        await pb.collection('stocks').create(newStockData);
      } catch (e) {
        if (cost !== null && cost !== undefined) {
          const fallbackData = { ...newStockData };
          delete fallbackData.cost;
          fallbackData.purchase_price = Number(cost);
          await pb.collection('stocks').create(fallbackData);
        } else {
          throw e;
        }
      }
    }
  } catch (error) {
    console.error('PocketBase: Error updating stock:', error);
    throw error;
  }
};

// Получение остатков с расширением
export const getStocksWithDetails = async (supplierId = null) => {
  try {
    const filter = supplierId ? `supplier = "${supplierId}"` : '';
    const stocks = await pb.collection('stocks').getFullList({
      filter,
      expand: 'product,warehouse,supplier'
    });
    return stocks;
  } catch (error) {
    console.error('PocketBase: Error loading stocks:', error);
    return [];
  }
};

// Получение всех остатков с агрегацией по product_id (глобальный контекст)
export const getStocksAggregated = async (supplierId = null) => {
  try {
    const filterParts = ['quantity > 0'];
    if (supplierId) filterParts.push(`supplier = "${supplierId}"`);
    const stocks = await pb.collection('stocks').getFullList({
      filter: filterParts.join(' && '),
      expand: 'product,supplier'
    });

    // Агрегация: SUM(quantity) GROUP BY product_id
    const grouped = {};
    stocks.forEach(stock => {
      const productId = stock.product;
      const qty = Number(stock.quantity) || 0;
      if (qty <= 0) return;

      if (!grouped[productId]) {
        grouped[productId] = {
          ...stock,
          quantity: 0,
          _cityBreakdown: [],
          _stockRecordIds: [],
        };
      }
      grouped[productId].quantity += qty;
      grouped[productId]._stockRecordIds.push(stock.id);

      const supplierKey = stock.supplier || '';
      const existingCity = grouped[productId]._cityBreakdown.find((c) => c.supplierId === supplierKey);
      if (existingCity) {
        existingCity.quantity += qty;
      } else {
        grouped[productId]._cityBreakdown.push({
          supplierName: stock.expand?.supplier?.name || '—',
          supplierId: supplierKey,
          quantity: qty,
        });
      }
    });

    return Object.values(grouped).map((row) => ({
      ...row,
      _cityBreakdown: (row._cityBreakdown || []).sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0)),
    }));
  } catch (error) {
    console.error('PocketBase: Error loading aggregated stocks:', error);
    return [];
  }
};

// Функции для работы с документами (для совместимости)
export const getDocuments = async (type = 'reception') => {
  try {
    return await pb.collection('receptions').getFullList({
      expand: 'supplier,warehouse',
      sort: '-date'
    });
  } catch (error) {
    console.error('Error loading documents:', error);
    return [];
  }
};

// Получение приемок
export const getReceptions = async () => {
  try {
    return await pb.collection('receptions').getFullList({
      expand: 'supplier,warehouse',
      sort: '-date'
    });
  } catch (error) {
    console.error('Error loading receptions:', error);
    return [];
  }
};

// Получение истории приёмок для конкретного товара (старая версия - используется новая в конце файла)

export const createDocument = async (data) => {
  try {
    return await pb.collection('documents').create(data);
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
};

export const updateDocument = async (id, data) => {
  try {
    return await pb.collection('documents').update(id, data);
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

// Функции для работы с позициями документов
export const getDocumentItems = async (documentId) => {
  try {
    return await pb.collection('document_items').getFullList({
      filter: `document = "${documentId}"`,
      expand: 'product'
    });
  } catch (error) {
    console.error('Error loading document items:', error);
    return [];
  }
};

export const createDocumentItem = async (data) => {
  try {
    return await pb.collection('document_items').create(data);
  } catch (error) {
    console.error('Error creating document item:', error);
    throw error;
  }
};

export const createDocumentItems = async (items) => {
  try {
    return await Promise.all(items.map(item => createDocumentItem(item)));
  } catch (error) {
    console.error('Error creating document items:', error);
    throw error;
  }
};

// Функции для работы с остатками
export const getStocks = async (warehouseId = null) => {
  try {
    const filter = warehouseId ? `warehouse = "${warehouseId}"` : '';
    const stocks = await pb.collection('stocks').getFullList({
      filter,
      expand: 'product,warehouse'
    });
    
    // Объединяем с товарами
    return stocks.map(stock => ({
      ...stock,
      product: stock.expand?.product,
      warehouse: stock.expand?.warehouse
    }));
  } catch (error) {
    console.error('Error loading stocks:', error);
    return [];
  }
};

// Получение статистики продаж за период (из orders)
export const getSalesStats = async (period = 'day', filterId = null) => {
  try {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'halfyear':
        startDate.setMonth(now.getMonth() - 6);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }
    
    let filter = `created >= "${startDate.toISOString()}"`;
    if (filterId) {
      const ids = filterId.split(',');
      const supplierConditions = ids.map(id => `user.supplier = "${id}"`).join(' || ');
      filter += ` && (${supplierConditions})`;
    }
    
    const orders = await pb.collection('orders').getFullList({
      filter,
      sort: '-created'
    }).catch(() => []);
    
    return {
      count: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + (order.total || 0), 0)
    };
  } catch (error) {
    console.error('PocketBase: Error loading sales stats:', error);
    return { count: 0, totalAmount: 0 };
  }
};

// Получение статистики для дашборда
export const getDashboardStats = async (filterId = null) => {
  try {
    let stocksFilter = 'quantity > 0';
    if (filterId) {
      const ids = filterId.split(',');
      const supplierConditions = ids.map(id => `supplier = "${id}"`).join(' || ');
      stocksFilter += ` && (${supplierConditions})`;
    }
    
    const stocks = await pb.collection('stocks').getFullList({
      filter: stocksFilter,
      expand: 'product,supplier'
    }).catch(() => []);
    
    let totalStockQuantity = 0;
    let totalSaleValue = 0;
    let totalPurchaseValue = 0;
    
    // Группируем остатки по supplier для модалки
    const stockBySupplier = {};
    
    stocks.forEach(stock => {
      const quantity = stock.quantity || 0;
      const salePrice = stock?.expand?.product?.price || 0;
      const costPrice = stock?.expand?.product?.cost || stock?.cost || 0;
      
      totalStockQuantity += quantity;
      totalSaleValue += salePrice * quantity;
      totalPurchaseValue += costPrice * quantity;
      
      // Группируем по городу (supplier)
      const supplierName = stock?.expand?.supplier?.name || 'Без города';
      if (!stockBySupplier[supplierName]) {
        stockBySupplier[supplierName] = { name: supplierName, count: 0, saleValue: 0, purchaseValue: 0 };
      }
      stockBySupplier[supplierName].count += quantity;
      stockBySupplier[supplierName].saleValue += salePrice * quantity;
      stockBySupplier[supplierName].purchaseValue += costPrice * quantity;
    });
    
    const stockBreakdown = Object.values(stockBySupplier).sort((a, b) => b.count - a.count);
    
    // Получаем приемки для подсчета количества
    let receptionsFilter = '';
    if (filterId) {
      const ids = filterId.split(',');
      receptionsFilter = ids.map(id => `supplier = "${id}"`).join(' || ');
    }
    
    const receptions = await pb.collection('receptions').getFullList({
      filter: receptionsFilter,
      expand: 'supplier,warehouse'
    }).catch(() => []);
    
    let receptionsCount = receptions.length;
    
    // Получаем товары с долгим сроком хранения (неликвид)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentOrders = await pb.collection('orders').getFullList({
      filter: `created >= "${thirtyDaysAgo.toISOString()}"`,
      sort: '-created'
    }).catch(() => []);
    
    // Находим товары, которые не продавались больше 30 дней
    const soldProductIds = new Set();
    recentOrders.forEach(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach(item => {
        if (item.productId) soldProductIds.add(item.productId);
        if (item.product) soldProductIds.add(item.product);
      });
    });
    
    // Группируем неликвид по product_id с разбивкой по городам
    const staleByProduct = {};
    stocks.forEach(stock => {
      if (stock.quantity > 0 && !soldProductIds.has(stock.product)) {
        if (!staleByProduct[stock.product]) {
          staleByProduct[stock.product] = {
            ...stock,
            quantity: 0,
            _cityBreakdown: [],
          };
        }
        staleByProduct[stock.product].quantity += stock.quantity || 0;
        staleByProduct[stock.product]._cityBreakdown.push({
          supplierName: stock.expand?.supplier?.name || '—',
          quantity: stock.quantity || 0,
        });
      }
    });
    const staleProducts = Object.values(staleByProduct);
    
    // Получаем статистику продаж за разные периоды (параллельно)
    const [salesDay, salesWeek, salesMonth, salesHalfYear] = await Promise.all([
      getSalesStats('day', filterId),
      getSalesStats('week', filterId),
      getSalesStats('month', filterId),
      getSalesStats('halfyear', filterId)
    ]);
    
    return {
      totalProducts: totalStockQuantity,
      totalSaleValue,
      totalPurchaseValue,
      stockBreakdown,
      receptionsCount,
      staleProductsCount: staleProducts.length,
      staleProducts: staleProducts.slice(0, 10),
      salesDay,
      salesWeek,
      salesMonth,
      salesHalfYear
    };
  } catch (error) {
    console.error('PocketBase: Error loading dashboard stats:', error);
    return {
      totalProducts: 0,
      totalSaleValue: 0,
      totalPurchaseValue: 0,
      stockBreakdown: [],
      receptionsCount: 0,
      staleProductsCount: 0,
      staleProducts: [],
      salesDay: { count: 0, totalAmount: 0 },
      salesWeek: { count: 0, totalAmount: 0 },
      salesMonth: { count: 0, totalAmount: 0 },
      salesHalfYear: { count: 0, totalAmount: 0 }
    };
  }
};

// Обновление приемки
export const updateReception = async (id, data) => {
  try {
    // Получаем старую версию приёмки
    const oldReception = await pb.collection('receptions').getOne(id);
    
    // Обновляем приёмку
    const result = await pb.collection('receptions').update(id, data);
    
    // Синхронизируем остатки с приёмкой
    if (data.items && oldReception.supplier) {
      for (const item of data.items) {
        const filterQuery = `product = "${item.product}" && supplier = "${oldReception.supplier}"`;
        
        try {
          // Ищем существующую запись
          const existingStock = await pb.collection('stocks').getFirstListItem(filterQuery).catch(() => null);
          
          if (existingStock) {
            // Обновляем существующий остаток - устанавливаем точное значение
            const purchasePrice = item.cost ?? item.purchase_price ?? existingStock.cost;
            const salePrice = item.sale_price || item.price || existingStock.price;
            const updateData = {
              quantity: item.quantity,
              cost: purchasePrice,
              price: salePrice
            };
            try {
              await pb.collection('stocks').update(existingStock.id, updateData);
            } catch (e) {
              if (purchasePrice !== null && purchasePrice !== undefined) {
                const fallbackData = {
                  quantity: item.quantity,
                  purchase_price: purchasePrice,
                  price: salePrice
                };
                await pb.collection('stocks').update(existingStock.id, fallbackData);
              } else {
                throw e;
              }
            }
          } else {
            // Создаём новый остаток
            const purchasePrice = item.cost ?? item.purchase_price ?? 0;
            const salePrice = item.sale_price || item.price || 0;
            const createData = {
              product: item.product,
              supplier: oldReception.supplier,
              quantity: item.quantity,
              cost: purchasePrice,
              price: salePrice
            };
            try {
              await pb.collection('stocks').create(createData);
            } catch (e) {
              const fallbackData = {
                product: item.product,
                supplier: oldReception.supplier,
                quantity: item.quantity,
                purchase_price: purchasePrice,
                price: salePrice
              };
              await pb.collection('stocks').create(fallbackData);
            }
          }
        } catch (error) {
          console.error(`PocketBase: Ошибка синхронизации товара ${item.product}:`, error);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('PocketBase: Error updating reception:', error);
    throw error;
  }
};

// Удаление приемки (с откатом остатков)
export const deleteReception = async (id, options = {}) => {
  const { deleteStock = true } = options;
  try {
    const reception = await pb.collection('receptions').getOne(id);
    
    if (deleteStock && reception.items && Array.isArray(reception.items) && reception.supplier) {
      for (const item of reception.items) {
        if (item.product && item.quantity) {
          try {
            await updateStock(item.product, null, -(item.quantity), reception.supplier);
          } catch (e) {
            console.warn('deleteReception: не удалось откатить остаток для', item.product, e);
          }
        }
      }
    }
    
    await pb.collection('receptions').delete(id);
  } catch (error) {
    console.error('PocketBase: Error deleting reception:', error);
    throw error;
  }
};

// Получение всех заказов
export const getOrders = async () => {
  try {
    const orders = await pb.collection('orders').getFullList({
      filter: `user = "${pb.authStore.model?.id}"`,
      sort: '-created',
      expand: 'user'
    });
    return orders;
  } catch (error) {
    console.error('PocketBase: Error loading orders:', error);
    throw error;
  }
};

// Создание заказа
export const createOrder = async (orderData) => {
  try {
    // Конвертируем paymentMethod в правильное значение
    let paymentMethodValue = "0"; // по умолчанию наличные
    if (orderData.paymentMethod === 'transfer') {
      paymentMethodValue = "1";
    } else if (orderData.paymentMethod === 'prepaid') {
      paymentMethodValue = "2";
    }
    
    // Для скидки: если тип percentage, сохраняем значение процента, иначе сумму в рублях
    const discountValue = orderData.discountType === 'percentage' 
      ? parseFloat(orderData.discountValue) || 0
      : orderData.discount;
    
    // Получаем город пользователя из supplier
    let cityName = '';
    try {
      const userModel = pb.authStore.model;
      if (userModel?.supplier) {
        const supplier = await pb.collection('suppliers').getOne(userModel.supplier).catch(() => null);
        if (supplier) cityName = supplier.name || '';
      }
    } catch (_) {}
    
    // Формируем данные для сохранения
    const data = {
      user: pb.authStore.model?.id,
      items: orderData.items,
      subtotal: orderData.subtotal,
      discount: discountValue,
      discount_type: orderData.discountType,
      discount_value: orderData.discountValue || '',
      total: orderData.total,
      payment_method: paymentMethodValue,
      local_time: orderData.localTime,
      created_date: new Date().toISOString(),
      city: orderData.city || cityName,
      order_number: orderData.order_number || '',
      supplier: orderData.supplier || '',
      city_code: orderData.city_code || '',
      cost_total: orderData.cost_total || 0,
      profit: orderData.profit || 0,
    };
    
    const result = await pb.collection('orders').create(data);
    return result;
  } catch (error) {
    console.error('PocketBase: Error creating order:', error);
    throw error;
  }
};

// Создание продажи
export const createSale = async (saleData) => {
  try {
    const record = await pb.collection('sales').create(saleData);
    return record;
  } catch (error) {
    console.error('PocketBase: Error creating sale:', error);
    throw error;
  }
};

// Получение продаж (из orders)
export const getSales = async (filters = {}) => {
  try {
    const records = await pb.collection('orders').getFullList({
      sort: '-created',
      ...filters
    });
    return records;
  } catch (error) {
    console.error('PocketBase: Error loading sales:', error);
    throw error;
  }
};

// Функции для работы со сменами
export const getActiveShift = async (userId) => {
  try {
    const records = await pb.collection('shifts').getFullList({
      filter: `user = "${userId}" && status = "active"`
    });
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    // Если коллекция не существует, возвращаем null
    if (error.status === 404) {
      return null;
    }
    console.error('PocketBase: Error getting active shift:', error);
    throw error;
  }
};

export const startShift = async (userId, startTime) => {
  try {
    if (!startTime) {
      startTime = new Date().toISOString();
    }
    
    // Get city from user's supplier
    let cityName = '';
    try {
      const userModel = pb.authStore.model;
      if (userModel?.supplier) {
        const supplier = await pb.collection('suppliers').getOne(userModel.supplier).catch(() => null);
        if (supplier) cityName = supplier.name || '';
      }
    } catch (_) {}
    
    const shiftData = {
      user: userId,
      start: startTime,
      status: 'active',
      totalAmount: 0,
      totalItems: 0,
      sales: [],
      city: cityName
    };
    
    const record = await pb.collection('shifts').create(shiftData);
    return record;
  } catch (error) {
    // Если коллекция не существует, пробуем создать её на лету
    if (error.status === 404) {
      return null;
    }
    console.error('PocketBase: Error starting shift:', error);
    throw error;
  }
};

export const endShift = async (shiftId, endTime, totalAmount, totalItems, sales) => {
  try {
    const record = await pb.collection('shifts').update(shiftId, {
      end: endTime,
      status: 'closed',
      totalAmount: totalAmount,
      totalItems: totalItems,
      sales: sales
    });
    return record;
  } catch (error) {
    console.error('PocketBase: Error ending shift:', error);
    throw error;
  }
};

export const getShifts = async (userId) => {
  try {
    const records = await pb.collection('shifts').getFullList({
      filter: `user = "${userId}"`,
      sort: '-created'
    });
    return records;
  } catch (error) {
    if (error.status === 404) {
      return [];
    }
    console.error('PocketBase: Error getting shifts:', error);
    throw error;
  }
};

// === RBAC: Функции для админа (все смены / все продажи) ===

// Получение всех смен (для админа) с expand user
export const getAllShifts = async (filters = {}) => {
  try {
    const records = await pb.collection('shifts').getFullList({
      sort: '-start',
      expand: 'user',
      ...filters
    });
    return records;
  } catch (error) {
    if (error.status === 404) return [];
    console.error('PocketBase: Error getting all shifts:', error);
    throw error;
  }
};

// Получение всех заказов/продаж (для админа) с expand user
export const getAllOrders = async (filters = {}) => {
  try {
    const records = await pb.collection('orders').getFullList({
      sort: '-created',
      expand: 'user,user.supplier',
      ...filters
    });
    return records;
  } catch (error) {
    if (error.status === 404) return [];
    console.error('PocketBase: Error getting all orders:', error);
    throw error;
  }
};

export const updateUserTimezone = async (userId, timezone) => {
  try {
    const record = await pb.collection('users').update(userId, {
      timezone: timezone
    });
    return record;
  } catch (error) {
    console.error('PocketBase: Error updating timezone:', error);
    throw error;
  }
};

// === Управление пользователями (Admin CRUD) ===

export const createUser = async (data) => {
  try {
    const createData = {
      username: data.username,
      password: data.password,
      passwordConfirm: data.password,
      name: data.name || data.username,
      role: data.role || 'worker',
      email: data.email || `${data.username}@nashsklad.local`,
      emailVisibility: false,
    };
    // supplier — relation ID к коллекции suppliers (город)
    if (data.supplier) createData.supplier = data.supplier;
    const record = await pb.collection('users').create(createData);
    return record;
  } catch (error) {
    console.error('PocketBase: Error creating user:', error);
    throw error;
  }
};

export const updateUser = async (userId, data) => {
  try {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.supplier !== undefined) updateData.supplier = data.supplier || '';
    if (data.username !== undefined) updateData.username = data.username;
    if (data.password) {
      updateData.password = data.password;
      updateData.passwordConfirm = data.password;
    }
    const record = await pb.collection('users').update(userId, updateData);
    return record;
  } catch (error) {
    console.error('PocketBase: Error updating user:', error?.data || error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    await pb.collection('users').delete(userId);
    return true;
  } catch (error) {
    console.error('PocketBase: Error deleting user:', error);
    throw error;
  }
};

// === CRUD для продаж и смен (Admin) ===

export const deleteOrder = async (orderId) => {
  try {
    await pb.collection('orders').delete(orderId);
    return true;
  } catch (error) {
    console.error('PocketBase: Error deleting order:', error);
    throw error;
  }
};

export const updateOrder = async (orderId, data) => {
  try {
    const record = await pb.collection('orders').update(orderId, data);
    return record;
  } catch (error) {
    console.error('PocketBase: Error updating order:', error);
    throw error;
  }
};

export const deleteShift = async (shiftId) => {
  try {
    await pb.collection('shifts').delete(shiftId);
    return true;
  } catch (error) {
    console.error('PocketBase: Error deleting shift:', error);
    throw error;
  }
};

export const updateShift = async (shiftId, data) => {
  try {
    const record = await pb.collection('shifts').update(shiftId, data);
    return record;
  } catch (error) {
    console.error('PocketBase: Error updating shift:', error);
    throw error;
  }
};

// === Объединение дублей товаров ===
export const mergeProducts = async (targetProductId, duplicateProductId) => {
  try {
    // Получаем все остатки дубля
    const dupStocks = await pb.collection('stocks').getFullList({
      filter: `product = "${duplicateProductId}"`
    });
    
    // Переносим остатки на основной товар
    for (const stock of dupStocks) {
      const supplierId = stock.supplier || null;
      const quantity = stock.quantity || 0;
      
      if (quantity > 0) {
        // Ищем существующий остаток основного товара у того же поставщика
        const filterParts = [`product = "${targetProductId}"`];
        if (supplierId) filterParts.push(`supplier = "${supplierId}"`);
        
        const existing = await pb.collection('stocks').getFirstListItem(
          filterParts.join(' && ')
        ).catch(() => null);
        
        if (existing) {
          await pb.collection('stocks').update(existing.id, {
            quantity: existing.quantity + quantity
          });
        } else {
          await pb.collection('stocks').create({
            product: targetProductId,
            supplier: supplierId,
            quantity: quantity,
            cost: stock.cost || 0,
          });
        }
      }
      
      // Удаляем остаток дубля
      await pb.collection('stocks').delete(stock.id);
    }
    
    // Удаляем дубль
    await pb.collection('products').delete(duplicateProductId);
    console.log('mergeProducts: дубль', duplicateProductId, 'объединён в', targetProductId);
    return true;
  } catch (error) {
    console.error('PocketBase: Error merging products:', error);
    throw error;
  }
};

// === Вычет (возврат) заказа ===
export const refundOrder = async (orderId) => {
  try {
    // Получаем заказ с деталями
    const order = await pb.collection('orders').getOne(orderId, { expand: 'user' });
    
    if (order.status === 'refund') {
      throw new Error('Этот заказ уже был возвращён');
    }
    
    // Возвращаем все товары в остатки
    const items = order.items || [];
    const userId = order.user;
    
    // Получаем supplier пользователя для корректного возврата
    let supplierId = null;
    try {
      const user = order.expand?.user || await pb.collection('users').getOne(userId);
      supplierId = user.supplier || null;
    } catch (e) {
      console.warn('refundOrder: не удалось получить supplier пользователя', e);
    }
    
    for (const item of items) {
      const productId = item.productId || item.product;
      const quantity = item.quantity || 1;
      
      if (productId) {
        try {
          await updateStock(productId, null, quantity, supplierId);
          console.log(`refundOrder: возвращено ${quantity} шт товара ${productId}`);
        } catch (e) {
          console.error(`refundOrder: ошибка возврата товара ${productId}:`, e);
        }
      }
    }
    
    // Обновляем статус заказа на 'refund' (НИКОГДА не удаляем заказ!)
    const updated = await pb.collection('orders').update(orderId, { status: 'refund' });
    console.log('refundOrder: заказ', orderId, 'помечен как вычет');

    // Верификация: перечитываем заказ и проверяем что status = 'refund'
    const verify = await pb.collection('orders').getOne(orderId);
    if (verify.status !== 'refund') {
      console.error('refundOrder: верификация не пройдена! status =', verify.status);
      throw new Error('Не удалось пометить заказ как вычет. Попробуйте ещё раз.');
    }
    console.log('refundOrder: верификация пройдена, status =', verify.status);

    return updated;
  } catch (error) {
    console.error('PocketBase: Error refunding order:', error);
    throw error;
  }
};

// === Заглушка для авто-расчёта цены продажи ===
// TODO: Настроить формулу наценки. Пока просто возвращает закуп * коэффициент.
export const calculateSalePrice = (purchasePrice, ratio = 1.0) => {
  // Формула: Цена продажи = Закуп * Накрутка
  // ratio = 1.3 означает наценку 30%
  return Math.round(purchasePrice * ratio);
};

// ============================================
// === FIFO СИСТЕМА: ПАРТИИ И ИЗБРАННОЕ ===
// ============================================

// === Избранное для приемок ===
export const getFavorites = async () => {
  try {
    return await pb.collection('favorites').getFullList({
      sort: '+order',
      expand: 'product'
    });
  } catch (error) {
    console.error('PocketBase: Error loading favorites:', error);
    return [];
  }
};

export const addToFavorites = async (productId) => {
  try {
    // Проверяем, не добавлен ли уже
    const existing = await pb.collection('favorites').getFirstListItem(
      `product = "${productId}"`
    ).catch(() => null);
    
    if (existing) {
      return existing;
    }
    
    // Получаем максимальный order
    const all = await pb.collection('favorites').getFullList({ sort: '-order' });
    const maxOrder = all.length > 0 ? (all[0].order || 0) : 0;
    
    return await pb.collection('favorites').create({
      product: productId,
      order: maxOrder + 1
    });
  } catch (error) {
    console.error('PocketBase: Error adding to favorites:', error);
    throw error;
  }
};

export const removeFromFavorites = async (productId) => {
  try {
    const favorite = await pb.collection('favorites').getFirstListItem(
      `product = "${productId}"`
    );
    await pb.collection('favorites').delete(favorite.id);
    return true;
  } catch (error) {
    console.error('PocketBase: Error removing from favorites:', error);
    throw error;
  }
};

export const isFavorite = async (productId) => {
  try {
    const favorite = await pb.collection('favorites').getFirstListItem(
      `product = "${productId}"`
    ).catch(() => null);
    return !!favorite;
  } catch (error) {
    console.error('PocketBase: Error checking favorite:', error);
    return false;
  }
};

// === Списания ===
export const getWriteOffs = async (supplierId = null) => {
  try {
    const filter = supplierId ? `supplier = "${supplierId}"` : '';
    return await pb.collection('write_offs').getFullList({
      filter,
      sort: '-created',
      expand: 'product,supplier,user,reception_id'
    });
  } catch (error) {
    console.error('PocketBase: Error loading write-offs:', error);
    return [];
  }
};

export const createWriteOff = async (data) => {
  try {
    const productId = data.product;
    const quantity = Number(data.quantity) || 0;
    const supplierId = data.supplier || '';

    if (!productId) throw new Error('Не выбран товар для списания');
    if (quantity <= 0) throw new Error('Количество списания должно быть больше 0');

    // Сначала проверяем достаточность остатка, только потом создаём запись и списываем
    const filterParts = [`product = "${productId}"`, 'quantity > 0'];
    if (supplierId) filterParts.push(`supplier = "${supplierId}"`);

    const stocks = await pb.collection('stocks').getFullList({
      filter: filterParts.join(' && '),
      sort: '+reception_date,+created'
    });

    const availableQty = stocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    if (availableQty < quantity) {
      throw new Error(`Недостаточно остатка для списания: доступно ${availableQty}, нужно ${quantity}`);
    }

    // Создаём запись списания — поля соответствуют схеме write_offs в PocketBase
    const costPerUnit = Number(data.cost_per_unit) || Number(data.cost) || 0;
    const totalCost = costPerUnit * quantity;
    const userId = pb.authStore.model?.id || '';

    if (!supplierId) throw new Error('Не выбран город (supplier) для списания');
    if (!userId) throw new Error('Пользователь не авторизован');

    const writeOffData = {
      product: productId,
      supplier: supplierId,
      user: userId,
      quantity,
      cost: totalCost > 0 ? totalCost : 0.01,
      reason: data.reason || 'Другое',
      comment: data.comment || '',
      writeoff_date: new Date().toISOString(),
    };

    const created = await pb.collection('write_offs').create(writeOffData);

    try {
      // После успешного создания записи списываем остатки по FIFO
      let remaining = quantity;
      const toDeleteIds = [];
      for (const stock of stocks) {
        if (remaining <= 0) break;
        const currentQty = Number(stock.quantity) || 0;
        const deduct = Math.min(currentQty, remaining);
        const nextQty = currentQty - deduct;
        await pb.collection('stocks').update(stock.id, { quantity: nextQty });
        if (nextQty <= 0) toDeleteIds.push(stock.id);
        remaining -= deduct;
      }

      // Чистка нулевых остатков (best-effort; не ломаем успешное списание, если удаление не прошло)
      for (const stockId of toDeleteIds) {
        await pb.collection('stocks').delete(stockId).catch(() => {});
      }
    } catch (stockErr) {
      // Пробуем откатить измененные остатки
      try {
        for (const stock of stocks) {
          const existing = await pb.collection('stocks').getOne(stock.id).catch(() => null);
          if (existing) {
            await pb.collection('stocks').update(stock.id, { quantity: Number(stock.quantity) || 0 });
          }
        }
      } catch (_) {
        // ignore rollback errors
      }
      // Роллбэк: если не удалось корректно обновить остатки — удаляем запись списания
      await pb.collection('write_offs').delete(created.id).catch(() => {});
      throw stockErr;
    }

    return created;
  } catch (error) {
    console.error('PocketBase: Error creating write-off:', error);
    if (error?.response?.data) {
      console.error('PocketBase: Write-off validation errors:', JSON.stringify(error.response.data));
    }
    throw error;
  }
};

const addBackToStock = async ({ productId, supplierId, quantity, costPerUnit = 0 }) => {
  if (!productId || !quantity) return;
  const filterParts = [`product = "${productId}"`];
  if (supplierId) filterParts.push(`supplier = "${supplierId}"`);
  const existing = await pb.collection('stocks').getFirstListItem(filterParts.join(' && ')).catch(() => null);
  if (existing) {
    await pb.collection('stocks').update(existing.id, {
      quantity: (Number(existing.quantity) || 0) + Number(quantity),
    });
  } else {
    await pb.collection('stocks').create({
      product: productId,
      supplier: supplierId || '',
      quantity: Number(quantity),
      cost: Number(costPerUnit) || 0,
      cost_per_unit: Number(costPerUnit) || 0,
    });
  }
};

const deductFromStock = async ({ productId, supplierId, quantity }) => {
  if (!productId || !quantity) return;
  const filterParts = [`product = "${productId}"`, 'quantity > 0'];
  if (supplierId) filterParts.push(`supplier = "${supplierId}"`);

  const stocks = await pb.collection('stocks').getFullList({
    filter: filterParts.join(' && '),
    sort: '+reception_date,+created',
  });

  const available = stocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
  if (available < quantity) {
    throw new Error(`Недостаточно остатка: доступно ${available}, нужно ${quantity}`);
  }

  const original = stocks.map((s) => ({ id: s.id, quantity: Number(s.quantity) || 0 }));
  try {
    let remaining = Number(quantity);
    const toDeleteIds = [];
    for (const stock of stocks) {
      if (remaining <= 0) break;
      const currentQty = Number(stock.quantity) || 0;
      const deduct = Math.min(currentQty, remaining);
      const nextQty = currentQty - deduct;
      await pb.collection('stocks').update(stock.id, { quantity: nextQty });
      if (nextQty <= 0) toDeleteIds.push(stock.id);
      remaining -= deduct;
    }

    for (const stockId of toDeleteIds) {
      await pb.collection('stocks').delete(stockId).catch(() => {});
    }
  } catch (err) {
    // Роллбэк частичных изменений
    for (const row of original) {
      const exists = await pb.collection('stocks').getOne(row.id).catch(() => null);
      if (exists) {
        await pb.collection('stocks').update(row.id, { quantity: row.quantity }).catch(() => {});
      }
    }
    throw err;
  }
};

export const cancelWriteOff = async (writeOffId) => {
  try {
    const writeOff = await pb.collection('write_offs').getOne(writeOffId);
    if (!writeOff) throw new Error('Списание не найдено');

    await addBackToStock({
      productId: writeOff.product,
      supplierId: writeOff.supplier,
      quantity: Number(writeOff.quantity) || 0,
      costPerUnit: Number(writeOff.cost) || 0,
    });

    // Удаляем запись списания после возврата в остатки
    await pb.collection('write_offs').delete(writeOffId);
    return { ...writeOff, status: 'cancelled' };
  } catch (error) {
    console.error('PocketBase: Error cancelling write-off:', error);
    throw error;
  }
};

export const updateWriteOff = async (writeOffId, { quantity, reason }) => {
  try {
    const writeOff = await pb.collection('write_offs').getOne(writeOffId);
    if (!writeOff) throw new Error('Списание не найдено');
    if (writeOff.status === 'cancelled') throw new Error('Нельзя редактировать отменённое списание');

    const oldQty = Number(writeOff.quantity) || 0;
    const newQty = Math.max(1, Number(quantity) || oldQty);
    const diff = newQty - oldQty;

    if (diff > 0) {
      await deductFromStock({
        productId: writeOff.product,
        supplierId: writeOff.supplier,
        quantity: diff,
      });
    } else if (diff < 0) {
      await addBackToStock({
        productId: writeOff.product,
        supplierId: writeOff.supplier,
        quantity: Math.abs(diff),
        costPerUnit: Number(writeOff.cost_per_unit) || 0,
      });
    }

    return await pb.collection('write_offs').update(writeOffId, {
      quantity: newQty,
      reason: reason ?? writeOff.reason,
    });
  } catch (error) {
    console.error('PocketBase: Error updating write-off:', error);
    throw error;
  }
};

// === Получение партий товара ===
export const getProductBatches = async (productId, supplierId = null) => {
  try {
    const filterParts = [`product = "${productId}"`];
    if (supplierId) filterParts.push(`supplier = "${supplierId}"`);
    
    return await pb.collection('stocks').getFullList({
      filter: filterParts.join(' && '),
      sort: '+reception_date,+created',
      expand: 'product,supplier,reception_id'
    });
  } catch (error) {
    console.error('PocketBase: Error loading product batches:', error);
    return [];
  }
};

// === Получение истории приемок для товара ===
export const getReceptionHistoryForProduct = async (productId, supplierId = null) => {
  try {
    // 1) Источник-истина: сами приёмки и их items (кол-во не зависит от последующих продаж/списаний)
    const receptionsFilter = supplierId ? `supplier = "${supplierId}"` : '';
    const receptions = await pb.collection('receptions').getFullList({
      filter: receptionsFilter,
      sort: '-created',
      expand: 'supplier',
    }).catch(() => []);

    const historyFromReceptions = [];
    receptions.forEach((rec) => {
      const items = Array.isArray(rec.items) ? rec.items : [];
      const cityName = rec.expand?.supplier?.name || '';
      items.forEach((item) => {
        const itemProductId = typeof item.product === 'object' ? item.product?.id : item.product;
        if (itemProductId === productId) {
          historyFromReceptions.push({
            date: rec.created || rec.date || '',
            city: cityName,
            quantity: Number(item.quantity) || 0,
            cost: Number(item.cost ?? item.purchase_price ?? 0) || 0,
            receptionId: rec.id,
            batchNumber: rec.batch_number || '',
            receptionName: rec.batch_number || rec.id?.slice(-6) || '',
          });
        }
      });
    });

    if (historyFromReceptions.length > 0) {
      historyFromReceptions.sort((a, b) => new Date((b.date || '').replace(' ','T') || 0) - new Date((a.date || '').replace(' ','T') || 0));
      return historyFromReceptions;
    }

    // 2) Фолбэк для старых данных: партии в stocks
    const batches = await getProductBatches(productId, supplierId);
    if (batches.length === 0) return [];

    const history = batches.map(batch => {
      const cityName = batch.expand?.supplier?.name || '';
      const fullDate = batch.created || batch.reception_date || '';
      return {
        date: fullDate,
        city: cityName,
        quantity: batch.quantity || 0,
        cost: batch.cost || batch.cost_per_unit || 0,
        receptionId: batch.reception_id || '',
        batchNumber: batch.batch_number || '',
        receptionName: batch.expand?.reception_id?.batch_number || batch.batch_number || ''
      };
    });

    history.sort((a, b) => new Date((b.date || '').replace(' ','T') || 0) - new Date((a.date || '').replace(' ','T') || 0));
    return history;
  } catch (error) {
    console.error('PocketBase: Error loading reception history:', error);
    return [];
  }
};

export default pb;
