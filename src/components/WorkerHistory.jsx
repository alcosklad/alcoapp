import React, { useState, useEffect } from 'react';
import { History, Calendar, DollarSign, Package, Search, Percent, Clock, Wallet, Smartphone, FileText, Check } from 'lucide-react';
import { getOrders } from '../lib/pocketbase';

export default function WorkerHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    loadOrdersHistory();
  }, []);

  const ruMonths = {'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04', 'мая': '05', 'июня': '06',
                    'июля': '07', 'августа': '08', 'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'};

  const parseLocalTime = (localTime) => {
    if (!localTime) return new Date(0);
    const replaced = localTime.replace(/(\d+)\s+(\w+)\s+(\d+),\s+(\d+):(\d+)/, 
      (match, day, month, year, hours, minutes) => {
        const m = ruMonths[month];
        if (!m) return match;
        return `${year}-${m}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
      });
    const parsed = new Date(replaced);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  const loadOrdersHistory = async () => {
    try {
      const data = await getOrders();
      const sorted = data.sort((a, b) => {
        if (a.local_time && b.local_time) {
          return parseLocalTime(b.local_time) - parseLocalTime(a.local_time);
        }
        return new Date(b.created_date) - new Date(a.created_date);
      });
      setOrders(sorted);
    } catch (error) {
      console.error('Error loading orders history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Поиск по товарам
    const matchesSearch = order.items?.some(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Фильтр по дате
    const matchesDate = selectedDate ? 
      (() => {
        if (order.local_time) {
          const parts = order.local_time.split(', ');
          const orderDate = parts[0] || '';
          const filterDate = new Date(selectedDate).toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          });
          return orderDate === filterDate;
        }
        return new Date(order.created_date).toDateString() === new Date(selectedDate).toDateString();
      })() : 
      true;
    
    return matchesSearch && matchesDate;
  });

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = filteredOrders.length;

  // Способы оплаты с иконками
  const paymentMethods = {
    '0': { name: 'Наличные', icon: Wallet },
    '1': { name: 'Перевод', icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="m9 10 2 2 4-4" stroke="currentColor" strokeWidth="2" className="text-blue-400" />
      </svg>
    )},
    '2': { name: 'Предоплата', icon: FileText }
  };

  // Получаем тип скидки
  const getDiscountType = (discountType) => {
    if (Array.isArray(discountType)) {
      return discountType[0] || 'percentage';
    }
    return discountType || 'percentage';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка истории...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Заказы</p>
                <p className="text-xl font-bold text-gray-900">{totalOrders}</p>
              </div>
              <History size={20} className="text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Выручка</p>
                <p className="text-xl font-bold text-gray-900">
                  {totalRevenue.toLocaleString('ru-RU')} ₽
                </p>
              </div>
              <DollarSign size={20} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию товара..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Date Filter */}
            <div className="relative">
              <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 pb-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <History size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">
              {orders.length === 0 ? 'Заказов не найдено' : 'Заказы не найдены по выбранным фильтрам'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              console.log('Order data:', {
                discount: order.discount,
                discount_type: order.discount_type,
                subtotal: order.subtotal,
                total: order.total
              });
              
              const dateTime = order.local_time ? {
                date: order.local_time.split(', ')[0] || '',
                time: order.local_time.split(', ')[1] || ''
              } : {
                date: new Date(order.created_date).toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                }),
                time: new Date(order.created_date).toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              };
              
              const payment = paymentMethods[order.payment_method] || { name: 'Неизвестно', icon: Wallet };
              const PaymentIcon = typeof payment.icon === 'function' ? payment.icon : () => <payment.icon size={24} className="text-blue-600" />;
              const discountType = getDiscountType(order.discount_type);
              
              return (
                <div key={order.id} className="bg-white rounded-lg p-4 shadow-sm">
                  {/* Дата и время */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center text-gray-600">
                      <Clock size={16} className="mr-2" />
                      <span className="font-medium">{dateTime.date}</span>
                      <span className="ml-2 text-sm">{dateTime.time}</span>
                    </div>
                    <div className="flex items-center">
                      <PaymentIcon />
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
                          {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Итоги */}
                  <div className="border-t pt-3 flex justify-between items-center">
                    <div>
                      {order.discount > 0 && (
                        <div className="text-sm text-green-600">
                          {discountType === 'percentage' ? (
                            <span>Скидка {order.discount}%</span>
                          ) : (
                            <span>Скидка {order.discount} ₽</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">
                        {parseFloat(order.total).toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
