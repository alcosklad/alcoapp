import React, { useState, useEffect, useMemo } from 'react';
import { Clock, RussianRuble, TrendingUp, Users, Search, ChevronDown, ChevronUp, X, Eye, Trash2 } from 'lucide-react';
import { getAllShifts, getUsers, deleteShift } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';

export default function ShiftsDesktop() {
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filters
  const [filterCourier, setFilterCourier] = useState('');
  const [filterCity, setFilterCity] = useState([]);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('month');

  // Sort
  const [sortField, setSortField] = useState('start');
  const [sortDir, setSortDir] = useState('desc');

  // Detail modal
  const [selectedShift, setSelectedShift] = useState(null);

  const isAdmin = pb.authStore.model?.role === 'admin';

  const handleDeleteShift = async (shift) => {
    if (!window.confirm(`Удалить смену ${shift.expand?.user?.name || ''} от ${formatDate(shift.start)}?`)) return;
    try {
      await deleteShift(shift.id);
      setSelectedShift(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting shift:', err);
      alert('Ошибка удаления: ' + (err.message || ''));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        return;
      default:
        from.setMonth(now.getMonth() - 1);
    }
    setFilterDateFrom(from.toISOString().split('T')[0]);
    setFilterDateTo(now.toISOString().split('T')[0]);
  }, [filterPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shiftsData, usersData] = await Promise.all([
        getAllShifts(),
        getUsers()
      ]);
      setShifts(shiftsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading shifts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const cities = useMemo(() => {
    const set = new Set(shifts.map(s => s.city).filter(Boolean));
    return [...set].sort();
  }, [shifts]);

  const couriers = useMemo(() => {
    const map = new Map();
    shifts.forEach(s => {
      const user = s.expand?.user;
      if (user && user.role === 'worker') {
        map.set(user.id, user.name);
      }
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    let result = [...shifts];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => {
        const userName = s.expand?.user?.name || '';
        const city = s.city || '';
        return userName.toLowerCase().includes(q) || city.toLowerCase().includes(q);
      });
    }

    if (filterCourier) {
      result = result.filter(s => s.user === filterCourier);
    }

    if (filterCity.length > 0) {
      result = result.filter(s => filterCity.includes(s.city));
    }

    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(s => new Date(s.start) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(s => new Date(s.start) <= to);
    }

    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'start':
          aVal = new Date(a.start).getTime();
          bVal = new Date(b.start).getTime();
          break;
        case 'totalAmount':
          aVal = a.totalAmount || 0;
          bVal = b.totalAmount || 0;
          break;
        case 'totalItems':
          aVal = a.totalItems || 0;
          bVal = b.totalItems || 0;
          break;
        case 'duration':
          aVal = a.end ? new Date(a.end) - new Date(a.start) : 0;
          bVal = b.end ? new Date(b.end) - new Date(b.start) : 0;
          break;
        case 'city':
          aVal = a.city || '';
          bVal = b.city || '';
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'courier':
          aVal = a.expand?.user?.name || '';
          bVal = b.expand?.user?.name || '';
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        default:
          aVal = 0; bVal = 0;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [shifts, search, filterCourier, filterCity, filterDateFrom, filterDateTo, sortField, sortDir]);

  const stats = useMemo(() => {
    const totalSum = filteredShifts.reduce((s, sh) => s + (sh.totalAmount || 0), 0);
    const totalCount = filteredShifts.length;
    const avgShift = totalCount > 0 ? totalSum / totalCount : 0;
    const totalSales = filteredShifts.reduce((s, sh) => s + (sh.totalItems || 0), 0);
    const uniqueCouriers = new Set(filteredShifts.map(s => s.user)).size;
    return { totalSum, totalCount, avgShift, totalSales, uniqueCouriers };
  }, [filteredShifts]);

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
    return new Date(str).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatTime = (str) => {
    if (!str) return '';
    return new Date(str).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return '—';
    const diff = new Date(end) - new Date(start);
    if (diff <= 0) return '0м';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
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
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <RussianRuble size={18} />
            <span className="text-sm">Выручка</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatMoney(stats.totalSum)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock size={18} />
            <span className="text-sm">Смен</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.totalCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp size={18} />
            <span className="text-sm">Ср. выручка/смена</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatMoney(Math.round(stats.avgShift))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users size={18} />
            <span className="text-sm">Курьеров</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.uniqueCouriers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <RussianRuble size={18} />
            <span className="text-sm">Всего продаж</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.totalSales}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
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

          {/* City filter - multi-select chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {cities.map(c => {
              const isSelected = filterCity.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => setFilterCity(prev =>
                    isSelected ? prev.filter(x => x !== c) : [...prev, c]
                  )}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по курьеру, городу..."
              className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm"
            />
          </div>

          {(filterCourier || filterCity.length > 0 || search) && (
            <button
              onClick={() => { setFilterCourier(''); setFilterCity([]); setSearch(''); }}
              className="text-gray-400 hover:text-gray-600 p-1"
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
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('start')}>
                  <div className="flex items-center gap-1">Дата <SortIcon field="start" /></div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('courier')}>
                  <div className="flex items-center gap-1">Курьер <SortIcon field="courier" /></div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('city')}>
                  <div className="flex items-center gap-1">Город <SortIcon field="city" /></div>
                </th>
                <th className="px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort('duration')}>
                  <div className="flex items-center justify-center gap-1">Длительность <SortIcon field="duration" /></div>
                </th>
                <th className="px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort('totalItems')}>
                  <div className="flex items-center justify-center gap-1">Продаж <SortIcon field="totalItems" /></div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('totalAmount')}>
                  <div className="flex items-center justify-end gap-1">Выручка <SortIcon field="totalAmount" /></div>
                </th>
                <th className="px-4 py-3 text-center">Статус</th>
                <th className="px-4 py-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Нет смен за выбранный период
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{formatDate(shift.start)}</div>
                      <div className="text-xs text-gray-400">{formatTime(shift.start)} — {formatTime(shift.end)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {shift.expand?.user?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {shift.city || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {formatDuration(shift.start, shift.end)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {shift.totalItems || 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatMoney(shift.totalAmount)}                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        shift.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {shift.status === 'active' ? 'Активна' : 'Закрыта'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedShift(shift)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                          title="Детали"
                        >
                          <Eye size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteShift(shift)}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                            title="Удалить"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredShifts.length > 0 && (
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Показано: {filteredShifts.length} из {shifts.length}
            </span>
            <span className="font-semibold text-gray-900">
              Итого: {formatMoney(stats.totalSum)}            </span>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedShift(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">
                  Смена — {selectedShift.expand?.user?.name || '—'}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatDate(selectedShift.start)} {formatTime(selectedShift.start)} — {formatTime(selectedShift.end)} | {selectedShift.city || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteShift(selectedShift)}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    Удалить
                  </button>
                )}
                <button onClick={() => setSelectedShift(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Длительность</p>
                  <p className="font-semibold">{formatDuration(selectedShift.start, selectedShift.end)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Продаж</p>
                  <p className="font-semibold">{selectedShift.totalItems || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Выручка</p>
                  <p className="font-semibold text-green-600">{formatMoney(selectedShift.totalAmount)}</p>
                </div>
              </div>

              {/* Sales list */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Продажи за смену</h4>
                {selectedShift.sales && selectedShift.sales.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedShift.sales.map((sale, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {sale.created ? new Date(sale.created).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {sale.items || 0} товаров · {sale.payment_method === 'cash' ? 'Наличные' : 'Безнал'}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatMoney(sale.total)}                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">Нет данных о продажах</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
