import PocketBase from 'pocketbase';

// Определяем URL в зависимости от окружения
let pbUrl = import.meta.env.VITE_POCKETBASE_URL;

if (!pbUrl) {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isLocalNetwork = window.location.hostname.startsWith('192.168.') || 
                         window.location.hostname.startsWith('10.') ||
                         window.location.hostname.startsWith('172.');

  if (isLocalhost) {
    pbUrl = 'http://localhost:8090';
  } else if (isLocalNetwork) {
    pbUrl = 'http://192.168.1.4:8090';
  } else {
    pbUrl = 'http://146.103.121.96:8090';
  }
}

const pb = new PocketBase(pbUrl);

// Отключаем автоотмену запросов для мобильных устройств
pb.autoCancellation(false);

// Логирование только в dev режиме
if (import.meta.env.DEV) {
  pb.beforeSend = function(url, options) {
    console.log('PocketBase Request:', url);
    return { url, options };
  };
  console.log('PocketBase: URL сервера:', pb.baseUrl);
  console.log('PocketBase: Auth state:', pb.authStore.isValid);
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

// Функции для работы с приемками
export const createReception = async (data) => {
  try {
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
    
    // Добавляем суммы в данные приемки
    const receptionData = {
      ...data,
      total_amount: totalPurchaseValue,  
      total_sale: totalSaleValue
    };
    
    const result = await pb.collection('receptions').create(receptionData);
    
    // Обновляем остатки на складе
    if (data.items && data.supplier) {
      const items = data.items;
      for (const item of items) {
        const purchasePrice = item.cost ?? item.purchase_price ?? null;
        await updateStock(item.product, null, item.quantity, data.supplier, purchasePrice);
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

// Получение статистики продаж за период
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
      filter += ` && supplier = "${filterId}"`;
    }
    
    const sales = await pb.collection('sales').getFullList({
      filter,
      sort: '-created'
    }).catch(() => []);
    
    return {
      count: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + (sale.total_price || 0), 0)
    };
  } catch (error) {
    console.error('PocketBase: Error loading sales stats:', error);
    return { count: 0, totalAmount: 0 };
  }
};

// Получение статистики для дашборда
export const getDashboardStats = async (filterId = null) => {
  try {
    let stocksFilter = '';
    if (filterId) {
      stocksFilter = `supplier = "${filterId}"`;
    }
    
    const stocks = await pb.collection('stocks').getFullList({
      filter: stocksFilter,
      expand: 'product'
    }).catch(() => []);
    
    let totalStockQuantity = 0;
    let totalSaleValue = 0;
    
    stocks.forEach(stock => {
      const quantity = stock.quantity || 0;
      const salePrice = stock?.expand?.product?.price || 0;
      
      totalStockQuantity += quantity;
      totalSaleValue += salePrice * quantity;
    });
    
    // Получаем приемки для подсчета суммы закупа
    let receptionsFilter = '';
    if (filterId) {
      receptionsFilter = `supplier = "${filterId}"`;
    }
    
    const receptions = await pb.collection('receptions').getFullList({
      filter: receptionsFilter,
      expand: 'supplier,warehouse'
    }).catch(() => []);
    
    let totalPurchaseValue = 0;
    let receptionsCount = receptions.length;
    
    receptions.forEach(reception => {
      if (reception.items && Array.isArray(reception.items)) {
        reception.items.forEach(item => {
          const quantity = item.quantity || 0;
          const purchasePrice = item.cost || item.purchase_price || item.price || 0;
          totalPurchaseValue += purchasePrice * quantity;
        });
      }
    });
    
    // Получаем товары с долгим сроком хранения (неликвид)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sales = await pb.collection('sales').getFullList({
      sort: '-created'
    }).catch(() => []);
    
    // Находим товары, которые не продавались больше 30 дней
    const soldProductIds = new Set();
    sales.forEach(sale => {
      const saleDate = new Date(sale.created);
      if (saleDate > thirtyDaysAgo) {
        soldProductIds.add(sale.product);
      }
    });
    
    const staleProducts = stocks.filter(stock => {
      return stock.quantity > 0 && !soldProductIds.has(stock.product);
    });
    
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

// Удаление приемки
export const deleteReception = async (id) => {
  try {
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
      sort: '-local_time',
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
      created_date: new Date().toISOString()
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

// Получение продаж
export const getSales = async (filters = {}) => {
  try {
    const records = await pb.collection('sales').getFullList({
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
    
    const shiftData = {
      user: userId,
      start: startTime,
      status: 'active',
      totalAmount: 0,
      totalItems: 0,
      sales: []
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
      sort: '-local_time',
      expand: 'user',
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

export default pb;
