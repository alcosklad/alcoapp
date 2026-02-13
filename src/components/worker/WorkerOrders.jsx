import React, { useState, useEffect } from 'react';
import { Search, Calendar, History, RussianRuble, Clock, RotateCcw, X, CreditCard, Package, ChevronRight } from 'lucide-react';
import { getOrders, refundOrder } from '../../lib/pocketbase';

export default function WorkerOrders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundConfirm, setRefundConfirm] = useState(false);
  const [shakeModal, setShakeModal] = useState(false);
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
      // Сортируем по created (PocketBase timestamp) — надёжнее чем текстовое local_time
      const sorted = data.sort((a, b) => {
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

  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setRefundConfirm(false);
    setShakeModal(false);
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  };

  const closeOrderModal = () => {
    setSelectedOrder(null);
    setRefundConfirm(false);
    setShakeModal(false);
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  };

  const handleRefund = async () => {
    if (!selectedOrder) return;
    if (selectedOrder.status === 'refund') return; // уже вычтен — блокируем
    if (!refundConfirm) {
      setShakeModal(true);
      setTimeout(() => setShakeModal(false), 600);
      setRefundConfirm(true);
      return;
    }
    try {
      setRefundLoading(true);
      await refundOrder(selectedOrder.id);
      // Перезагружаем список и обновляем выбранный заказ
      const freshOrders = await getOrders();
      const sorted = freshOrders.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
      setOrders(sorted);
      // Находим обновлённый заказ в списке
      const updated = sorted.find(o => o.id === selectedOrder.id) || sorted.find(o => o.local_time === selectedOrder.local_time && o.total === selectedOrder.total);
      if (updated) {
        setSelectedOrder(updated); // покажем синюю модалку
        setRefundConfirm(false);
      } else {
        closeOrderModal();
      }
    } catch (err) {
      alert('Ошибка вычета: ' + (err.message || ''));
      setRefundConfirm(false); // сбросить, чтобы пользователь мог попробовать снова
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
                  <button
                    onClick={() => openOrderModal(order)}
                    className={`w-full text-left rounded-2xl p-4 shadow-sm transition-all border-l-[3px] active:scale-[0.98] ${
                      isRefund
                        ? 'bg-blue-50 border-l-blue-500 border border-blue-200'
                        : 'bg-white border-l-emerald-400'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        {isRefund ? <RotateCcw size={14} className="text-blue-500" /> : <Clock size={14} className="text-gray-400" />}
                        <span className={`text-xs font-medium ${isRefund ? 'text-blue-400' : 'text-gray-500'}`}>{dt.time}</span>
                        {isRefund && (
                          <span className="text-[10px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded">ВЫЧЕТ</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                          isRefund ? 'text-blue-500 bg-blue-100' : 'text-gray-400 bg-gray-50'
                        }`}>
                          {paymentLabels[order.payment_method] || '—'}
                        </span>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mb-2.5 space-y-0.5">
                      {(order.items || []).slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className={`truncate flex-1 mr-2 ${isRefund ? 'text-blue-400 line-through' : 'text-gray-700'}`}>
                            {item.name} <span className={isRefund ? 'text-blue-300' : 'text-gray-400'}>×{item.quantity}</span>
                          </span>
                          <span className={`shrink-0 ${isRefund ? 'text-blue-300 line-through' : 'text-gray-500'}`}>{(item.price * item.quantity).toLocaleString('ru-RU')}</span>
                        </div>
                      ))}
                      {(order.items || []).length > 3 && (
                        <p className={`text-xs ${isRefund ? 'text-blue-300' : 'text-gray-400'}`}>ещё {order.items.length - 3} товаров...</p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className={`flex items-center justify-between pt-2.5 border-t ${isRefund ? 'border-blue-200' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-2">
                        {isRefund && (
                          <span className="px-2.5 py-1 text-xs bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1">
                            <RotateCcw size={12} /> Вычет
                          </span>
                        )}
                        {order.discount > 0 && !isRefund && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">
                            {getDiscountType(order.discount_type) === 'percentage' ? `-${order.discount}%` : `-${order.discount}`}
                          </span>
                        )}
                      </div>
                      <p className={`text-base font-bold ${isRefund ? 'text-blue-500 line-through' : 'text-gray-900'}`}>
                        {(order.total || 0).toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                  </button>
                </React.Fragment>
              );
            });
          })()}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (() => {
        const order = selectedOrder;
        const dt = getDateTime(order);
        const isRefund = order.status === 'refund';
        const discountType = getDiscountType(order.discount_type);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={closeOrderModal}>
            <div
              className={`bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto ${shakeModal ? 'animate-shake' : ''}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-gray-100 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Продажа</h3>
                    <p className="text-xs text-gray-400">{dt.date}, {dt.time}</p>
                  </div>
                  <button onClick={closeOrderModal} className="p-2 hover:bg-gray-100 rounded-xl">
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 60px - 80px)' }}>
                {/* Status banner */}
                {isRefund && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <RotateCcw size={20} className="text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-blue-700">Вычет оформлен</p>
                      <p className="text-xs text-blue-400">Товары возвращены в остаток</p>
                    </div>
                  </div>
                )}

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <Package size={18} className="mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-400">Товары</p>
                    <p className="text-sm font-bold text-gray-900">{(order.items || []).reduce((s, it) => s + (it.quantity || 0), 0)} шт</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <CreditCard size={18} className="mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-400">Оплата</p>
                    <p className="text-sm font-bold text-gray-900">{paymentLabels[order.payment_method] || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <RussianRuble size={18} className="mx-auto text-green-500 mb-1" />
                    <p className="text-xs text-gray-400">Сумма</p>
                    <p className={`text-sm font-bold ${isRefund ? 'text-blue-500 line-through' : 'text-green-600'}`}>{(order.total || 0).toLocaleString('ru-RU')}</p>
                  </div>
                </div>

                {/* Discount */}
                {order.discount > 0 && (
                  <div className="bg-green-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-green-700">Скидка</span>
                    <span className="text-sm font-bold text-green-600">
                      {discountType === 'percentage' ? `-${order.discount}%` : `-${order.discount} ₽`}
                    </span>
                  </div>
                )}

                {/* Items list */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Товары в заказе</p>
                  <div className="space-y-2">
                    {(order.items || []).map((item, i) => (
                      <div key={i} className={`rounded-xl px-4 py-3 ${isRefund ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 mr-3">
                            <p className={`text-sm font-medium ${isRefund ? 'text-blue-400 line-through' : 'text-gray-800'}`}>{item.name}</p>
                            <p className={`text-xs mt-0.5 ${isRefund ? 'text-blue-300' : 'text-gray-400'}`}>
                              {(item.price || 0).toLocaleString('ru-RU')} ₽ × {item.quantity} шт
                            </p>
                          </div>
                          <p className={`text-sm font-bold shrink-0 ${isRefund ? 'text-blue-400 line-through' : 'text-gray-900'}`}>
                            {((item.price || 0) * (item.quantity || 0)).toLocaleString('ru-RU')} ₽
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sticky footer with refund button */}
              {!isRefund && (
                <div className="border-t border-gray-100 px-5 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  <button
                    onClick={handleRefund}
                    disabled={refundLoading}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${
                      refundConfirm
                        ? 'bg-red-500 text-white'
                        : 'bg-orange-50 text-orange-600 border border-orange-200'
                    }`}
                  >
                    <RotateCcw size={16} />
                    {refundLoading ? 'Оформление...' : refundConfirm ? 'Подтвердить вычет' : 'Сделать вычет'}
                  </button>
                  {refundConfirm && (
                    <p className="text-center text-xs text-red-400 mt-1">Нажмите ещё раз для подтверждения. Товар вернётся в остаток.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
