import React, { useState, useEffect } from 'react';
import { Calendar, RussianRuble, Percent, Clock, Package, Filter, X } from 'lucide-react';
import { getOrders } from '../lib/pocketbase';

export default function SalesHistory({ isOpen, onClose }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Способы оплаты
  const paymentMethods = {
    '0': { name: 'Наличные', icon: '💵' },
    '1': { name: 'Перевод', icon: '💳' },
    '2': { name: 'Предоплата', icon: '📋' }
  };

  // Загрузка заказов
  useEffect(() => {
    loadOrders();
  }, []);

  // Фильтрация заказов
  useEffect(() => {
    filterOrders();
  }, [orders, dateFilter, paymentFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('🔄 Начинаю загрузку заказов...');
      const data = await getOrders();
      console.log('✅ Получены заказы:', data);
      console.log('📊 Первый заказ для примера:', data[0]);
      console.log('📊 Поля первого заказа:', Object.keys(data[0] || {}));
      console.log('📊 Items первого заказа:', data[0]?.items);
      // Сортируем по local_time (новые первые)
      const sorted = data.sort((a, b) => {
        // Если есть local_time, используем его
        if (a.local_time && b.local_time) {
          // Преобразуем local_time в формат для сравнения
          const dateA = new Date(a.local_time.replace(/(\d+)\s+(\w+)\s+(\d+),\s+(\d+):(\d+)/, 
            (match, day, month, year, hours, minutes) => {
              const months = {'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04', 'мая': '05', 'июня': '06',
                             'июля': '07', 'августа': '08', 'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'};
              return `${year}-${months[month]}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
            }));
          const dateB = new Date(b.local_time.replace(/(\d+)\s+(\w+)\s+(\d+),\s+(\d+):(\d+)/, 
            (match, day, month, year, hours, minutes) => {
              const months = {'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04', 'мая': '05', 'июня': '06',
                             'июля': '07', 'августа': '08', 'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'};
              return `${year}-${months[month]}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
            }));
          return dateB - dateA;
        }
        // Иначе используем created_date
        return new Date(b.created_date) - new Date(a.created_date);
      });
      console.log('📊 Отсортированные заказы:', sorted);
      setOrders(sorted);
    } catch (error) {
      console.error('❌ Ошибка загрузки заказов:', error);
      // Показываем ошибку пользователю
      alert('Ошибка при загрузке истории: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];
    console.log('🔍 Начинаю фильтрацию, всего заказов:', filtered.length);

    // Фильтр по дате
    if (dateFilter) {
      filtered = filtered.filter(order => {
        // Используем local_time для фильтрации
        if (order.local_time) {
          const parts = order.local_time.split(', ');
          const orderDate = parts[0] || '';
          const filterDate = new Date(dateFilter).toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          });
          return orderDate === filterDate;
        }
        // Иначе используем created_date
        const orderDate = new Date(order.created_date).toLocaleDateString('ru-RU');
        return orderDate === new Date(dateFilter).toLocaleDateString('ru-RU');
      });
      console.log('📅 После фильтра по дате:', filtered.length);
    }

    // Фильтр по способу оплаты
    if (paymentFilter) {
      filtered = filtered.filter(order => order.payment_method === paymentFilter);
      console.log('💳 После фильтра по оплате:', filtered.length);
    }

    console.log('✅ Итоговый отфильтрованный список:', filtered);
    setFilteredOrders(filtered);
  };

  const clearFilters = () => {
    setDateFilter('');
    setPaymentFilter('');
  };

  // Форматирование даты и времени
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  // Получаем тип скидки (discount_type может быть массивом)
  const getDiscountType = (discountType) => {
    if (Array.isArray(discountType)) {
      return discountType[0] || 'percentage';
    }
    return discountType || 'percentage';
  };

  // Форматируем local_time из заказа
  const getOrderDateTime = (order) => {
    // Если есть local_time, используем его
    if (order.local_time) {
      const parts = order.local_time.split(', ');
      return {
        date: parts[0] || '',
        time: parts[1] || ''
      };
    }
    // Иначе форматируем created_date
    return formatDateTime(order.created_date);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Заголовок */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">История продаж</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        {/* Фильтры */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-700">Фильтры</h3>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Filter size={18} />
              {showFilters ? 'Скрыть' : 'Показать'}
            </button>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar size={16} className="inline mr-1" />
                  Дата
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <RussianRuble size={16} className="inline mr-1" />
                  Способ оплаты
                </label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все способы</option>
                  <option value="0">Наличные</option>
                  <option value="1">Перевод</option>
                  <option value="2">Предоплата</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Список заказов */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Загрузка...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">
                {orders.length === 0 ? 'Нет заказов' : 'Нет заказов по выбранным фильтрам'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                console.log('🎨 Рендеринг заказа:', order);
                const dateTime = getOrderDateTime(order);
                const payment = paymentMethods[order.payment_method] || { name: 'Неизвестно', icon: '❓' };
                const discountType = getDiscountType(order.discount_type);
                
                return (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    {/* Дата и время */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center text-gray-600">
                        <Clock size={16} className="mr-2" />
                        <span className="font-medium">{dateTime.date}</span>
                        <span className="ml-2 text-sm">{dateTime.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{payment.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{payment.name}</span>
                      </div>
                    </div>

                    {/* Товары */}
                    <div className="mb-3">
                      {order.items && order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <span className="text-gray-800">
                            {item.name} <span className="text-gray-500">×{item.quantity}</span>
                          </span>
                          <span className="text-gray-600">
                            {(item.price * item.quantity).toLocaleString('ru-RU')}                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Итоги */}
                    <div className="border-t pt-3 flex justify-between items-center">
                      <div>
                        {order.discount > 0 && (
                          <div className="flex items-center text-sm text-green-600">
                            <Percent size={14} className="mr-1" />
                            <span>
                              Скидка: {discountType === 'percentage' ? `${order.discount}%` : `${order.discount}`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Итого:</div>
                        <div className="text-lg font-bold text-gray-800">
                          {order.total.toLocaleString('ru-RU')}                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Подвал с статистикой */}
        {!loading && filteredOrders.length > 0 && (
          <div className="border-t bg-gray-50 p-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Показано заказов: {filteredOrders.length}
              </span>
              <span className="font-semibold text-gray-800">
                Общая сумма: {filteredOrders.reduce((sum, order) => sum + order.total, 0).toLocaleString('ru-RU')}              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
