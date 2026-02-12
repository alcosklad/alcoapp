import React, { useState, useEffect } from 'react';
import { Search, Calendar, History, RussianRuble, Clock, RotateCcw, X } from 'lucide-react';
import { getOrders, refundOrder } from '../../lib/pocketbase';

export default function WorkerOrders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refundConfirmId, setRefundConfirmId] = useState(null);
  const [refundShakeId, setRefundShakeId] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);

  const ruMonths = {'января':'01','февраля':'02','марта':'03','апреля':'04','мая':'05','июня':'06',
                    'июля':'07','августа':'08','сентября':'09','октября':'10','ноября':'11','декабря':'12'};

  const parseLocalTime = (lt) => {
    if (!lt) return new Date(0);
    const replaced = lt.replace(/(\d+)\s+(\w+)\s+(\d+),\s+(\d+):(\d+)/,
      (_, day, month, year, hours, minutes) => {
        const m = ruMonths[month];
        if (!m) return _;
        return `${year}-${m}-${day.padStart(2,'0')}T${hours.padStart(2,'0')}:${minutes.padStart(2,'0')}:00`;
      });
    const d = new Date(replaced);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getOrders();
      const sorted = data.sort((a, b) => {
        if (a.local_time && b.local_time) return parseLocalTime(b.local_time) - parseLocalTime(a.local_time);
        // Fallback: created (PocketBase) or created_date
        const dateA = new Date(a.created || a.created_date || 0);
        const dateB = new Date(b.created || b.created_date || 0);
        return dateB - dateA;
      });
      setOrders(sorted);
    } catch (e) {
      console.error('Error loading orders:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || order.items?.some(item =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    let matchesDate = true;
    if (dateFilter) {
      if (order.local_time) {
        const parts = order.local_time.split(', ');
        const orderDate = parts[0] || '';
        const filterDate = new Date(dateFilter).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        matchesDate = orderDate === filterDate;
      } else {
        matchesDate = new Date(order.created_date).toDateString() === new Date(dateFilter).toDateString();
      }
    }
    return matchesSearch && matchesDate;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const getDateTime = (order) => {
    if (order.local_time) {
      const parts = order.local_time.split(', ');
      return { date: parts[0] || '', time: parts[1] || '' };
    }
    const d = new Date(order.created_date);
    return {
      date: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const paymentLabels = { '0': 'Наличные', '1': 'Перевод', '2': 'Предоплата', 'cash': 'Наличные', 'transfer': 'Перевод', 'prepaid': 'Предоплата' };

  const handleRefund = async (order) => {
    if (refundConfirmId !== order.id) {
      setRefundShakeId(order.id);
      setTimeout(() => setRefundShakeId(null), 600);
      setRefundConfirmId(order.id);
      setTimeout(() => setRefundConfirmId(null), 5000);
      return;
    }
    try {
      setRefundLoading(true);
      await refundOrder(order.id);
      setRefundConfirmId(null);
      await loadOrders();
    } catch (err) {
      alert('Ошибка вычета: ' + (err.message || ''));
    } finally {
      setRefundLoading(false);
    }
  };

  const getDiscountType = (dt) => Array.isArray(dt) ? dt[0] || 'percentage' : dt || 'percentage';

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">{filteredOrders.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Заказов</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <History size={20} className="text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString('ru-RU')}</p>
              <p className="text-xs text-gray-400 mt-0.5">Выручка</p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <RussianRuble size={20} className="text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по товару..."
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm placeholder:text-gray-300"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 rounded-2xl shadow-sm border border-gray-100 transition-colors ${showFilters ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-400'}`}
        >
          <Calendar size={18} />
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <History size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">Заказов не найдено</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            let lastDateLabel = '';
            return filteredOrders.map(order => {
              const dt = getDateTime(order);
              const isRefund = order.status === 'refund';
              const discountType = getDiscountType(order.discount_type);

              // Day separator
              const dateLabel = dt.date;
              const showDaySeparator = dateLabel !== lastDateLabel;
              lastDateLabel = dateLabel;

              return (
                <React.Fragment key={order.id}>
                  {showDaySeparator && (
                    <div className="flex items-center gap-3 pt-3 pb-1">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-xs font-semibold text-gray-400 shrink-0">{dateLabel}</span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                  )}
                  <div
                    className={`rounded-2xl p-4 shadow-sm transition-all border-l-[3px] ${
                      isRefund
                        ? 'bg-red-50 border-l-red-500 border border-red-200'
                        : 'bg-white border-l-emerald-400'
                    } ${refundShakeId === order.id ? 'animate-shake' : ''}`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        {isRefund ? <RotateCcw size={14} className="text-red-500" /> : <Clock size={14} className="text-gray-400" />}
                        <span className={`text-xs font-medium ${isRefund ? 'text-red-400' : 'text-gray-500'}`}>{dt.time}</span>
                        {isRefund && (
                          <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">ВЫЧЕТ</span>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                        isRefund ? 'text-red-500 bg-red-100' : 'text-gray-400 bg-gray-50'
                      }`}>
                        {paymentLabels[order.payment_method] || '—'}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="mb-2.5 space-y-0.5">
                      {(order.items || []).slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className={`truncate flex-1 mr-2 ${isRefund ? 'text-red-400 line-through' : 'text-gray-700'}`}>
                            {item.name} <span className={isRefund ? 'text-red-300' : 'text-gray-400'}>×{item.quantity}</span>
                          </span>
                          <span className={`shrink-0 ${isRefund ? 'text-red-300 line-through' : 'text-gray-500'}`}>{(item.price * item.quantity).toLocaleString('ru-RU')}</span>
                        </div>
                      ))}
                      {(order.items || []).length > 3 && (
                        <p className={`text-xs ${isRefund ? 'text-red-300' : 'text-gray-400'}`}>ещё {order.items.length - 3} товаров...</p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className={`flex items-center justify-between pt-2.5 border-t ${isRefund ? 'border-red-200' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-2">
                        {order.discount > 0 && !isRefund && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">
                            {discountType === 'percentage' ? `-${order.discount}%` : `-${order.discount}`}
                          </span>
                        )}
                        {!isRefund && (
                          <button
                            onClick={() => handleRefund(order)}
                            disabled={refundLoading}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-all flex items-center gap-1 ${
                              refundConfirmId === order.id
                                ? 'bg-red-500 text-white'
                                : 'bg-orange-50 text-orange-500'
                            } disabled:opacity-50`}
                          >
                            <RotateCcw size={12} />
                            {refundLoading && refundConfirmId === order.id ? '...' : refundConfirmId === order.id ? 'Да' : 'Вычет'}
                          </button>
                        )}
                        {isRefund && (
                          <span className="px-2.5 py-1 text-xs bg-red-500 text-white rounded-lg font-bold flex items-center gap-1">
                            <RotateCcw size={12} /> Возврат
                          </span>
                        )}
                      </div>
                      <p className={`text-base font-bold ${isRefund ? 'text-red-500 line-through' : 'text-gray-900'}`}>
                        {(order.total || 0).toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              );
            });
          })()}
        </div>
      )}

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
