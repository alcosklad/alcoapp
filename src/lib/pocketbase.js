import PocketBase from 'pocketbase';

// Определяем URL в зависимости от окружения
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isLocalNetwork = window.location.hostname.startsWith('192.168.') || 
                       window.location.hostname.startsWith('10.') ||
                       window.location.hostname.startsWith('172.');

let pbUrl;
if (isLocalhost) {
  pbUrl = 'http://localhost:8090';
} else if (isLocalNetwork) {
  // Для локальной сети используем IP компьютера
  pbUrl = 'http://192.168.1.4:8090';
} else {
  // Для продакшена
  pbUrl = 'http://146.103.121.96:8090';
}

const pb = new PocketBase(pbUrl);

// Отключаем автоотмену запросов для мобильных устройств
pb.autoCancellation(false);

// Включаем логирование всех запросов
pb.beforeSend = function(url, options) {
    console.log('PocketBase Request:', url, options);
    return { url, options };
};

console.log('PocketBase: URL сервера:', pb.baseUrl);
console.log('PocketBase: Auth state:', pb.authStore.isValid, pb.authStore.token ? 'токен есть' : 'токена нет');

// Функции для работы с поставщиками
export const getSuppliers = async () => {
  try {
    console.log('PocketBase: Запрашиваем suppliers...');
    console.log('PocketBase: Текущий токен:', pb.authStore.token ? 'активен' : 'отсутствует');
    
    // Пробуем получить список с отладкой
    const resultList = await pb.collection('suppliers').getList(1, 50, {
      sort: 'name'
    });
    
    console.log('PocketBase: Suppliers (getList):', resultList);
    console.log('PocketBase: Suppliers успешно загружены:', resultList.items.length, 'шт');
    
    // Пробуем getFullList
    const fullList = await pb.collection('suppliers').getFullList({
      sort: 'name'
    });
    
    console.log('PocketBase: Suppliers (getFullList):', fullList);
    return fullList;
  } catch (error) {
    console.error('PocketBase: Error loading suppliers:', error);
    console.error('PocketBase: Статус ошибки:', error.status);
    console.error('PocketBase: Сообщение:', error.message);
    console.error('PocketBase: URL:', error.url);
    console.error('PocketBase: Response:', error.response);
    return [];
  }
};

// Функции для работы с магазинами
export const getStores = async () => {
  try {
    console.log('PocketBase: Запрашиваем stores...');
    const stores = await pb.collection('stores').getFullList({
      sort: 'name'
    });
    console.log('PocketBase: Stores успешно загружены:', stores.length, 'шт');
    return stores;
  } catch (error) {
    console.error('PocketBase: Error loading stores:', error);
    return [];
  }
};

// Функции для работы со складами
export const getWarehouses = async () => {
  try {
    console.log('PocketBase: Запрашиваем warehouses...');
    
    // Пробуем получить список с отладкой
    const resultList = await pb.collection('warehouses').getList(1, 50, {
      sort: 'name'
    });
    
    console.log('PocketBase: Warehouses (getList):', resultList);
    console.log('PocketBase: Warehouses успешно загружены:', resultList.items.length, 'шт');
    
    const fullList = await pb.collection('warehouses').getFullList({
      sort: 'name'
    });
    
    console.log('PocketBase: Warehouses (getFullList):', fullList);
    return fullList;
  } catch (error) {
    console.error('PocketBase: Error loading warehouses:', error);
    console.error('PocketBase: Статус ошибки:', error.status);
    console.error('PocketBase: Сообщение:', error.message);
    console.error('PocketBase: URL:', error.url);
    console.error('PocketBase: Response:', error.response);
    return [];
  }
};

// Проверка API Rules
export const checkApiRules = async () => {
  try {
    console.log('PocketBase: Проверяем доступ к коллекциям...');
    
    // Проверяем suppliers
    const suppliersTest = await pb.collection('suppliers').getFirstListItem('').catch(e => ({ error: e.message }));
    console.log('Suppliers test:', suppliersTest);
    
    // Проверяем warehouses
    const warehousesTest = await pb.collection('warehouses').getFirstListItem('').catch(e => ({ error: e.message }));
    console.log('Warehouses test:', warehousesTest);
    
    // Проверяем products
    const productsTest = await pb.collection('products').getFirstListItem('').catch(e => ({ error: e.message }));
    console.log('Products test:', productsTest);
    
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
    // Загружаем все товары (без фильтра)
    const allProducts = await pb.collection('products').getFullList({
      sort: 'name',
      limit: 1000 // Загружаем больше товаров
    });
    
    // Если нет поиска - возвращаем все
    if (!search) {
      return allProducts.slice(0, 50); // Ограничиваем 50 для производительности
    }
    
    // Фильтруем на клиенте без учета регистра
    const searchLower = search.toLowerCase();
    const filtered = allProducts.filter(product => {
      const name = product?.name || '';
      return name.toLowerCase().includes(searchLower);
    });
    
    return filtered.slice(0, 50); // Ограничиваем 50 результатов
  } catch (error) {
    console.error('PocketBase: Error loading products:', error);
    console.error('PocketBase: Детали ошибки:', error.message, error.status);
    return [];
  }
};

export const createProduct = async (data) => {
  try {
    console.log('PocketBase: Создаем товар:', data);
    const result = await pb.collection('products').create(data);
    console.log('PocketBase: Товар успешно создан:', result);
    return result;
  } catch (error) {
    console.error('PocketBase: Error creating product:', error);
    console.error('PocketBase: Детали ошибки:', error.message, error.status);
    throw error;
  }
};

export const updateProduct = async (id, data) => {
  try {
    console.log('PocketBase: Обновляем товар:', id, data);
    const result = await pb.collection('products').update(id, data);
    console.log('PocketBase: Товар успешно обновлен:', result);
    return result;
  } catch (error) {
    console.error('PocketBase: Error updating product:', error);
    throw error;
  }
};

// Функции для работы с приемками
export const createReception = async (data) => {
  try {
    console.log('PocketBase: Создаем приемку:', data);
    console.log('PocketBase: Items в приемке:', data.items);
    
    // Рассчитываем суммы
    let totalPurchaseValue = 0;
    let totalSaleValue = 0;
    
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach(item => {
        console.log('PocketBase: Обрабатываем товар:', item);
        const purchasePrice = item.cost || item.purchase_price || 0;
        const salePrice = item.sale_price || item.price || 0;
        const quantity = item.quantity || 0;
        
        totalPurchaseValue += purchasePrice * quantity;
        totalSaleValue += salePrice * quantity;
        
        console.log(`PocketBase: Товар - закуп: ${purchasePrice}, продажа: ${salePrice}, кол-во: ${quantity}`);
      });
    }
    
    console.log(`PocketBase: Итого закуп: ${totalPurchaseValue}, продажа: ${totalSaleValue}`);
    
    // Добавляем суммы в данные приемки
    const receptionData = {
      ...data,
      total_amount: totalPurchaseValue,  
      total_sale: totalSaleValue
    };
    
    const result = await pb.collection('receptions').create(receptionData);
    console.log('PocketBase: Приемка успешно создана:', result);
    
    // Обновляем остатки на складе
    if (data.items && data.warehouse && data.supplier) {
      // items теперь массив, не нужно парсить JSON
      const items = data.items;
      console.log('PocketBase: Обновляем остатки для', items.length, 'товаров');
      for (const item of items) {
        await updateStock(item.product, data.warehouse, item.quantity, data.supplier);
      }
    }
    
    return result;
  } catch (error) {
    console.error('PocketBase: Error creating reception:', error);
    console.error('PocketBase: Детали ошибки:', error.message, error.status);
    if (error.data) {
      console.error('PocketBase: Данные ошибки:', JSON.stringify(error.data, null, 2));
    }
    throw error;
  }
};

// Функция для обновления остатков
export const updateStock = async (productId, warehouseId, quantity, supplierId = null) => {
  try {
    console.log(`🔍 Ищем остаток для товара ${productId} на складе ${warehouseId}`);
    
    // Ищем существующую запись остатка (без supplier в фильтре)
    let filterQuery = `product = "${productId}" && warehouse = "${warehouseId}"`;
    
    console.log(`📋 Фильтр поиска: ${filterQuery}`);
    
    const existingStock = await pb.collection('stocks').getFirstListItem(
      filterQuery
    ).catch(() => null);
    
    if (existingStock) {
      console.log(`✅ Найден остаток: ID=${existingStock.id}, количество=${existingStock.quantity}`);
      
      // Проверяем что не уходим в минус при продаже
      const newQuantity = existingStock.quantity + quantity;
      if (newQuantity < 0) {
        throw new Error('Нельзя продать больше чем есть в наличии');
      }
      
      // Обновляем существующий остаток
      const updateData = { quantity: newQuantity };
      // Если передан supplierId, обновляем и его
      if (supplierId) {
        updateData.supplier = supplierId;
      }
      
      // Если количество стало 0, удаляем остаток
      if (newQuantity === 0) {
        await pb.collection('stocks').delete(existingStock.id);
        console.log(`PocketBase: Остаток удален (количество 0): ${productId} на складе ${warehouseId}`);
      } else {
        const updatedStock = await pb.collection('stocks').update(existingStock.id, updateData);
        console.log(`PocketBase: Остаток обновлен: ${productId} на складе ${warehouseId}, новое количество: ${updatedStock.quantity}`);
      }
    } else {
      console.log(`❌ Остаток не найден! Пробуем создать новый...`);
      // Создаем новую запись остатка (только для положительного количества)
      if (quantity <= 0) {
        throw new Error('Нельзя создать остаток с отрицательным количеством');
      }
      
      const newStockData = {
        product: productId,
        warehouse: warehouseId,
        quantity: quantity
      };
      // Если передан supplierId, добавляем его
      if (supplierId) {
        newStockData.supplier = supplierId;
      }
      const newStock = await pb.collection('stocks').create(newStockData);
      console.log(`PocketBase: Создан новый остаток: ${productId} на складе ${warehouseId}, количество: ${newStock.quantity}`);
    }
  } catch (error) {
    console.error('PocketBase: Error updating stock:', error);
    throw error;
  }
};

// Получение остатков с расширением
export const getStocksWithDetails = async (supplierId = null) => {
  try {
    // Теперь фильтруем по supplier как и должно быть
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
    // Используем коллекцию receptions
    return await pb.collection('receptions').getFullList({
      expand: 'supplier,warehouse',
      sort: '-date'
    });
  } catch (error) {
    console.error('Error loading documents:', error);
    return [];
  }
};

// Новая функция для получения приемок
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
    // Создаем все позиции одним запросом
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
    console.log('PocketBase: Загружаем статистику...');
    
    // Получаем остатки для подсчета товаров на складе и суммы продажи
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
    
    // Получаем статистику продаж за разные периоды
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
    console.log('PocketBase: Обновляем приемку:', id, data);
    const result = await pb.collection('receptions').update(id, data);
    console.log('PocketBase: Приемка успешно обновлена:', result);
    return result;
  } catch (error) {
    console.error('PocketBase: Error updating reception:', error);
    throw error;
  }
};

// Удаление приемки
export const deleteReception = async (id) => {
  try {
    console.log('PocketBase: Удаляем приемку:', id);
    await pb.collection('receptions').delete(id);
    console.log('PocketBase: Приемка успешно удалена');
  } catch (error) {
    console.error('PocketBase: Error deleting reception:', error);
    throw error;
  }
};

// Получение всех заказов
export const getOrders = async () => {
  try {
    // Получаем заказы текущего пользователя
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
    console.log('PocketBase: Создаем заказ:', orderData);
    
    // Конвертируем paymentMethod в правильное значение
    let paymentMethodValue = "0"; // по умолчанию наличные
    if (orderData.paymentMethod === 'transfer') {
      paymentMethodValue = "1";
    } else if (orderData.paymentMethod === 'prepaid') {
      paymentMethodValue = "2";
    }
    
    // Для скидки: если тип percentage, сохраняем значение процента, иначе сумму в рублях
    const discountValue = orderData.discountType === 'percentage' 
      ? parseFloat(orderData.discountValue) || 0  // сохраняем процент
      : orderData.discount; // сохраняем сумму в рублях
    
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
    
    console.log('PocketBase: Данные для отправки:', JSON.stringify(data, null, 2));
    
    const result = await pb.collection('orders').create(data);
    console.log('PocketBase: Заказ успешно создан:', result);
    return result;
  } catch (error) {
    console.error('PocketBase: Error creating order:', error);
    console.error('PocketBase: Error details:', error.data);
    throw error;
  }
};

// Создание продажи
export const createSale = async (saleData) => {
  try {
    console.log('PocketBase: Создаем продажу:', saleData);
    const record = await pb.collection('sales').create(saleData);
    console.log('PocketBase: Продажа успешно создана:', record);
    return record;
  } catch (error) {
    console.error('PocketBase: Error creating sale:', error);
    throw error;
  }
};

// Получение продаж
export const getSales = async (filters = {}) => {
  try {
    console.log('PocketBase: Запрашиваем продажи...');
    const records = await pb.collection('sales').getFullList({
      sort: '-created',
      ...filters
    });
    console.log('PocketBase: Продажи успешно загружены:', records.length, 'шт');
    return records;
  } catch (error) {
    console.error('PocketBase: Error loading sales:', error);
    throw error;
  }
};

// Функции для работы со сменами
export const getActiveShift = async (userId) => {
  try {
    console.log('PocketBase: Ищем активную смену для пользователя:', userId);
    const records = await pb.collection('shifts').getFullList({
      filter: `user = "${userId}" && status = "active"`
    });
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    // Если коллекция не существует, возвращаем null
    if (error.status === 404) {
      console.log('PocketBase: Коллекция shifts еще не создана');
      return null;
    }
    console.error('PocketBase: Error getting active shift:', error);
    throw error;
  }
};

export const startShift = async (userId, startTime) => {
  try {
    console.log('PocketBase: Начинаем смену для пользователя:', userId);
    console.log('PocketBase: Время начала смены:', startTime);
    
    if (!startTime) {
      startTime = new Date().toISOString();
      console.log('PocketBase: Используем текущее время:', startTime);
    }
    
    const shiftData = {
      user: userId,
      start: startTime,
      status: 'active',
      totalAmount: 0,
      totalItems: 0,
      sales: []
    };
    
    console.log('PocketBase: Данные для создания смены:', shiftData);
    const record = await pb.collection('shifts').create(shiftData);
    console.log('PocketBase: Смена успешно начата:', record);
    return record;
  } catch (error) {
    // Если коллекция не существует, пробуем создать её на лету
    if (error.status === 404) {
      console.log('PocketBase: Коллекция shifts не найдена, работа без смен');
      return null;
    }
    console.error('PocketBase: Error starting shift:', error);
    throw error;
  }
};

export const endShift = async (shiftId, endTime, totalAmount, totalItems, sales) => {
  try {
    console.log('PocketBase: Закрываем смену:', shiftId);
    const record = await pb.collection('shifts').update(shiftId, {
      end: endTime,
      status: 'closed',
      totalAmount: totalAmount,
      totalItems: totalItems,
      sales: sales
    });
    console.log('PocketBase: Смена успешно закрыта:', record);
    return record;
  } catch (error) {
    console.error('PocketBase: Error ending shift:', error);
    throw error;
  }
};

export const getShifts = async (userId) => {
  try {
    console.log('PocketBase: Запрашиваем смены пользователя:', userId);
    const records = await pb.collection('shifts').getFullList({
      filter: `user = "${userId}"`,
      sort: '-created'
    });
    console.log('PocketBase: Смены успешно загружены:', records.length, 'шт');
    return records;
  } catch (error) {
    if (error.status === 404) {
      console.log('PocketBase: Коллекция shifts еще не создана');
      return [];
    }
    console.error('PocketBase: Error getting shifts:', error);
    throw error;
  }
};

export const updateUserTimezone = async (userId, timezone) => {
  try {
    console.log('PocketBase: Обновляем часовой пояс пользователя:', timezone);
    const record = await pb.collection('users').update(userId, {
      timezone: timezone
    });
    console.log('PocketBase: Часовой пояс обновлен:', record);
    return record;
  } catch (error) {
    console.error('PocketBase: Error updating timezone:', error);
    throw error;
  }
};

export default pb;
