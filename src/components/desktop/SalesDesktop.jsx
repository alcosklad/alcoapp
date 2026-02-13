import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, RussianRuble, TrendingUp, CreditCard, Banknote, Search, ChevronDown, ChevronUp, X, Eye, Trash2, RotateCcw, Wallet } from 'lucide-react';
import { getAllOrders, getUsers, deleteOrder, refundOrder, getActiveShift } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';

export default function SalesDesktop() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filters
  const [filterCourier, setFilterCourier] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('month');

  // Sort
  const [sortField, setSortField] = useState('local_time');
  const [sortDir, setSortDir] = useState('desc');

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Refund
  const [refundShaking, setRefundShaking] = useState(false);
  const [refundConfirm, setRefundConfirm] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  const isAdmin = pb.authStore.model?.role === 'admin';
  const isWorker = pb.authStore.model?.role === 'worker';

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedOrder]);

  const handleRefundOrder = async (order) => {
    if (!refundConfirm) {
      // Первый клик — анимация тряски и запрос подтверждения
      setRefundShaking(true);
      setTimeout(() => setRefundShaking(false), 600);
      setRefundConfirm(true);
      // Сброс подтверждения через 5 сек
      setTimeout(() => setRefundConfirm(false), 5000);
      return;
    }
    // Второй клик — подтверждение
    try {
      setRefundLoading(true);
      await refundOrder(order.id);
      setSelectedOrder(null);
      setRefundConfirm(false);
      await loadData();
    } catch (err) {
      console.error('Error refunding order:', err);
      alert('Ошибка возврата: ' + (err.message || ''));
    } finally {
      setRefundLoading(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Удалить продажу #${order.id?.slice(-6)} на сумму ${(order.total || 0).toLocaleString('ru-RU')}?`)) return;
    try {
      await deleteOrder(order.id);
      setSelectedOrder(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting order:', err);
      alert('Ошибка удаления: ' + (err.message || ''));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Set default date filter based on period
  useEffect(() => {
    const now = new Date();
    let from = new Date();
    switch (filterPeriod) {
      case 'today':
        from.setHours(0, 0, 0, 0);
        break;
      case 'week':
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from.setMonth(now.getMonth() - 1);
        break;
      case 'all':
        from = new Date('2026-01-01');
        break;
      case 'custom':
        return; // don't override custom dates
      default:
        from.setMonth(now.getMonth() - 1);
    }
    setFilterDateFrom(from.toISOString().split('T')[0]);
    setFilterDateTo(now.toISOString().split('T')[0]);
  }, [filterPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, usersData] = await Promise.all([
        getAllOrders(),
        getUsers()
      ]);
      setOrders(ordersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique cities and couriers from data
  const cities = useMemo(() => {
    const set = new Set(orders.map(o => o.city).filter(Boolean));
    return [...set].sort();
  }, [orders]);

  const couriers = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      const user = o.expand?.user;
      if (user && user.role === 'worker') {
        map.set(user.id, user.name);
      }
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  // Filter & sort
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o => {
        const userName = o.expand?.user?.name || '';
        const city = o.city || '';
        const items = o.items || [];
        const itemNames = items.map(i => i.name || '').join(' ');
        return userName.toLowerCase().includes(q) ||
               city.toLowerCase().includes(q) ||
               itemNames.toLowerCase().includes(q);
      });
    }

    // Courier filter
    if (filterCourier) {
      result = result.filter(o => o.user === filterCourier);
    }

    // City filter
    if (filterCity) {
      result = result.filter(o => o.city === filterCity);
    }

    // Date filter
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(o => new Date(o.local_time || o.created) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(o => new Date(o.local_time || o.created) <= to);
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'local_time':
          aVal = new Date(a.local_time || a.created).getTime();
          bVal = new Date(b.local_time || b.created).getTime();
          break;
        case 'total':
          aVal = a.total || 0;
          bVal = b.total || 0;
          break;
        case 'city':
          aVal = a.city || '';
          bVal = b.city || '';
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'courier':
          aVal = a.expand?.user?.name || '';
          bVal = b.expand?.user?.name || '';
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'items_count':
          aVal = (a.items || []).length;
          bVal = (b.items || []).length;
          break;
        default:
          aVal = 0; bVal = 0;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [orders, search, filterCourier, filterCity, filterDateFrom, filterDateTo, sortField, sortDir]);

  // Summary stats
  const stats = useMemo(() => {
    const totalSum = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
    const totalCount = filteredOrders.length;
    const avgCheck = totalCount > 0 ? totalSum / totalCount : 0;
    const cashSum = filteredOrders.reduce((s, o) => s + (o.payment_method === '0' ? (o.total || 0) : 0), 0);
    const transferSum = filteredOrders.reduce((s, o) => s + (o.payment_method === '1' ? (o.total || 0) : 0), 0);
    const prepaidSum = filteredOrders.reduce((s, o) => s + (o.payment_method === '2' ? (o.total || 0) : 0), 0);
    const totalItems = filteredOrders.reduce((s, o) => s + (o.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0), 0);
    return { totalSum, totalCount, avgCheck, cashSum, transferSum, prepaidSum, totalItems };
  }, [filteredOrders]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={14} className="text-blue-600" />
      : <ChevronDown size={14} className="text-blue-600" />;
  };

  const formatDate = (str) => {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatTime = (str) => {
    if (!str) return '';
    const d = new Date(str);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMoney = (v) => (v || 0).toLocaleString('ru-RU');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <RussianRuble size={18} />
            <span className="text-sm">Выручка</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatMoney(stats.totalSum)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <ShoppingCart size={18} />
            <span className="text-sm">Продаж</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.totalCount}</p>
          <p className="text-xs text-gray-400">{stats.totalItems} товаров</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp size={18} />
            <span className="text-sm">Ср. чек</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatMoney(Math.round(stats.avgCheck))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Banknote size={18} />
            <span className="text-sm">Наличные</span>
          </div>
          <p className="text-xl font-bold text-green-600">{formatMoney(stats.cashSum)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CreditCard size={18} />
            <span className="text-sm">Перевод</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{formatMoney(stats.transferSum)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Wallet size={18} />
            <span className="text-sm">Предоплата</span>
          </div>
          <p className="text-xl font-bold text-purple-600">{formatMoney(stats.prepaidSum)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period buttons */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[
              { id: 'today', label: 'Сегодня' },
              { id: 'week', label: 'Неделя' },
              { id: 'month', label: 'Месяц' },
              { id: 'all', label: 'Всё' },
              { id: 'custom', label: 'Период' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setFilterPeriod(p.id)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterPeriod === p.id
                    ? 'bg-white text-blue-600 shadow-sm font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {filterPeriod === 'custom' && (
            <>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
            </>
          )}

          {/* Courier filter */}
          <select
            value={filterCourier}
            onChange={e => setFilterCourier(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Все курьеры</option>
            {couriers.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          {/* City filter */}
          <select
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Все города</option>
            {cities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по товарам, городу..."
              className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm"
            />
          </div>

          {(filterCourier || filterCity || search) && (
            <button
              onClick={() => { setFilterCourier(''); setFilterCity(''); setSearch(''); }}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Сбросить фильтры"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('local_time')}>
                  <div className="flex items-center gap-1">Дата/Время <SortIcon field="local_time" /></div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('courier')}>
                  <div className="flex items-center gap-1">Курьер <SortIcon field="courier" /></div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('city')}>
                  <div className="flex items-center gap-1">Город <SortIcon field="city" /></div>
                </th>
                <th className="px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort('items_count')}>
                  <div className="flex items-center justify-center gap-1">Товары <SortIcon field="items_count" /></div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('total')}>
                  <div className="flex items-center justify-end gap-1">Сумма <SortIcon field="total" /></div>
                </th>
                <th className="px-4 py-3 text-center">Оплата</th>
                <th className="px-4 py-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Нет продаж за выбранный период
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const items = order.items || [];
                  const itemsCount = items.reduce((s, i) => s + (i.quantity || 1), 0);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{formatDate(order.local_time)}</div>
                        <div className="text-xs text-gray-400">{formatTime(order.local_time)}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {order.expand?.user?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {order.city || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {itemsCount} шт
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatMoney(order.total)}
                        {order.status === 'refund' && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Возврат</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {order.payment_method === '0' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <Banknote size={14} /> Нал
                          </span>
                        ) : order.payment_method === '1' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                            <CreditCard size={14} /> Перевод
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-600">
                            <Wallet size={14} /> Предоплата
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                            title="Детали"
                          >
                            <Eye size={16} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                              title="Удалить"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Totals row */}
        {filteredOrders.length > 0 && (
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Показано: {filteredOrders.length} из {orders.length}
            </span>
            <span className="font-semibold text-gray-900">
              Итого: {formatMoney(stats.totalSum)}            </span>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setSelectedOrder(null); setRefundConfirm(false); }}>
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Чек #{selectedOrder.id?.slice(-6)}</h3>
                <p className="text-sm text-gray-500">
                  {formatDate(selectedOrder.local_time)} {formatTime(selectedOrder.local_time)} — {selectedOrder.expand?.user?.name || '—'} ({selectedOrder.city || '—'})
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedOrder.status !== 'refund' && (isAdmin || isWorker) && (
                  <button
                    onClick={() => handleRefundOrder(selectedOrder)}
                    disabled={refundLoading}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${
                      refundConfirm
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                    } ${refundShaking ? 'animate-shake' : ''} disabled:opacity-50`}
                  >
                    <RotateCcw size={14} />
                    {refundLoading ? 'Возврат...' : refundConfirm ? 'Подтвердить возврат' : 'Возврат'}
                  </button>
                )}
                {selectedOrder.status === 'refund' && (
                  <span className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg font-medium">Возврат</span>
                )}
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteOrder(selectedOrder)}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    Удалить
                  </button>
                )}
                <button onClick={() => {
                  setSelectedOrder(null);
                  setRefundConfirm(false);
                }} className="p-1 hover:bg-gray-100 rounded">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Items */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Товары</h4>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start bg-gray-50 rounded-lg p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name || 'Товар'}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity || 1} шт × {formatMoney(item.price)}                          {item.discount > 0 && ` (скидка ${item.discount}%)`}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-900 ml-4">
                        {formatMoney(item.total || (item.price * (item.quantity || 1)))}                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Способ оплаты</span>
                  <span className="font-medium">
                    {selectedOrder.payment_method === '0' ? 'Наличные' : selectedOrder.payment_method === '1' ? 'Перевод' : 'Предоплата'}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Итого</span>
                  <span className="text-green-600">{formatMoney(selectedOrder.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Shake animation style */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
