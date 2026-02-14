import React, { useState, useEffect, useMemo } from 'react';
import { Clock, RussianRuble, TrendingUp, Users, Search, ChevronDown, ChevronUp, X, Eye, Trash2, Play, Square, Pencil, Check, ChevronRight, RotateCcw, Package } from 'lucide-react';
import { getAllShifts, getUsers, deleteShift, updateShift } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';

export default function ShiftsDesktop() {
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [filterCourier, setFilterCourier] = useState('');
  const [filterCity, setFilterCity] = useState([]);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('month');

  const [sortField, setSortField] = useState('start');
  const [sortDir, setSortDir] = useState('desc');

  const [selectedShift, setSelectedShift] = useState(null);
  const [expandedSale, setExpandedSale] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeHover, setActiveHover] = useState(false);
  const [showCourierStats, setShowCourierStats] = useState(false);

  const isAdmin = pb.authStore.model?.role === 'admin';

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selectedShift) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedShift]);

  useEffect(() => {
    const now = new Date();
    let from = new Date();
    const toLocal = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    switch (filterPeriod) {
      case 'today': from.setHours(0,0,0,0); break;
      case 'week': from.setDate(now.getDate() - 7); break;
      case 'month': from.setMonth(now.getMonth() - 1); break;
      case 'all': from = new Date('2020-01-01'); break;
      case 'custom': return;
      default: from.setMonth(now.getMonth() - 1);
    }
    setFilterDateFrom(toLocal(from));
    setFilterDateTo(toLocal(now));
  }, [filterPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shiftsData, usersData] = await Promise.all([getAllShifts(), getUsers()]);
      setShifts(shiftsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (shift) => {
    if (!window.confirm(`Удалить смену ${shift.expand?.user?.name || ''} от ${fmtDate(shift.start)}?`)) return;
    try {
      await deleteShift(shift.id);
      setSelectedShift(null);
      await loadData();
    } catch (err) {
      alert('Ошибка удаления: ' + (err.message || ''));
    }
  };

  const handleForceClose = async (shift) => {
    if (!window.confirm(`Принудительно закрыть смену ${shift.expand?.user?.name || ''}?`)) return;
    try {
      await updateShift(shift.id, {
        end: new Date().toISOString(),
        status: 'closed',
        edited_at: new Date().toISOString(),
        edited_by: pb.authStore.model?.name || 'Admin'
      });
      setSelectedShift(null);
      await loadData();
    } catch (err) {
      alert('Ошибка закрытия: ' + (err.message || ''));
    }
  };

  const startEdit = (shift) => {
    setEditingShift(shift.id);
    setEditForm({
      totalAmount: shift.totalAmount || 0,
      totalItems: shift.totalItems || 0,
    });
  };

  const saveEdit = async () => {
    try {
      setSaving(true);
      await updateShift(editingShift, {
        ...editForm,
        edited_at: new Date().toISOString(),
        edited_by: pb.authStore.model?.name || 'Admin'
      });
      setEditingShift(null);
      const updatedShifts = shifts.map(s => s.id === editingShift ? { ...s, ...editForm, edited_at: new Date().toISOString(), edited_by: pb.authStore.model?.name } : s);
      setShifts(updatedShifts);
      if (selectedShift?.id === editingShift) {
        setSelectedShift(prev => ({ ...prev, ...editForm, edited_at: new Date().toISOString() }));
      }
    } catch (err) {
      alert('Ошибка сохранения: ' + (err.message || ''));
    } finally {
      setSaving(false);
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
      if (user && user.role === 'worker') map.set(user.id, user.name);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [shifts]);

  const activeShifts = useMemo(() => shifts.filter(s => s.status === 'active'), [shifts]);
  const activeCities = useMemo(() => {
    const map = {};
    activeShifts.forEach(s => {
      const city = s.city || 'Не указан';
      const name = s.expand?.user?.name || '—';
      if (!map[city]) map[city] = [];
      map[city].push(name);
    });
    return map;
  }, [activeShifts]);

  const filteredShifts = useMemo(() => {
    let result = [...shifts];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => (s.expand?.user?.name || '').toLowerCase().includes(q) || (s.city || '').toLowerCase().includes(q));
    }
    if (filterCourier) result = result.filter(s => s.user === filterCourier);
    if (filterCity.length > 0) result = result.filter(s => filterCity.includes(s.city));
    if (filterDateFrom) {
      const from = new Date(filterDateFrom); from.setHours(0,0,0,0);
      result = result.filter(s => new Date(s.start) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo); to.setHours(23,59,59,999);
      result = result.filter(s => new Date(s.start) <= to);
    }
    result.sort((a, b) => {
      let aV, bV;
      switch (sortField) {
        case 'start': aV = new Date(a.start).getTime(); bV = new Date(b.start).getTime(); break;
        case 'totalAmount': aV = a.totalAmount||0; bV = b.totalAmount||0; break;
        case 'totalItems': aV = a.totalItems||0; bV = b.totalItems||0; break;
        case 'duration':
          aV = a.end ? new Date(a.end)-new Date(a.start) : 0;
          bV = b.end ? new Date(b.end)-new Date(b.start) : 0; break;
        case 'city': return sortDir==='asc' ? (a.city||'').localeCompare(b.city||'') : (b.city||'').localeCompare(a.city||'');
        case 'courier': return sortDir==='asc' ? (a.expand?.user?.name||'').localeCompare(b.expand?.user?.name||'') : (b.expand?.user?.name||'').localeCompare(a.expand?.user?.name||'');
        default: aV=0; bV=0;
      }
      return sortDir==='asc' ? aV-bV : bV-aV;
    });
    return result;
  }, [shifts, search, filterCourier, filterCity, filterDateFrom, filterDateTo, sortField, sortDir]);

  const stats = useMemo(() => {
    const totalSum = filteredShifts.reduce((s, sh) => s + (sh.totalAmount||0), 0);
    const totalCount = filteredShifts.length;
    const avgShift = totalCount > 0 ? totalSum / totalCount : 0;
    const totalSales = filteredShifts.reduce((s, sh) => s + (sh.totalItems||0), 0);
    const uniqueCouriers = new Set(filteredShifts.map(s => s.user)).size;
    return { totalSum, totalCount, avgShift, totalSales, uniqueCouriers };
  }, [filteredShifts]);

  const courierStats = useMemo(() => {
    const map = {};
    filteredShifts.forEach(s => {
      const name = s.expand?.user?.name || '—';
      const id = s.user;
      if (!map[id]) map[id] = { name, shifts: 0, revenue: 0, items: 0 };
      map[id].shifts++;
      map[id].revenue += s.totalAmount || 0;
      map[id].items += s.totalItems || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredShifts]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SI = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />;
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—';
  const fmtTime = (s) => s ? new Date(s).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' }) : '';
  const fmtDur = (start, end) => {
    if (!start || !end) return '—';
    const diff = new Date(end) - new Date(start);
    if (diff <= 0) return '0м';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  };
  const fmtMoney = (v) => (v || 0).toLocaleString('ru-RU');
  const payLabel = { '0':'Наличные', '1':'Перевод', '2':'Предоплата', 'cash':'Наличные', 'transfer':'Перевод', 'prepaid':'Предоплата' };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-3">
        {/* Active shifts with hover */}
        <div
          className="bg-white rounded-xl shadow-sm p-4 relative cursor-pointer"
          onMouseEnter={() => setActiveHover(true)}
          onMouseLeave={() => setActiveHover(false)}
        >
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Play size={16} className="text-green-500" />
            <span className="text-sm">Активные</span>
          </div>
          <p className="text-xl font-bold text-green-600">{activeShifts.length}</p>
          {activeHover && activeShifts.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border p-3 z-50 min-w-[200px]">
              {Object.entries(activeCities).map(([city, names]) => (
                <div key={city} className="mb-2 last:mb-0">
                  <p className="text-xs font-semibold text-gray-700">{city}</p>
                  {names.map((n, i) => <p key={i} className="text-xs text-gray-500 pl-2">• {n}</p>)}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Clock size={18} /><span className="text-sm">Смен</span></div>
          <p className="text-xl font-bold text-gray-900">{stats.totalCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><RussianRuble size={18} /><span className="text-sm">Выручка</span></div>
          <p className="text-xl font-bold text-gray-900">{fmtMoney(stats.totalSum)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><TrendingUp size={18} /><span className="text-sm">Ср./смена</span></div>
          <p className="text-xl font-bold text-gray-900">{fmtMoney(Math.round(stats.avgShift))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Users size={18} /><span className="text-sm">Курьеров</span></div>
          <p className="text-xl font-bold text-gray-900">{stats.uniqueCouriers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Package size={18} /><span className="text-sm">Продаж</span></div>
          <p className="text-xl font-bold text-gray-900">{stats.totalSales}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {['today','week','month','all','custom'].map(id => (
              <button key={id} onClick={() => setFilterPeriod(id)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filterPeriod===id ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-800'}`}>
                {{today:'Сегодня',week:'Неделя',month:'Месяц',all:'Всё',custom:'Период'}[id]}
              </button>
            ))}
          </div>
          {filterPeriod === 'custom' && (
            <>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
              <span className="text-gray-400">—</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
            </>
          )}
          <select value={filterCourier} onChange={e => setFilterCourier(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="">Все курьеры</option>
            {couriers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <div className="flex items-center gap-1.5 flex-wrap">
            {cities.map(c => (
              <button key={c} onClick={() => setFilterCity(p => p.includes(c) ? p.filter(x=>x!==c) : [...p,c])}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${filterCity.includes(c) ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по курьеру, городу..." className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm" />
          </div>
          {(filterCourier || filterCity.length > 0 || search) && (
            <button onClick={() => { setFilterCourier(''); setFilterCity([]); setSearch(''); }} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('start')}><div className="flex items-center gap-1">Дата <SI field="start" /></div></th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('courier')}><div className="flex items-center gap-1">Курьер <SI field="courier" /></div></th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort('city')}><div className="flex items-center gap-1">Город <SI field="city" /></div></th>
                <th className="px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort('duration')}><div className="flex items-center justify-center gap-1">Время <SI field="duration" /></div></th>
                <th className="px-4 py-3 text-center cursor-pointer select-none" onClick={() => handleSort('totalItems')}><div className="flex items-center justify-center gap-1">Продаж <SI field="totalItems" /></div></th>
                <th className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('totalAmount')}><div className="flex items-center justify-end gap-1">Выручка <SI field="totalAmount" /></div></th>
                <th className="px-4 py-3 text-center">Статус</th>
                <th className="px-4 py-3 text-center w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredShifts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Нет смен за выбранный период</td></tr>
              ) : filteredShifts.map(shift => (
                <tr key={shift.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelectedShift(shift); setExpandedSale(null); }}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{fmtDate(shift.start)}</div>
                    <div className="text-xs text-gray-400">{fmtTime(shift.start)} — {fmtTime(shift.end)}</div>
                    {shift.edited_at && <div className="text-[10px] text-amber-500 mt-0.5">✎ ред. {fmtDate(shift.edited_at)}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{shift.expand?.user?.name || '—'}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{shift.city || '—'}</span></td>
                  <td className="px-4 py-3 text-center text-gray-600">{fmtDur(shift.start, shift.end)}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{shift.totalItems || 0}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{fmtMoney(shift.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${shift.status==='active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {shift.status === 'active' ? 'Активна' : 'Закрыта'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {isAdmin && shift.status === 'active' && (
                        <button onClick={() => handleForceClose(shift)} className="p-1 hover:bg-orange-50 rounded text-gray-400 hover:text-orange-600" title="Закрыть смену"><Square size={14} /></button>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDeleteShift(shift)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600" title="Удалить"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredShifts.length > 0 && (
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">Показано: {filteredShifts.length} из {shifts.length}</span>
            <span className="font-semibold text-gray-900">Итого: {fmtMoney(stats.totalSum)}</span>
          </div>
        )}
      </div>

      {/* Courier comparison - collapsible */}
      {courierStats.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button onClick={() => setShowCourierStats(!showCourierStats)} className="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-gray-50 transition-colors">
            <span className="font-medium text-gray-700">📊 Сравнение курьеров</span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showCourierStats ? 'rotate-180' : ''}`} />
          </button>
          {showCourierStats && (
            <div className="px-4 pb-4">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-400 border-b">
                  <th className="text-left py-2">Курьер</th>
                  <th className="text-center py-2">Смен</th>
                  <th className="text-center py-2">Продаж</th>
                  <th className="text-right py-2">Выручка</th>
                  <th className="text-right py-2">Ср./смена</th>
                </tr></thead>
                <tbody>
                  {courierStats.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 font-medium text-gray-800">{c.name}</td>
                      <td className="py-2 text-center text-gray-600">{c.shifts}</td>
                      <td className="py-2 text-center text-gray-600">{c.items}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{fmtMoney(c.revenue)}</td>
                      <td className="py-2 text-right text-gray-600">{fmtMoney(Math.round(c.revenue / c.shifts))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setSelectedShift(null); setEditingShift(null); }}>
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="shrink-0 border-b px-6 py-4 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Смена — {selectedShift.expand?.user?.name || '—'}</h3>
                <p className="text-sm text-gray-500">
                  {fmtDate(selectedShift.start)} · {fmtTime(selectedShift.start)} — {fmtTime(selectedShift.end) || 'сейчас'} · {selectedShift.city || '—'}
                </p>
                {selectedShift.edited_at && (
                  <p className="text-xs text-amber-500 mt-1">✎ Редактировано {new Date(selectedShift.edited_at).toLocaleString('ru-RU')} — {selectedShift.edited_by || 'Admin'}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && selectedShift.status === 'active' && (
                  <button onClick={() => handleForceClose(selectedShift)} className="px-3 py-1.5 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1">
                    <Square size={12} /> Закрыть
                  </button>
                )}
                {isAdmin && editingShift !== selectedShift.id && (
                  <button onClick={() => startEdit(selectedShift)} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1">
                    <Pencil size={12} /> Ред.
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => handleDeleteShift(selectedShift)} className="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">Удалить</button>
                )}
                <button onClick={() => { setSelectedShift(null); setEditingShift(null); }} className="p-1 hover:bg-gray-100 rounded"><X size={20} className="text-gray-500" /></button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Stats */}
              {editingShift === selectedShift.id ? (
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-blue-700">Редактирование</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Выручка</label>
                      <input type="number" value={editForm.totalAmount} onChange={e => setEditForm(p => ({...p, totalAmount: Number(e.target.value)}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Кол-во продаж</label>
                      <input type="number" value={editForm.totalItems} onChange={e => setEditForm(p => ({...p, totalItems: Number(e.target.value)}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                      <Check size={14} /> {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button onClick={() => setEditingShift(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">Отмена</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Длительность</p>
                    <p className="text-base font-bold">{fmtDur(selectedShift.start, selectedShift.end)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Продаж</p>
                    <p className="text-base font-bold">{selectedShift.totalItems || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Наименований</p>
                    <p className="text-base font-bold">{(() => {
                      const names = new Set();
                      (selectedShift.sales || []).forEach(s => (s.items || []).forEach(i => names.add(i.name)));
                      return names.size;
                    })()}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Выручка</p>
                    <p className="text-base font-bold text-green-600">{fmtMoney(selectedShift.totalAmount)}</p>
                  </div>
                </div>
              )}

              {/* Sales list */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Продажи за смену ({(selectedShift.sales || []).length})</p>
                {(selectedShift.sales || []).length === 0 ? (
                  <p className="text-gray-400 text-center py-4 text-sm">Нет данных о продажах</p>
                ) : (
                  <div className="space-y-1.5">
                    {(selectedShift.sales || []).map((sale, idx) => {
                      const isRef = sale.status === 'refund';
                      const isExpanded = expandedSale === idx;
                      const items = sale.items || [];
                      const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
                      return (
                        <div key={idx} className={`rounded-xl border transition-all ${isRef ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-gray-50/50'}`}>
                          <button
                            onClick={() => setExpandedSale(isExpanded ? null : idx)}
                            className="w-full px-4 py-2.5 flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400 w-12">{sale.created ? new Date(sale.created).toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) : '—'}</span>
                              <span className="text-sm text-gray-700">{totalQty} шт · {payLabel[sale.payment_method] || '—'}</span>
                              {isRef && <span className="text-[10px] px-1.5 py-0.5 bg-blue-200 text-blue-700 rounded font-medium">Возврат</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${isRef ? 'text-blue-500 line-through' : 'text-gray-900'}`}>{fmtMoney(sale.total)} ₽</span>
                              <ChevronRight size={14} className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-3 pt-0 border-t border-gray-100">
                              {items.map((item, i) => (
                                <div key={i} className="flex justify-between py-1.5 text-xs">
                                  <span className="text-gray-700">{item.name}</span>
                                  <span className="text-gray-500">{item.quantity || 1} × {fmtMoney(item.price)} = {fmtMoney((item.price||0)*(item.quantity||1))} ₽</span>
                                </div>
                              ))}
                              {sale.discount > 0 && (
                                <div className="flex justify-between py-1.5 text-xs text-green-600 border-t border-gray-100 mt-1 pt-1.5">
                                  <span>Скидка</span>
                                  <span>-{sale.discount}{sale.discount_type === 'percentage' ? '%' : ' ₽'}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
