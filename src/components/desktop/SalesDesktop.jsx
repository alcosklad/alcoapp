import React, { useState, useEffect, useMemo } from 'react';
import { RussianRuble, TrendingUp, CreditCard, Banknote, Search, ChevronDown, ChevronUp, X, Trash2, RotateCcw, Pencil, Check, Package } from 'lucide-react';
import { getAllOrders, getUsers, deleteOrder, refundOrder, updateOrder, getProducts } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';
import { getOrFetch, invalidate } from '../../lib/cache';

export default function SalesDesktop({ activeTab }) {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [filterCourier, setFilterCourier] = useState('');
  const [filterCity, setFilterCity] = useState([]);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [filterStatus, setFilterStatus] = useState('all');

  const [sortField, setSortField] = useState('local_time');
  const [sortDir, setSortDir] = useState('desc');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundShaking, setRefundShaking] = useState(false);
  const [refundConfirm, setRefundConfirm] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const isAdmin = pb.authStore.model?.role === 'admin';
  const isWorker = pb.authStore.model?.role === 'worker';

  useEffect(() => {
    if (selectedOrder) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedOrder]);

  useEffect(() => { loadData(); }, []);

  // Re-fetch when tab becomes active (orders may have been created on another device)
  useEffect(() => {
    if (activeTab === 'sales') {
      // Bypass cache entirely — direct API call
      getAllOrders().then(fresh => {
        if (fresh) {
          setOrders(fresh);
          // Update cache for future reads
          invalidate('orders');
          try {
            const entry = { data: fresh, ts: Date.now(), ttl: 60000 };
            localStorage.setItem('ns_cache_orders:all', JSON.stringify(entry));
          } catch {}
        }
      }).catch(err => console.error('Error refreshing orders:', err));
    }
  }, [activeTab]);

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
      const [ordersData, usersData, productsData] = await Promise.all([
        getOrFetch('orders:all', () => getAllOrders(), 60000, (fresh) => setOrders(fresh)),
        getOrFetch('users:all', () => getUsers(), 300000),
        getOrFetch('products:all', () => getProducts(), 300000, (fresh) => setProducts(fresh))
      ]);
      setOrders(ordersData);
      setUsers(usersData);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundOrder = async (order) => {
    if (!refundConfirm) {
      setRefundShaking(true);
      setTimeout(() => setRefundShaking(false), 600);
      setRefundConfirm(true);
      setTimeout(() => setRefundConfirm(false), 5000);
      return;
    }
    try {
      setRefundLoading(true);
      await refundOrder(order.id);
      invalidate('orders');
      invalidate('stocks');
      invalidate('dashboard');
      setSelectedOrder(null);
      setRefundConfirm(false);
      await loadData();
    } catch (err) {
      alert('Ошибка возврата: ' + (err.message || ''));
    } finally {
      setRefundLoading(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Удалить продажу #${order.id?.slice(-6)} на сумму ${fmtMoney(order.total)}?`)) return;
    try {
      await deleteOrder(order.id);
      invalidate('orders');
      invalidate('dashboard');
      setSelectedOrder(null);
      await loadData();
    } catch (err) {
      alert('Ошибка удаления: ' + (err.message || ''));
    }
  };

  const startEdit = (order) => {
    setEditingOrder(order.id);
    setEditForm({
      items: (order.items || []).map(item => ({ ...item })),
      payment_method: order.payment_method || '0',
      discount: order.discount || 0,
      discount_type: order.discount_type || 'percentage',
    });
  };

  const editSubtotal = (editForm.items || []).reduce((s, item) => s + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const editTotal = (() => {
    let t = editSubtotal;
    if (editForm.discount > 0) {
      if (editForm.discount_type === 'percentage') {
        t = t * (1 - editForm.discount / 100);
      } else {
        t = t - editForm.discount;
      }
    }
    return Math.max(0, Math.round(t * 100) / 100);
  })();

  const saveEdit = async () => {
    try {
      setSaving(true);
      const saveData = {
        items: editForm.items,
        payment_method: editForm.payment_method,
        discount: editForm.discount,
        discount_type: editForm.discount_type,
        subtotal: editSubtotal,
        total: editTotal,
        edited_at: new Date().toISOString(),
        edited_by: pb.authStore.model?.name || 'Admin'
      };
      await updateOrder(editingOrder, saveData);
      setEditingOrder(null);
      const updated = orders.map(o => o.id === editingOrder ? { ...o, ...saveData } : o);
      setOrders(updated);
      if (selectedOrder?.id === editingOrder) {
        setSelectedOrder(prev => ({ ...prev, ...saveData }));
      }
    } catch (err) {
      alert('Ошибка сохранения: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const cities = useMemo(() => [...new Set(orders.map(o => o.city).filter(Boolean))].sort(), [orders]);
  const couriers = useMemo(() => {
    const map = new Map();
    orders.forEach(o => { const u = o.expand?.user; if (u && u.role === 'worker') map.set(u.id, u.name); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const refundCount = useMemo(() => orders.filter(o => o.status === 'refund').length, [orders]);

  const productCostMap = useMemo(() => {
    const byId = {};
    const byName = {};
    (products || []).forEach(p => {
      if (p.id && p.cost) byId[p.id] = p.cost;
      if (p.name && p.cost) byName[p.name.toLowerCase()] = p.cost;
    });
    return { byId, byName };
  }, [products]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    if (filterStatus === 'active') result = result.filter(o => o.status !== 'refund');
    else if (filterStatus === 'refund') result = result.filter(o => o.status === 'refund');
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o => {
        const userName = o.expand?.user?.name || '';
        const city = o.city || '';
        const itemNames = (o.items || []).map(i => i.name || '').join(' ');
        return userName.toLowerCase().includes(q) || city.toLowerCase().includes(q) || itemNames.toLowerCase().includes(q);
      });
    }
    if (filterCourier) result = result.filter(o => o.user === filterCourier);
    if (filterCity.length > 0) result = result.filter(o => filterCity.includes(o.city));
    if (filterDateFrom) {
      const from = new Date(filterDateFrom); from.setHours(0,0,0,0);
      result = result.filter(o => {
        const raw = o.created_date || o.created || '';
        const d = new Date(raw.replace(' ', 'T'));
        return !isNaN(d) && d >= from;
      });
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo); to.setHours(23,59,59,999);
      result = result.filter(o => {
        const raw = o.created_date || o.created || '';
        const d = new Date(raw.replace(' ', 'T'));
        return !isNaN(d) && d <= to;
      });
    }
    result.sort((a, b) => {
      let aV, bV;
      switch (sortField) {
        case 'local_time': aV = new Date((a.created_date||a.created||'').replace(' ','T')).getTime()||0; bV = new Date((b.created_date||b.created||'').replace(' ','T')).getTime()||0; break;
        case 'total': aV = a.total||0; bV = b.total||0; break;
        case 'city': return sortDir==='asc' ? (a.city||'').localeCompare(b.city||'') : (b.city||'').localeCompare(a.city||'');
        case 'courier': return sortDir==='asc' ? (a.expand?.user?.name||'').localeCompare(b.expand?.user?.name||'') : (b.expand?.user?.name||'').localeCompare(a.expand?.user?.name||'');
        case 'items_count': aV=(a.items||[]).length; bV=(b.items||[]).length; break;
        case 'order_number': return sortDir==='asc' ? (a.order_number||'').localeCompare(b.order_number||'') : (b.order_number||'').localeCompare(a.order_number||'');
        case 'cost_total': aV=a.cost_total||0; bV=b.cost_total||0; break;
        case 'profit': aV=a.profit||0; bV=b.profit||0; break;
        default: aV=0; bV=0;
      }
      return sortDir==='asc' ? aV-bV : bV-aV;
    });
    return result;
  }, [orders, search, filterCourier, filterCity, filterDateFrom, filterDateTo, sortField, sortDir, filterStatus]);

  const stats = useMemo(() => {
    const active = filteredOrders.filter(o => o.status !== 'refund');
    const totalSum = active.reduce((s, o) => s + (o.total||0), 0);
    const totalCount = filteredOrders.length;
    const avgCheck = active.length > 0 ? totalSum / active.length : 0;
    const cashSum = active.reduce((s, o) => s + (o.payment_method==='0' ? (o.total||0) : 0), 0);
    const transferSum = active.reduce((s, o) => s + (o.payment_method==='1' ? (o.total||0) : 0), 0);
    const prepaidSum = active.reduce((s, o) => s + (o.payment_method==='2' ? (o.total||0) : 0), 0);
    const totalItems = active.reduce((s, o) => s + (o.items||[]).reduce((sum, i) => sum+(i.quantity||1), 0), 0);
    const refundSum = filteredOrders.filter(o => o.status==='refund').reduce((s,o) => s+(o.total||0), 0);
    return { totalSum, totalCount, avgCheck, cashSum, transferSum, prepaidSum, totalItems, refundSum };
  }, [filteredOrders]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d==='asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SI = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-gray-300" />;
    return sortDir==='asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />;
  };

  const safeParse = (s) => s ? new Date(String(s).replace(' ', 'T')) : null;
  const fmtDate = (s) => { const d = safeParse(s); return d && !isNaN(d) ? d.toLocaleDateString('ru-RU', {day:'2-digit',month:'2-digit',year:'2-digit'}) : '—'; };
  const fmtTime = (s) => { const d = safeParse(s); return d && !isNaN(d) ? d.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) : ''; };
  const fmtMoney = (v) => (v||0).toLocaleString('ru-RU');
  const payLabel = {'0':'Наличные','1':'Перевод','2':'Предоплата','cash':'Наличные','transfer':'Перевод','prepaid':'Предоплата'};

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><RussianRuble size={18} /><span className="text-sm">Выручка</span></div>
          <p className="text-xl font-bold text-gray-900">{fmtMoney(stats.totalSum)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Package size={18} /><span className="text-sm">Продаж</span></div>
          <p className="text-xl font-bold text-gray-900">{stats.totalCount}</p>
          <p className="text-xs text-gray-400">{stats.totalItems} товаров</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><TrendingUp size={18} /><span className="text-sm">Ср. чек</span></div>
          <p className="text-xl font-bold text-gray-900">{fmtMoney(Math.round(stats.avgCheck))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><Banknote size={18} /><span className="text-sm">Наличные</span></div>
          <p className="text-xl font-bold text-green-600">{fmtMoney(stats.cashSum)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><CreditCard size={18} /><span className="text-sm">Перевод</span></div>
          <p className="text-xl font-bold text-blue-600">{fmtMoney(stats.transferSum)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1"><RotateCcw size={18} /><span className="text-sm">Возвраты</span></div>
          <p className="text-xl font-bold text-red-500">{fmtMoney(stats.refundSum)}</p>
          <p className="text-xs text-gray-400">{refundCount} шт</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        {/* Status tabs */}
        <div className="flex items-center gap-4 border-b pb-3">
          {[
            { id: 'all', label: 'Все', count: orders.length },
            { id: 'active', label: 'Продажи', count: orders.length - refundCount },
            { id: 'refund', label: 'Возвраты', count: refundCount },
          ].map(t => (
            <button key={t.id} onClick={() => setFilterStatus(t.id)}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${filterStatus===t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t.label} <span className="text-xs ml-1 opacity-60">{t.count}</span>
            </button>
          ))}
        </div>

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
          <div className="flex items-center gap-1 shrink-0 max-w-[400px] overflow-hidden">
            <button onClick={() => { const el = document.getElementById('cities-scroll'); if (el) el.scrollBy({left: -100, behavior: 'smooth'}); }}
              className="p-1 text-gray-400 hover:text-gray-600 shrink-0"><ChevronDown size={14} className="rotate-90" /></button>
            <div id="cities-scroll" className="flex items-center gap-1 overflow-x-auto scrollbar-hide" style={{scrollbarWidth:'none', msOverflowStyle:'none'}}>
              {cities.map(c => (
                <button key={c} onClick={() => setFilterCity(p => p.includes(c) ? p.filter(x=>x!==c) : [...p,c])}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors whitespace-nowrap shrink-0 ${filterCity.includes(c) ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {c}
                </button>
              ))}
            </div>
            <button onClick={() => { const el = document.getElementById('cities-scroll'); if (el) el.scrollBy({left: 100, behavior: 'smooth'}); }}
              className="p-1 text-gray-400 hover:text-gray-600 shrink-0"><ChevronDown size={14} className="-rotate-90" /></button>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по товарам, курьеру, городу..." className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm" />
          </div>
          {(filterCourier || filterCity.length > 0 || search) && (
            <button onClick={() => { setFilterCourier(''); setFilterCity([]); setSearch(''); }} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
          )}
        </div>
      </div>

      {/* Table — grouped by sale */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 cursor-pointer select-none" onClick={() => handleSort('order_number')}>
                  <div className="flex items-center gap-1">Наименование <SI field="order_number" /></div>
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-14">Кол-во</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500 w-16">Цена</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500 w-20">Себестоимость</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500 w-16 cursor-pointer select-none" onClick={() => handleSort('total')}>
                  <div className="flex items-center justify-end gap-1">Сумма <SI field="total" /></div>
                </th>
                <th className="px-2 py-2 text-right font-medium text-gray-500 w-24 cursor-pointer select-none" onClick={() => handleSort('cost_total')}>
                  <div className="flex items-center justify-end gap-1">Сумма себест. <SI field="cost_total" /></div>
                </th>
                <th className="px-2 py-2 text-right font-medium text-gray-500 w-16 cursor-pointer select-none" onClick={() => handleSort('profit')}>
                  <div className="flex items-center justify-end gap-1">Прибыль <SI field="profit" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-12 text-center text-gray-400">Нет продаж за выбранный период</td></tr>
              ) : filteredOrders.map(order => {
                const isRef = order.status === 'refund';
                const items = order.items || [];
                return (
                  <React.Fragment key={order.id}>
                    {/* Sale header row */}
                    <tr
                      className={`border-t-2 border-gray-200 cursor-pointer hover:bg-gray-50 ${isRef ? 'bg-blue-50/30' : 'bg-gray-50/50'}`}
                      onDoubleClick={() => { setSelectedOrder(order); setEditingOrder(null); setRefundConfirm(false); }}
                    >
                      <td className="px-3 py-1.5" colSpan={7}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-xs">{order.order_number || `#${order.id?.slice(-6)}`}</span>
                          {isRef && <span className="px-1 py-0.5 text-[9px] bg-blue-100 text-blue-700 rounded font-medium">ВОЗВРАТ</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${order.payment_method==='0'?'bg-green-50 text-green-600':order.payment_method==='1'?'bg-blue-50 text-blue-600':'bg-purple-50 text-purple-600'}`}>
                            {payLabel[order.payment_method] || '—'}
                          </span>
                          <span className="text-[10px] text-gray-500">{order.city || '—'}</span>
                          <span className="text-[10px] text-gray-400">
                            {fmtDate(order.created_date || order.created)} {fmtTime(order.created_date || order.created)}
                          </span>
                          {order.edited_at && <span className="text-[10px] text-amber-500">ред. {fmtDate(order.edited_at)}</span>}
                        </div>
                      </td>
                    </tr>
                    {/* Item rows */}
                    {items.map((item, idx) => {
                      const itemPrice = item.price || 0;
                      const itemCost = item.cost || productCostMap.byId[item.productId] || productCostMap.byName[(item.name||'').toLowerCase()] || 0;
                      const itemQty = item.quantity || 1;
                      const itemSum = itemPrice * itemQty;
                      const itemCostSum = itemCost * itemQty;
                      const itemProfit = itemPrice - itemCost;
                      return (
                        <tr key={`${order.id}-${idx}`} className={`border-b border-gray-50 hover:bg-blue-50/30 ${isRef ? 'opacity-60' : ''}`}>
                          <td className="px-3 py-1 pl-6">
                            <span className={`${isRef ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.name || 'Товар'}</span>
                          </td>
                          <td className={`px-2 py-1 text-center ${isRef ? 'line-through text-gray-400' : 'text-gray-600'}`}>{itemQty}</td>
                          <td className={`px-2 py-1 text-right ${isRef ? 'line-through text-gray-400' : 'text-gray-800'}`}>{fmtMoney(itemPrice)}</td>
                          <td className={`px-2 py-1 text-right ${isRef ? 'line-through text-gray-400' : 'text-gray-500'}`}>{fmtMoney(itemCost)}</td>
                          <td className={`px-2 py-1 text-right ${isRef ? 'line-through text-gray-400' : 'text-gray-800'}`}>{fmtMoney(itemSum)}</td>
                          <td className={`px-2 py-1 text-right ${isRef ? 'line-through text-gray-400' : 'text-gray-500'}`}>{fmtMoney(itemCostSum)}</td>
                          <td className={`px-2 py-1 text-right font-medium ${isRef ? 'line-through text-gray-400' : itemProfit > 0 ? 'text-green-600' : itemProfit < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {fmtMoney(itemProfit)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredOrders.length > 0 && (
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">Показано: {filteredOrders.length} продаж из {orders.length}</span>
            <span className="font-semibold text-gray-900">Итого: {fmtMoney(stats.totalSum)} ₽</span>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="shrink-0 border-b px-6 py-4 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Продажа {selectedOrder.order_number || `#${selectedOrder.id?.slice(-6)}`}</h3>
                  {selectedOrder.status === 'refund' && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-lg font-medium">Возврат</span>}
                </div>
                <p className="text-sm text-gray-500">
                  {fmtDate(selectedOrder.created_date || selectedOrder.created)} {fmtTime(selectedOrder.created_date || selectedOrder.created)} — {selectedOrder.expand?.user?.name || '—'} · {selectedOrder.city || '—'}
                </p>
                {selectedOrder.edited_at && (
                  <p className="text-xs text-amber-500 mt-1">✎ Редактировано {new Date(selectedOrder.edited_at).toLocaleString('ru-RU')} — {selectedOrder.edited_by || 'Admin'}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedOrder.status !== 'refund' && (isAdmin || isWorker) && (
                  <button onClick={() => handleRefundOrder(selectedOrder)} disabled={refundLoading}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${refundConfirm ? 'bg-red-600 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'} ${refundShaking ? 'animate-shake' : ''} disabled:opacity-50`}>
                    <RotateCcw size={14} />
                    {refundLoading ? 'Возврат...' : refundConfirm ? 'Подтвердить' : 'Возврат'}
                  </button>
                )}
                {isAdmin && editingOrder !== selectedOrder.id && (
                  <button onClick={() => startEdit(selectedOrder)} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1">
                    <Pencil size={12} /> Ред.
                  </button>
                )}
                {isAdmin && <button onClick={() => handleDeleteOrder(selectedOrder)} className="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">Удалить</button>}
                <button onClick={() => { setSelectedOrder(null); setRefundConfirm(false); setEditingOrder(null); }} className="p-1 hover:bg-gray-100 rounded"><X size={20} className="text-gray-500" /></button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Edit form */}
              {editingOrder === selectedOrder.id ? (
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-blue-700">Редактирование</p>
                  {/* Items */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium">Товары</p>
                    {(editForm.items || []).map((item, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_80px_80px_60px] gap-2 items-end">
                        <div>
                          {idx === 0 && <label className="text-[10px] text-gray-400">Название</label>}
                          <p className="text-sm text-gray-800 truncate mt-1">{item.name || 'Товар'}</p>
                        </div>
                        <div>
                          {idx === 0 && <label className="text-[10px] text-gray-400">Цена</label>}
                          <input type="number" value={item.price || ''} onChange={e => {
                            const items = [...editForm.items];
                            items[idx] = { ...items[idx], price: Number(e.target.value) || 0 };
                            setEditForm(p => ({ ...p, items }));
                          }} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                          {idx === 0 && <label className="text-[10px] text-gray-400">Кол-во</label>}
                          <input type="number" min="1" value={item.quantity || 1} onChange={e => {
                            const items = [...editForm.items];
                            items[idx] = { ...items[idx], quantity: Math.max(1, Number(e.target.value) || 1) };
                            setEditForm(p => ({ ...p, items }));
                          }} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                        </div>
                        <div className="text-right">
                          {idx === 0 && <label className="text-[10px] text-gray-400 block">Сумма</label>}
                          <p className="text-sm font-medium text-gray-700 py-1.5">{fmtMoney((item.price||0)*(item.quantity||1))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Discount + Payment */}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-blue-100">
                    <div>
                      <label className="text-xs text-gray-500">Скидка</label>
                      <div className="flex gap-1 mt-1">
                        <input type="number" value={editForm.discount} onChange={e => setEditForm(p => ({...p, discount: Number(e.target.value) || 0}))} className="w-full border rounded-lg px-2 py-2 text-sm" />
                        <select value={editForm.discount_type} onChange={e => setEditForm(p => ({...p, discount_type: e.target.value}))} className="border rounded-lg px-1 py-2 text-sm bg-white shrink-0">
                          <option value="percentage">%</option>
                          <option value="fixed">₽</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Оплата</label>
                      <select value={editForm.payment_method} onChange={e => setEditForm(p => ({...p, payment_method: e.target.value}))} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm bg-white">
                        <option value="0">Наличные</option>
                        <option value="1">Перевод</option>
                        <option value="2">Предоплата</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Итого</label>
                      <p className="text-lg font-bold text-green-600 mt-1">{fmtMoney(editTotal)} ₽</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                      <Check size={14} /> {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button onClick={() => setEditingOrder(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">Отмена</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Items */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Товары</h4>
                    <div className="space-y-2">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <div key={idx} className={`flex justify-between items-start rounded-lg p-3 ${selectedOrder.status==='refund' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${selectedOrder.status==='refund' ? 'text-blue-500 line-through' : 'text-gray-900'}`}>{item.name || 'Товар'}</p>
                            <p className="text-xs text-gray-500">{item.quantity || 1} шт × {fmtMoney(item.price)} ₽</p>
                          </div>
                          <p className={`text-sm font-medium ml-4 ${selectedOrder.status==='refund' ? 'text-blue-500 line-through' : 'text-gray-900'}`}>
                            {fmtMoney((item.price||0) * (item.quantity||1))} ₽
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="border-t pt-4 space-y-2">
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Скидка</span>
                        <span className="font-medium text-green-600">-{selectedOrder.discount} {selectedOrder.discount_type === 'percentage' ? '%' : '₽'}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Оплата</span>
                      <span className="font-medium">{payLabel[selectedOrder.payment_method] || '—'}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold">
                      <span>Итого</span>
                      <span className={selectedOrder.status==='refund' ? 'text-blue-500 line-through' : 'text-green-600'}>{fmtMoney(selectedOrder.total)} ₽</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-4px)} 20%,40%,60%,80%{transform:translateX(4px)} }
        .animate-shake { animation: shake 0.6s ease-in-out; }
      `}</style>
    </div>
  );
}
