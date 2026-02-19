import React, { useState, useEffect, useMemo } from 'react';
import { getDashboardStats, getSuppliers, getAllOrders, getReceptions } from '../../lib/pocketbase';
import { getOrFetch } from '../../lib/cache';
import { Package, TrendingUp, ShoppingCart, AlertTriangle, FileText, Calendar, Clock, BarChart3, X, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import pb from '../../lib/pocketbase';

export default function DashboardDesktop({ user }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSaleValue: 0,
    totalPurchaseValue: 0,
    stockBreakdown: [],
    receptionsCount: 0,
    staleProductsCount: 0,
    staleProducts: [],
    salesDay: { count: 0, totalAmount: 0 },
    salesWeek: { count: 0, totalAmount: 0 },
    salesMonth: { count: 0, totalAmount: 0 },
    salesHalfYear: { count: 0, totalAmount: 0 }
  });
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStaleProducts, setShowStaleProducts] = useState(false);
  const [showStockBreakdown, setShowStockBreakdown] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [receptionsData, setReceptionsData] = useState([]);
  const [chartView, setChartView] = useState('purchases'); // 'purchases' or 'cities'
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [chartRange, setChartRange] = useState('month'); // week | month | quarter | halfyear | all
  
  const userRole = pb.authStore.model?.role;
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadSuppliers();
    loadSalesForChart();
    loadReceptionsForChart();
  }, []);

  useEffect(() => {
    if (suppliers.length > 0 || selectedSupplier === '') {
      loadData();
    }
  }, [selectedSupplier]);

  useEffect(() => {
    const now = new Date();
    let from = new Date();
    const toLocal = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    switch (filterPeriod) {
      case 'today': from.setHours(0, 0, 0, 0); break;
      case 'week': from.setDate(now.getDate() - 7); break;
      case 'month': from.setMonth(now.getMonth() - 1); break;
      case 'all': from = new Date('2026-02-16T00:00:00'); break;
      case 'custom': return;
      default: from.setMonth(now.getMonth() - 1);
    }
    setFilterDateFrom(toLocal(from));
    setFilterDateTo(toLocal(now));
  }, [filterPeriod]);

  const loadSuppliers = async () => {
    try {
      const data = await getOrFetch('suppliers', () => getSuppliers().catch(() => []), 300000);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadSalesForChart = async () => {
    try {
      const orders = await getOrFetch('orders:all', () => getAllOrders().catch(() => []), 120000, (fresh) => setSalesData(fresh || []));
      setSalesData(orders || []);
    } catch (e) {
      console.error('Error loading sales for chart:', e);
    }
  };

  const loadReceptionsForChart = async () => {
    try {
      const data = await getOrFetch('receptions:all', () => getReceptions().catch(() => []), 120000, (fresh) => setReceptionsData(fresh || []));
      setReceptionsData(data || []);
    } catch (e) {
      console.error('Error loading receptions for chart:', e);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const cacheKey = 'dashboard:stats:' + (selectedSupplier || 'all');
      const statsData = await getOrFetch(cacheKey, () => getDashboardStats(selectedSupplier || null), 60000, (fresh) => { setStats(fresh); setLoading(false); });
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const selectedCityName = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplier)?.name || '',
    [suppliers, selectedSupplier]
  );

  const filteredOrders = useMemo(() => {
    let result = [...salesData];
    if (selectedSupplier) {
      result = result.filter((o) => {
        const bySupplier = o.expand?.user?.supplier === selectedSupplier;
        const byCity = selectedCityName ? (o.city || '') === selectedCityName : false;
        return bySupplier || byCity;
      });
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((o) => new Date(o.created_date || o.created) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((o) => new Date(o.created_date || o.created) <= to);
    }
    return result;
  }, [salesData, selectedSupplier, selectedCityName, filterDateFrom, filterDateTo]);

  const filteredReceptions = useMemo(() => {
    let result = [...receptionsData];
    if (selectedSupplier) {
      result = result.filter((r) => r.supplier === selectedSupplier);
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((r) => new Date(r.date || r.created) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.date || r.created) <= to);
    }
    return result;
  }, [receptionsData, selectedSupplier, filterDateFrom, filterDateTo]);

  const periodLabel = useMemo(() => ({
    today: 'день',
    week: 'неделю',
    month: 'месяц',
    all: 'всё время',
    custom: 'период',
  }[filterPeriod] || 'период'), [filterPeriod]);

  const metrics = useMemo(() => {
    const activeOrders = filteredOrders.filter((o) => o.status !== 'refund');
    const refundOrders = filteredOrders.filter((o) => o.status === 'refund');

    const totalSaleValue = activeOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalPurchaseValue = filteredReceptions.reduce((sum, rec) => {
      const items = Array.isArray(rec.items) ? rec.items : [];
      return sum + items.reduce((itemsSum, item) => {
        const cost = Number(item.cost ?? item.purchase_price ?? 0) || 0;
        const qty = Number(item.quantity) || 0;
        return itemsSum + (cost * qty);
      }, 0);
    }, 0);

    return {
      totalSaleValue,
      totalPurchaseValue,
      receptionsCount: filteredReceptions.length,
      salesCount: activeOrders.length,
      refundsCount: refundOrders.length,
    };
  }, [filteredOrders, filteredReceptions]);

  // Линейный график динамики остатков (кумулятив по приёмкам, шт)
  const { stockTrendData, trendCityNames } = useMemo(() => {
    const normalizeDay = (rawDate) => {
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return null;
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = new Date(now);
    if (chartRange === 'week') start.setDate(now.getDate() - 6);
    else if (chartRange === 'month') start.setDate(now.getDate() - 29);
    else if (chartRange === 'quarter') start.setDate(now.getDate() - 89);
    else if (chartRange === 'halfyear') start.setDate(now.getDate() - 179);
    else if (chartRange === 'all') {
      start.setTime(new Date('2026-02-16T00:00:00').getTime());
    }

    const relevantReceptions = receptionsData.filter((rec) => !selectedSupplier || rec.supplier === selectedSupplier);

    const citySet = new Set();
    relevantReceptions.forEach((rec) => {
      const cityName = rec.expand?.supplier?.name || suppliers.find((s) => s.id === rec.supplier)?.name || 'Неизвестно';
      if (cityName) citySet.add(cityName);
    });
    if (selectedSupplier && selectedCityName) citySet.add(selectedCityName);

    const cities = Array.from(citySet).sort();
    if (cities.length === 0) return { stockTrendData: [], trendCityNames: [] };

    const increments = new Map(); // key: city|dayTs => qty
    const baseline = Object.fromEntries(cities.map((city) => [city, 0]));

    relevantReceptions.forEach((rec) => {
      const day = normalizeDay(rec.date || rec.created);
      if (!day) return;
      const cityName = rec.expand?.supplier?.name || suppliers.find((s) => s.id === rec.supplier)?.name || 'Неизвестно';
      if (!cities.includes(cityName)) return;
      const qty = (Array.isArray(rec.items) ? rec.items : []).reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0
      );
      if (!qty) return;

      if (day < start) {
        baseline[cityName] = (baseline[cityName] || 0) + qty;
      } else if (day <= now) {
        const key = `${cityName}|${day.getTime()}`;
        increments.set(key, (increments.get(key) || 0) + qty);
      }
    });

    const running = { ...baseline };
    const rows = [];

    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const dayTs = d.getTime();
      const row = {
        label: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        fullDate: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      };

      cities.forEach((cityName) => {
        const key = `${cityName}|${dayTs}`;
        running[cityName] = (running[cityName] || 0) + (increments.get(key) || 0);
        row[cityName] = running[cityName];
      });

      rows.push(row);
    }

    return { stockTrendData: rows, trendCityNames: cities };
  }, [receptionsData, chartRange, selectedSupplier, selectedCityName, suppliers]);

  const CITY_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const PIE_COLORS = ['#22c55e', '#3b82f6', '#a855f7'];

  // Данные для круговой диаграммы способов оплаты
  const paymentMethodsData = useMemo(() => {
    const paymentMap = { cash: 0, transfer: 0, prepaid: 0 };
    const paymentLabels = { cash: 'Наличные', transfer: 'Перевод', prepaid: 'Предоплата' };
    
    filteredOrders.forEach(order => {
      if (order.status === 'refund') return;
      const method = order.payment_method || 'cash';
      const normalizedMethod = method === '0' ? 'cash' : method === '1' ? 'transfer' : method === '2' ? 'prepaid' : method;
      if (paymentMap.hasOwnProperty(normalizedMethod)) {
        paymentMap[normalizedMethod] += order.total || 0;
      }
    });
    
    return Object.entries(paymentMap)
      .filter(([_, value]) => value > 0)
      .map(([key, value]) => ({
        name: paymentLabels[key],
        value: value,
        percentage: 0 // will calculate after
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  // Данные для круговой диаграммы продаж по городам
  const citySalesData = useMemo(() => {
    const cityMap = {};
    filteredOrders.forEach(order => {
      if (order.status === 'refund') return;
      const cityName = order.city || order.expand?.user?.expand?.supplier?.name || 'Неизвестно';
      cityMap[cityName] = (cityMap[cityName] || 0) + (order.total || 0);
    });
    
    return Object.entries(cityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  const margin = metrics.totalSaleValue - metrics.totalPurchaseValue;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
        <button onClick={loadData} className="ml-4 text-sm underline">Попробовать снова</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-gray-600">Город:</label>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все города</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {['today', 'week', 'month', 'all', 'custom'].map(id => (
              <button
                key={id}
                onClick={() => setFilterPeriod(id)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filterPeriod === id ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-800'}`}
              >
                {{ today: 'День', week: 'Неделя', month: 'Месяц', all: 'Всё', custom: 'Период' }[id]}
              </button>
            ))}
          </div>
          {filterPeriod === 'custom' && (
            <>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
            </>
          )}
        </div>
      </div>

      {/* Карточки статистики */}
      {isAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard icon={Package} label="Товаров на складе" value={`${stats.totalProducts.toLocaleString('ru-RU')} шт`} color="blue" clickable onClick={() => setShowStockBreakdown(true)} />
          <StatCard icon={ShoppingCart} label={`Сумма продажи за ${periodLabel}`} value={metrics.totalSaleValue.toLocaleString('ru-RU')} color="green" />
          <StatCard icon={TrendingUp} label={`Сумма закупа за ${periodLabel}`} value={metrics.totalPurchaseValue.toLocaleString('ru-RU')} color="purple" />
          <StatCard icon={BarChart3} label={`Маржа за ${periodLabel}`} value={margin.toLocaleString('ru-RU')} color={margin > 0 ? 'green' : 'orange'} />
          <StatCard icon={FileText} label={`Приёмок за ${periodLabel}`} value={metrics.receptionsCount} color="indigo" />
          <StatCard
            icon={AlertTriangle}
            label="Неликвид (>30 дн)"
            value={stats.staleProductsCount}
            color="orange"
            clickable={stats.staleProductsCount > 0}
            onClick={() => setShowStaleProducts(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Package} label="Товаров на складе" value={`${stats.totalProducts.toLocaleString('ru-RU')} шт`} color="blue" clickable onClick={() => setShowStockBreakdown(true)} />
          <StatCard icon={Clock} label={`Продаж за ${periodLabel}`} value={metrics.salesCount} color="indigo" />
          <StatCard icon={RotateCcw} label={`Возвратов за ${periodLabel}`} value={metrics.refundsCount} color="orange" />
          <StatCard icon={Calendar} label={`Сумма продаж за ${periodLabel}`} value={metrics.totalSaleValue.toLocaleString('ru-RU')} color="green" />
        </div>
      )}

      {/* Компактные графики: линейный график слева, круговая диаграмма справа */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Линейный график остатков */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Динамика остатков (шт) по городам</h3>
            {trendCityNames.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={stockTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} width={50} />
                  <Tooltip
                    formatter={(value) => `${Number(value || 0).toLocaleString('ru-RU')} шт`}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {trendCityNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={CITY_COLORS[i % CITY_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">Нет данных</div>
            )}
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              {[
                { id: 'week', label: 'Неделя' },
                { id: 'month', label: 'Месяц' },
                { id: 'quarter', label: '3 месяца' },
                { id: 'halfyear', label: 'Полгода' },
                { id: 'all', label: 'Всё время' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setChartRange(opt.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${chartRange === opt.id ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Круговая диаграмма с переключателем */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {chartView === 'purchases' ? 'Способы оплаты' : 'Продажи по городам'}
              </h3>
              <button
                onClick={() => setChartView(chartView === 'purchases' ? 'cities' : 'purchases')}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {chartView === 'purchases' ? 'По городам' : 'По оплате'}
              </button>
            </div>
            {(chartView === 'purchases' ? paymentMethodsData : citySalesData).length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={chartView === 'purchases' ? paymentMethodsData : citySalesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toLocaleString('ru-RU')} ₽`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(chartView === 'purchases' ? paymentMethodsData : citySalesData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartView === 'purchases' ? PIE_COLORS[index % PIE_COLORS.length] : CITY_COLORS[index % CITY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString('ru-RU') + ' ₽'} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">Нет данных</div>
            )}
          </div>
        </div>
      )}


      {/* Модалка разбивки по складам */}
      {showStockBreakdown && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full mx-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Товары по складам</h3>
                <p className="text-sm text-gray-500 mt-0.5">Общее количество: <span className="font-semibold text-gray-700">{stats.totalProducts.toLocaleString('ru-RU')} шт</span></p>
              </div>
              <button onClick={() => setShowStockBreakdown(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
              {(stats.stockBreakdown || []).length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Нет данных</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {(stats.stockBreakdown || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <Package size={16} className="text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.count.toLocaleString('ru-RU')} шт</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs font-semibold text-green-600">{item.saleValue.toLocaleString('ru-RU')}</p>
                          <p className="text-xs text-purple-500">{item.purchaseValue.toLocaleString('ru-RU')}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {isAdmin && (stats.stockBreakdown || []).length > 0 && (
              <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Итого: {stats.totalProducts.toLocaleString('ru-RU')} шт</span>
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-bold text-green-600">Продажа: {stats.totalSaleValue.toLocaleString('ru-RU')}</span>
                    <span className="text-sm font-bold text-purple-600">Закуп: {stats.totalPurchaseValue.toLocaleString('ru-RU')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модалка с неликвидом */}
      {showStaleProducts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Товары без продаж более 30 дней</h3>
              <button onClick={() => setShowStaleProducts(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {stats.staleProducts.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет товаров</p>
              ) : (
                stats.staleProducts.map((stock, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="font-medium text-gray-900">{stock?.expand?.product?.name || 'Товар'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900">{stock.quantity} шт</p>
                        <p className="text-xs text-gray-500">{(stock?.expand?.product?.price || 0).toLocaleString('ru-RU')}</p>
                      </div>
                    </div>
                    {stock._cityBreakdown && stock._cityBreakdown.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-200">
                        {stock._cityBreakdown.map((city, ci) => (
                          <span key={ci} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded text-xs text-gray-600 border border-gray-200">
                            {city.supplierName}: <strong>{city.quantity}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, clickable, onClick }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    pink: 'bg-pink-50 text-pink-600',
  };

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-3 ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded ${colors[color]}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
          <p className="text-base font-semibold text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}
