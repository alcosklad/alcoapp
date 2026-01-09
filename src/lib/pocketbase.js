import PocketBase from 'pocketbase';

// Используем IP-адрес для доступа с телефона и компьютера
const pb = new PocketBase('http://192.168.1.4:8090');

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
    const filter = search ? `name ~ "${search}" || article ~ "${search}"` : '';
    return await pb.collection('products').getFullList({
      filter,
      sort: 'name'
    });
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

// Функции для работы с приемками
export const createReception = async (data) => {
  try {
    console.log('PocketBase: Создаем приемку:', data);
    const result = await pb.collection('receptions').create(data);
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
      console.error('PocketBase: Data errors:', error.data);
    }
    throw error;
  }
};

// Функция для обновления остатков
export const updateStock = async (productId, warehouseId, quantity, supplierId = null) => {
  try {
    // Ищем существующую запись остатка
    let filterQuery = `product = "${productId}" && warehouse = "${warehouseId}"`;
    if (supplierId) {
      filterQuery += ` && supplier = "${supplierId}"`;
    }
    
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

// Статистика для дашборда
export const getDashboardStats = async (warehouseId = null) => {
  try {
    const filter = warehouseId ? `warehouse = "${warehouseId}"` : '';
    const stocks = await pb.collection('stocks').getFullList({
      filter,
      expand: 'product'
    });
    
    const totalProducts = stocks.length;
    const totalValue = stocks.reduce((sum, stock) => {
      const price = stock.expand?.product?.price || 0;
      return sum + (price * stock.quantity);
    }, 0);
    
    return {
      totalProducts,
      totalValue
    };
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    return {
      totalProducts: 0,
      totalValue: 0
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

export default pb;
