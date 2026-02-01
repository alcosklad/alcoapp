import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Plus, Minus, Package } from 'lucide-react';
import { getStocks, updateStock, createOrder, getActiveShift, startShift, getSuppliers, getStocksWithDetails } from '../lib/pocketbase';
import CartModal from './CartModal';
import SellModal2 from './SellModal2';
import SalesHistory from './SalesHistory';
import pb from '../lib/pocketbase';

export default function Stock() {
  const [stocks, setStocks] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isCrossModalOpen, setIsCrossModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartMode, setCartMode] = useState(false); // false - корзина, true - составить
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // Модальное окно истории
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Мобильное меню
  
  // Получаем роль и город пользователя
  const userRole = pb.authStore.model?.role;
  const userSupplier = pb.authStore.model?.supplier;

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadStocks();
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers().catch(err => {
        console.error('Error loading suppliers:', err);
        return [];
      });
      setSuppliers(data || []);
      
      // Для worker устанавливаем только его город
      if (userRole === 'worker' && userSupplier) {
        setSelectedSupplier(userSupplier);
      } else if (data && data.length > 0) {
        setSelectedSupplier(data[0].id);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setError('Ошибка загрузки поставщиков');
    }
  };

  const loadStocks = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Stock: Загружаем остатки для supplier:', selectedSupplier);
      const data = await getStocksWithDetails(selectedSupplier || null).catch(err => {
        console.error('Error loading stocks:', err);
        return [];
      });
      console.log('📊 Stock: Получены данные:', data);
      console.log('📊 Stock: Первый элемент:', data[0]);
      console.log('📊 Stock: expand.product первого элемента:', data[0]?.expand?.product);
      setStocks(data || []);
    } catch (error) {
      console.error('Error loading stocks:', error);
      setError('Ошибка загрузки остатков');
    } finally {
      setLoading(false);
    }
  };

  const handleSellClick = (stock) => {
    // Подготавливаем данные для модального окна
    const productData = {
      id: stock.id,
      name: stock?.product?.name || stock?.expand?.product?.name || 'Товар',
      article: stock?.product?.article || stock?.expand?.product?.article,
      quantity: stock?.quantity || 0,
      price: stock?.product?.price || stock?.expand?.product?.price || 0,
      supplier: stock.supplier,
      userId: pb.authStore.model?.id
    };
    
    setSelectedStock(productData);
    setIsSellModalOpen(true);
  };

  const handleSellItem = async (stock) => {
    if ((stock?.quantity || 0) <= 0) {
      alert('Товар закончился!');
      return;
    }

    const sellQuantity = 1; // Продаем по 1 шт за раз
    
    if (window.confirm(`Продать 1 шт ${stock?.product?.name || 'товара'}?`)) {
      try {
        // Уменьшаем количество на 1, передаем supplier если есть
        const supplierId = stock.supplier || stock.expand?.supplier?.id || null;
        await updateStock(stock.product.id, stock.warehouse.id, -sellQuantity, supplierId);
        
        // Перезагружаем остатки
        loadStocks();
        
        console.log(`✅ Продано: ${stock?.product?.name}, осталось: ${stock.quantity - 1} шт`);
      } catch (error) {
        console.error('❌ Ошибка продажи:', error);
        
        // Показываем понятное сообщение об ошибке
        if (error.message === 'Нельзя продать больше чем есть в наличии') {
          alert('Нельзя продать больше чем есть в наличии!');
        } else if (error.message === 'Нельзя создать остаток с отрицательным количеством') {
          alert('Ошибка: попытка создать отрицательный остаток');
        } else {
          alert('Ошибка при продаже товара: ' + error.message);
        }
      }
    }
  };

  const handleCardClick = (stock) => {
    if (stock.quantity > 0) {
      handleSellClick(stock);
    }
  };

  const handleSellFromModal = async (sellData) => {
    try {
      // Создаем запись о продаже
      await createSale(sellData);
      
      // Обновляем остатки
      await updateStock(sellData.product, null, -sellData.quantity, sellData.supplier);
      
      // Перезагружаем остатки
      loadStocks();
      
      console.log(`✅ Продано: ${sellData.quantity} шт товара ID: ${sellData.product}`);
      alert(`Успешно продано ${sellData.quantity} шт на сумму ${sellData.total.toLocaleString('ru-RU')} ₽!`);
    } catch (error) {
      console.error('❌ Ошибка продажи:', error);
      throw error; // Пробрасываем ошибку в модальное окно
    }
  };

  // Обработчик завершения заказа из корзины
  const handleCompleteOrder = async (orderData) => {
    try {
      // Проверяем, есть ли активная смена
      const userId = localStorage.getItem('userId');
      const activeShift = await getActiveShift(userId);
      
      if (!activeShift) {
        // Если нет активной смены, начинаем её
        const startTime = new Date().toISOString();
        await startShift(userId, startTime);
        
        // Показываем уведомление о начале смены
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse';
        notification.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Смена началась!</span>
          </div>
        `;
        document.body.appendChild(notification);
        
        // Убираем уведомление через 3 секунды
        setTimeout(() => {
          notification.remove();
        }, 3000);
      }
      
      // Сначала создаем заказ в базе данных
      await createOrder(orderData);
      
      // Обновляем остатки на складе
      for (const item of orderData.items) {
        // Ищем склад для товара
        const stock = filteredStocks.find(s => s.id === item.id);
        if (stock) {
          // Получаем правильные ID
          const warehouseId = stock.warehouse?.id || stock.warehouse || stock.expand?.warehouse?.id;
          const supplierId = stock.supplier?.id || stock.supplier || stock.expand?.supplier?.id;
          
          console.log('🔄 Обновляем остаток:', {
            itemId: item.id,
            productId: item.productId, // Используем productId
            itemName: item.name,
            warehouseId,
            supplierId,
            quantity: -item.quantity,
            currentStock: stock.quantity
          });
          
          // Передаем productId вместо item.id
          await updateStock(item.productId, warehouseId, -item.quantity, supplierId);
        }
      }
      
      alert(`Заказ успешно оформлен на сумму ${orderData.total.toLocaleString('ru-RU')} ₽!`);
      
      // Перезагружаем остатки
      loadStocks();
    } catch (error) {
      console.error('❌ Ошибка оформления заказа:', error);
      alert('Ошибка при оформлении заказа: ' + error.message);
    }
  };

  const filteredStocks = stocks.filter(stock => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const productName = stock?.expand?.product?.name || stock?.product?.name || '';
    const productArticle = stock?.expand?.product?.article || stock?.product?.article || '';
    return (
      productName.toLowerCase().includes(searchLower) ||
      productArticle.toLowerCase().includes(searchLower)
    );
  });

  const totalItems = filteredStocks.length;
  const totalQuantity = filteredStocks.reduce((sum, stock) => sum + (stock?.quantity || 0), 0);
  const lowStockItems = filteredStocks.filter(stock => (stock?.quantity || 0) <= 3 && (stock?.quantity || 0) > 0);
  
  // Считаем суммы
  const totalPurchaseValue = filteredStocks.reduce((sum, stock) => {
    return sum + ((stock?.purchase_price || 0) * (stock?.quantity || 0));
  }, 0);
  
  const totalSaleValue = filteredStocks.reduce((sum, stock) => {
    const price = stock.expand?.product?.price || 0;
    return sum + (price * (stock?.quantity || 0));
  }, 0);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Ошибка</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={loadStocks}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Кнопка корзина в правом верхнем углу - только для admin и worker */}
      {(userRole === 'admin' || userRole === 'worker') && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed top-4 right-4 z-40 p-3 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-all duration-200"
        >
          {cartMode ? <ShoppingCart size={24} /> : <ShoppingCart size={24} />}
        </button>
      )}

      {/* Модальное окно для корзины */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        stocks={filteredStocks}
        onCompleteOrder={handleCompleteOrder}
      />

      {/* Модальное окно истории продаж */}
      <SalesHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Модальное окно для крестика - только для admin и worker */}
      {isCrossModalOpen && (userRole === 'admin' || userRole === 'worker') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 m-4 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Меню</h2>
              <button
                onClick={() => setIsCrossModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsHistoryOpen(true);
                  setIsCrossModalOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-3"
              >
                <History size={20} className="text-blue-600" />
                <span>История продаж</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - убран заголовок для Worker */}
      {userRole !== 'worker' && (
        <header className="bg-white shadow-sm px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Остатки товаров</h1>
        </header>
      )}

      {/* Stats Cards */}
      <div className="px-4 py-4 space-y-3">
        {userRole === 'worker' ? (
          // Для Worker - отдельный layout
          <div className="grid grid-cols-2 gap-3">
            {/* Левая сторона - маленькие карточки */}
            <div className="space-y-3 pl-4">
              <div className="text-center">
                <p className="text-2xl font-semibold text-blue-600">{totalQuantity}</p>
                <p className="text-xs text-gray-500">Штук всего</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-red-600">{lowStockItems.length}</p>
                <p className="text-xs text-gray-500">Мало остаток</p>
              </div>
            </div>
            
            {/* Правая сторона - сумма продажи */}
            <div className="space-y-3 pr-16 pt-8">
              <div className="text-center">
                <p className="text-2xl font-semibold text-green-600">{totalSaleValue.toLocaleString('ru-RU')}</p>
                <p className="text-xs text-gray-500">Сумма продажи</p>
              </div>
            </div>
          </div>
        ) : (
          // Для Admin и Operator - обычный layout
          <div className="grid grid-cols-2 gap-3">
            {/* Левая сторона - маленькие карточки */}
            <div className="space-y-3 pl-8">
              <div className="text-center">
                <p className="text-2xl font-semibold text-blue-600">{totalQuantity}</p>
                <p className="text-xs text-gray-500">Штук всего</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-red-600">{lowStockItems.length}</p>
                <p className="text-xs text-gray-500">Мало остаток</p>
              </div>
            </div>
            
            {/* Правая сторона - суммы в столбик */}
            <div className="space-y-3 pr-16">
              <div className="text-center">
                <p className="text-2xl font-semibold text-green-600">{totalSaleValue.toLocaleString('ru-RU')}</p>
                <p className="text-xs text-gray-500">Сумма продажи</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-purple-600">{totalPurchaseValue.toLocaleString('ru-RU')}</p>
                <p className="text-xs text-gray-500">Сумма закупа</p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg p-3 shadow-sm space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или артикулу"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Селект города - только не для worker */}
          {userRole !== 'worker' && (
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все города</option>
              {(suppliers || []).map(supplier => (
                <option key={supplier?.id || Math.random()} value={supplier?.id}>
                  {supplier?.name || 'Неизвестный город'}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Stock List */}
        <div className="bg-white rounded-lg shadow-sm">
          {(!filteredStocks || filteredStocks.length === 0) ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500">Товары не найдены</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredStocks.map(stock => {
                console.log('🎨 Stock: Отрисовка карточки:', {
                  id: stock.id,
                  productName: stock.product?.name,
                  expandName: stock.expand?.product?.name,
                  price: stock.product?.price,
                  expandPrice: stock.expand?.product?.price,
                  quantity: stock.quantity
                });
                
                const totalSum = (stock?.quantity || 0) * (stock?.expand?.product?.price || 0);
                const price = stock?.expand?.product?.price || 0;
                return (
                <div 
                  key={stock?.id || Math.random()} 
                  className="p-4 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {stock?.product?.name || stock?.expand?.product?.name || 'Товар'}
                      </h3>
                      {stock?.warehouse && (
                        <p className="text-xs text-gray-400 mt-1">{stock.warehouse.name}</p>
                      )}
                      <p className="text-sm font-medium text-gray-700 mt-2">
                        Общая сумма: {totalSum.toLocaleString('ru-RU')} ₽
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Цена за шт: {price.toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold px-3 py-1 rounded-lg ${
                        (stock?.quantity || 0) === 0
                          ? 'text-red-600 bg-red-50'
                          : (stock?.quantity || 0) <= 3
                          ? 'text-red-600 bg-red-50'
                          : 'text-green-600 bg-green-50'
                      }`}>
                        {stock?.quantity || 0} шт
                      </p>
                      {(stock?.quantity || 0) < 2 && (
                        <p className="text-xs text-red-500 mt-1">Заканчивается!</p>
                      )}
                      {(stock?.quantity || 0) === 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          Нет в наличии
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    
    {/* Модальное окно продажи */}
    <SellModal2
      isOpen={isSellModalOpen}
      onClose={() => setIsSellModalOpen(false)}
      product={selectedStock}
      onSell={handleSellFromModal}
    />
  </div>
  );
}
