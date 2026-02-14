import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, History, RussianRuble, Clock, RotateCcw, X, CreditCard, Package, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { getOrders, refundOrder, getActiveShift } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';

export default function WorkerOrders({ user, closeTrigger }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundConfirm, setRefundConfirm] = useState(null);
  const [shakeModal, setShakeModal] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [justRefundedId, setJustRefundedId] = useState(null);
  const [shiftOrderIds, setShiftOrderIds] = useState(new Set());

  // Cleanup body scroll lock on unmount (e.g. tab switch)
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  // Close modal when tab is re-clicked
  useEffect(() => {
    if (closeTrigger && selectedOrder) {
      closeOrderModal();
    }
  }, [closeTrigger]);

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

      // Load active shift to determine which orders allow refund
      try {
        const userId = pb.authStore.model?.id;
        if (userId) {
          const shift = await getActiveShift(userId);
          if (shift && shift.sales) {
            const ids = new Set(shift.sales.map(s => s.id || s).filter(Boolean));
            setShiftOrderIds(ids);
          } else {
            setShiftOrderIds(new Set());
          }
        }
      } catch (_) {
        setShiftOrderIds(new Set());
      }
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
    if (dateFrom || dateTo) {
      const orderDate = new Date(order.created || order.created_date || 0);
      orderDate.setHours(0, 0, 0, 0);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (orderDate < from) matchesDate = false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (orderDate > to) matchesDate = false;
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

  const handleInlineRefund = async (e, order) => {
    e.stopPropagation();
    if (order.status === 'refund') return;
    if (refundConfirm !== order.id) {
      setRefundConfirm(order.id);
      setTimeout(() => setRefundConfirm(prev => prev === order.id ? null : prev), 5000);
      return;
    }
    try {
      setRefundLoading(true);
      await refundOrder(order.id);
      const freshOrders = await getOrders();
      const sorted = freshOrders.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
      setOrders(sorted);
      setRefundConfirm(null);
      setJustRefundedId(order.id);
      setTimeout(() => setJustRefundedId(null), 1500);
      if (selectedOrder?.id === order.id) {
        const updated = sorted.find(o => o.id === order.id);
        setSelectedOrder(updated || null);
      }
    } catch (err) {
      alert('Ошибка вычета: ' + (err.message || ''));
      setRefundConfirm(null);
    } finally {
      setRefundLoading(false);
    }
  };

  const getDiscountType = (dt) => Array.isArray(dt) ? dt[0] || 'percentage' : dt || 'percentage';

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm flex-1">
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
        <button
          onClick={() => loadOrders()}
          disabled={loading}
          className="bg-white rounded-2xl px-4 shadow-sm flex items-center gap-2 text-gray-500 active:bg-blue-50 active:text-blue-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="text-xs font-medium">Обновить</span>
        </button>
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
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 mb-0.5 block">От</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 mb-0.5 block">До</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl mt-4">
                <X size={16} />
              </button>
            )}
          </div>
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
                    className={`w-full text-left rounded-2xl p-4 shadow-sm border-l-[3px] active:scale-[0.98] ${
                      justRefundedId === order.id
                        ? 'refund-transition'
                        : 'transition-all'
                    } ${
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
                          <span className="text-[10px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded">ВОЗВРАТ</span>
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
                        {!isRefund && shiftOrderIds.has(order.id) && (
                          <span
                            onClick={(e) => handleInlineRefund(e, order)}
                            className={`px-2 py-1 text-[10px] font-semibold rounded-lg flex items-center gap-1 transition-all ${
                              refundConfirm === order.id
                                ? 'bg-red-500 text-white'
                                : 'bg-orange-50 text-orange-500 border border-orange-200'
                            } ${refundLoading && refundConfirm === order.id ? 'opacity-50' : ''}`}
                          >
                            <RotateCcw size={10} />
                            {refundLoading && refundConfirm === order.id ? '...' : refundConfirm === order.id ? 'Подтвердить' : 'Возврат'}
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
          <div className={`fixed inset-0 z-[999] bg-white flex flex-col ${shakeModal ? 'animate-shake' : ''}`}>
            <div className="px-5 pt-3 pb-3 border-b border-gray-100 shrink-0 flex items-center gap-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Продажа</h3>
                <p className="text-xs text-gray-400">{dt.date}, {dt.time}</p>
              </div>
            </div>

              <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                {/* Status banner */}
                {isRefund && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <RotateCcw size={20} className="text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-blue-700">Возврат оформлен</p>
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

              {/* Footer: back + refund */}
              <div className="border-t border-gray-100 px-5 py-3 shrink-0 space-y-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                {!isRefund && shiftOrderIds.has(order.id) && (
                  <>
                    <button
                      onClick={() => handleInlineRefund({ stopPropagation: () => {} }, order)}
                      disabled={refundLoading}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${
                        refundConfirm === order.id
                          ? 'bg-red-500 text-white'
                          : 'bg-orange-50 text-orange-600 border border-orange-200'
                      }`}
                    >
                      <RotateCcw size={16} />
                      {refundLoading && refundConfirm === order.id ? 'Оформление...' : refundConfirm === order.id ? 'Подтвердить возврат' : 'Сделать возврат'}
                    </button>
                    {refundConfirm === order.id && (
                      <p className="text-center text-xs text-red-400 mt-1">Нажмите ещё раз для подтверждения</p>
                    )}
                  </>
                )}
                <button
                  onClick={closeOrderModal}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-gray-400 bg-gray-100/60 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <ArrowLeft size={16} />
                  Назад
                </button>
              </div>
          </div>
        );
      })()}

      {/* Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        @keyframes refundPulse {
          0% { background-color: #ffffff; border-color: #d1d5db; }
          30% { background-color: #eff6ff; border-color: #93c5fd; }
          100% { background-color: #eff6ff; border-color: #bfdbfe; }
        }
        .refund-transition {
          animation: refundPulse 1s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
