import React, { useState, useEffect, useMemo } from 'react';
import { getDashboardStats, getSuppliers, getAllOrders, getReceptions, getStocksAggregated, getWriteOffs } from '../../lib/pocketbase';
import { getOrFetch } from '../../lib/cache';
import { Package, TrendingUp, ShoppingCart, AlertTriangle, FileText, Calendar, Clock, BarChart3, X, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import pb from '../../lib/pocketbase';

export default function DashboardDesktop({ user, onNavigate }) {
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
  const [selectedCities, setSelectedCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStaleProducts, setShowStaleProducts] = useState(false);
  const [showStockBreakdown, setShowStockBreakdown] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [receptionsData, setReceptionsData] = useState([]);
  const [stocksData, setStocksData] = useState([]);
  const [writeOffsChartData, setWriteOffsChartData] = useState([]);
  const [chartView, setChartView] = useState('purchases'); // 'purchases' or 'cities'
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [chartRange, setChartRange] = useState('week'); // week | month | quarter | halfyear | all
  const [chartMode, setChartMode] = useState('current'); // 'current' | 'dynamic'
  
  const userRole = pb.authStore.model?.role;
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadSuppliers();
    loadSalesForChart();
    loadReceptionsForChart();
    loadStocksForChart();
    loadWriteOffsForChart();
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
      case 'all': from = new Date('2020-01-01T00:00:00'); break;
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

  const loadStocksForChart = async () => {
    try {
      const data = await getOrFetch('stocks:agg:all', () => getStocksAggregated(null).catch(() => []), 60000, (fresh) => setStocksData(fresh || []));
      setStocksData(data || []);
    } catch (e) {
      console.error('Error loading stocks for chart:', e);
    }
  };

  const loadWriteOffsForChart = async () => {
    try {
      const data = await getOrFetch('writeoffs:all', () => getWriteOffs(null).catch(() => []), 120000, (fresh) => setWriteOffsChartData(fresh || []));
      setWriteOffsChartData(data || []);
    } catch (e) {
      console.error('Error loading write-offs for chart:', e);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filterIdStr = selectedCities.length > 0 ? selectedCities.join(',') : null;
      const cacheKey = 'dashboard:stats:' + (filterIdStr || 'all');
      const statsData = await getOrFetch(cacheKey, () => getDashboardStats(filterIdStr), 60000, (fresh) => { setStats(fresh); setLoading(false); });
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const selectedCityNames = useMemo(
    () => suppliers.filter(s => selectedCities.includes(s.id)).map(s => s.name),
    [suppliers, selectedCities]
  );

  const filteredOrders = useMemo(() => {
    let result = [...salesData];
    if (selectedCities.length > 0) {
      result = result.filter((o) => {
        const bySupplier = selectedCities.includes(o.expand?.user?.supplier);
        const byCity = selectedCityNames.includes(o.city || '');
        return bySupplier || byCity;
      });
    }
    if (filterDateFrom) {
      const [y, m, d] = filterDateFrom.split('-');
      const from = new Date(y, m - 1, d, 0, 0, 0, 0);
      result = result.filter((o) => {
        const raw = o.created_date || o.created || '';
        const d_obj = new Date(raw.replace(' ', 'T'));
        return !isNaN(d_obj) && d_obj >= from;
      });
    }
    if (filterDateTo) {
      const [y, m, d] = filterDateTo.split('-');
      const to = new Date(y, m - 1, d, 23, 59, 59, 999);
      result = result.filter((o) => {
        const raw = o.created_date || o.created || '';
        const d_obj = new Date(raw.replace(' ', 'T'));
        return !isNaN(d_obj) && d_obj <= to;
      });
    }
    return result;
  }, [salesData, selectedCities, selectedCityNames, filterDateFrom, filterDateTo]);

  const filteredReceptions = useMemo(() => {
    let result = [...receptionsData];
    if (selectedCities.length > 0) {
      result = result.filter((r) => selectedCities.includes(r.supplier));
    }
    if (filterDateFrom) {
      const [y, m, d] = filterDateFrom.split('-');
      const from = new Date(y, m - 1, d, 0, 0, 0, 0);
      result = result.filter((r) => {
        const raw = r.date || r.created || '';
        const d_obj = new Date(raw.replace(' ', 'T'));
        return !isNaN(d_obj) && d_obj >= from;
      });
    }
    if (filterDateTo) {
      const [y, m, d] = filterDateTo.split('-');
      const to = new Date(y, m - 1, d, 23, 59, 59, 999);
      result = result.filter((r) => {
        const raw = r.date || r.created || '';
        const d_obj = new Date(raw.replace(' ', 'T'));
        return !isNaN(d_obj) && d_obj <= to;
      });
    }
    return result;
  }, [receptionsData, selectedCities, filterDateFrom, filterDateTo]);

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
        const cost = Number(item.cost) || 0;
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

  // Линейный график динамики остатков: база = текущий остаток, +приёмки, −продажи, −списания
  const { stockTrendData, trendCityNames, currentTotals } = useMemo(() => {
    const normalizeDay = (rawDate) => {
      const d = new Date((rawDate || '').replace(' ', 'T'));
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
      start.setTime(new Date('2020-01-01T00:00:00').getTime());
    }

    // 1) Текущий реальный остаток по городам
    const currentTotals = {};
    (stocksData || []).forEach((stock) => {
      const parts = Array.isArray(stock._cityBreakdown) && stock._cityBreakdown.length > 0
        ? stock._cityBreakdown
        : [{
            supplierId: stock.supplier,
            supplierName: stock.expand?.supplier?.name || suppliers.find((s) => s.id === stock.supplier)?.name || 'Неизвестно',
            quantity: Number(stock.quantity) || 0,
          }];
      parts.forEach((part) => {
        const qty = Number(part.quantity) || 0;
        if (qty <= 0) return;
        const cityName = part.supplierName || suppliers.find((s) => s.id === part.supplierId)?.name || 'Неизвестно';
        if (!cityName) return;
        currentTotals[cityName] = (currentTotals[cityName] || 0) + qty;
      });
    });

    const relevantReceptions = receptionsData.filter((rec) => selectedCities.length === 0 || selectedCities.includes(rec.supplier));
    const relevantOrders = salesData.filter((o) => {
      if (o.status === 'refund') return false;
      if (selectedCities.length === 0) return true;
      return selectedCityNames.includes(o.city || '') || selectedCities.includes(o.expand?.user?.supplier);
    });
    const relevantWriteOffs = writeOffsChartData.filter((w) => {
      if (w.status === 'cancelled') return false;
      if (selectedCities.length === 0) return true;
      return selectedCityNames.includes(w.city || '') || selectedCities.includes(w.supplier);
    });

    const citySet = new Set();
    Object.keys(currentTotals).forEach((city) => citySet.add(city));
    relevantReceptions.forEach((rec) => {
      const cityName = rec.expand?.supplier?.name || suppliers.find((s) => s.id === rec.supplier)?.name || 'Неизвестно';
      if (cityName) citySet.add(cityName);
    });
    selectedCityNames.forEach(name => citySet.add(name));

    let cities = Array.from(citySet).sort();
    if (selectedCities.length > 0) {
      cities = cities.filter((c) => selectedCityNames.includes(c));
    }
    if (cities.length === 0) return { stockTrendData: [], trendCityNames: [] };

    const increments = new Map();
    const decrements = new Map();
    const addedWithinRange = Object.fromEntries(cities.map((city) => [city, 0]));
    const removedWithinRange = Object.fromEntries(cities.map((city) => [city, 0]));

    // Приёмки (+)
    relevantReceptions.forEach((rec) => {
      const day = normalizeDay(rec.date || rec.created);
      if (!day) return;
      const cityName = rec.expand?.supplier?.name || suppliers.find((s) => s.id === rec.supplier)?.name || 'Неизвестно';
      if (!cities.includes(cityName)) return;
      const qty = (Array.isArray(rec.items) ? rec.items : []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      if (!qty) return;
      if (day >= start && day <= now) {
        const key = `${cityName}|${day.getTime()}`;
        increments.set(key, (increments.get(key) || 0) + qty);
        addedWithinRange[cityName] = (addedWithinRange[cityName] || 0) + qty;
      }
    });

    // Продажи (−)
    relevantOrders.forEach((order) => {
      const day = normalizeDay(order.created_date || order.created);
      if (!day) return;
      const orderSupplierId = order.supplier ||
        (typeof order.expand?.user?.supplier === 'string' ? order.expand.user.supplier : order.expand?.user?.supplier?.id);
      const cityName = (order.city && order.city !== '') ? order.city
        : order.expand?.user?.expand?.supplier?.name
        || suppliers.find(s => s.id === orderSupplierId)?.name
        || '';
      if (!cityName) return;
      if (!cities.includes(cityName)) return;
      const qty = (Array.isArray(order.items) ? order.items : []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      if (!qty) return;
      if (day >= start && day <= now) {
        const key = `${cityName}|${day.getTime()}`;
        decrements.set(key, (decrements.get(key) || 0) + qty);
        removedWithinRange[cityName] = (removedWithinRange[cityName] || 0) + qty;
      }
    });

    // Списания (−) — убираем дублирующий return после обновлённого блока продаж
    relevantWriteOffs.forEach((w) => {
      const day = normalizeDay(w.created);
      if (!day) return;
      const cityName = w.city || suppliers.find((s) => s.id === w.supplier)?.name || 'Неизвестно';
      if (!cities.includes(cityName)) return;
      const qty = Number(w.quantity) || 0;
      if (!qty) return;
      if (day >= start && day <= now) {
        const key = `${cityName}|${day.getTime()}`;
        decrements.set(key, (decrements.get(key) || 0) + qty);
        removedWithinRange[cityName] = (removedWithinRange[cityName] || 0) + qty;
      }
    });

    // 2) Базовая точка = текущий остаток − приёмки + продажи + списания за период
    const baseline = Object.fromEntries(
      cities.map((city) => [
        city,
        Math.max(0, (currentTotals[city] || 0) - (addedWithinRange[city] || 0) + (removedWithinRange[city] || 0)),
      ])
    );

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
        running[cityName] = Math.max(0,
          (running[cityName] || 0) + (increments.get(key) || 0) - (decrements.get(key) || 0)
        );
        row[cityName] = running[cityName];
      });
      rows.push(row);
    }

    return { stockTrendData: rows, trendCityNames: cities, currentTotals };
  }, [receptionsData, salesData, writeOffsChartData, stocksData, chartRange, selectedCities, selectedCityNames, suppliers]);

  // Flat-line chart for "Текущий" mode: horizontal lines at current stock level
  const currentStockChartData = useMemo(() => {
    if (trendCityNames.length === 0) return [];
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    if (chartRange === 'week') start.setDate(now.getDate() - 6);
    else if (chartRange === 'month') start.setDate(now.getDate() - 29);
    else if (chartRange === 'quarter') start.setDate(now.getDate() - 89);
    else if (chartRange === 'halfyear') start.setDate(now.getDate() - 179);
    else if (chartRange === 'all') start.setTime(new Date('2020-01-01T00:00:00').getTime());
    const rows = [];
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const row = {
        label: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        fullDate: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      };
      trendCityNames.forEach((city) => { row[city] = currentTotals[city] || 0; });
      rows.push(row);
    }
    return rows;
  }, [trendCityNames, currentTotals, chartRange]);

  const CITY_COLORS = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
    '#e11d48', '#7c3aed', '#0891b2', '#d97706', '#4f46e5',
    '#059669', '#dc2626', '#9333ea',
  ];

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
          <label className="text-sm text-gray-600">Города:</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedCities([])}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${selectedCities.length === 0 ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              Все города
            </button>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-[400px]" style={{scrollbarWidth:'none', msOverflowStyle:'none'}}>
              {suppliers.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedCities(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap shrink-0 ${selectedCities.includes(s.id) ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
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
          <StatCard 
            icon={Package} 
            label="Товаров на складе" 
            value={`${stats.totalProducts.toLocaleString('ru-RU')} шт`} 
            color="blue" 
            clickable 
            onClick={() => setShowStockBreakdown(true)} 
          />
          <StatCard icon={ShoppingCart} label={`Сумма продажи за ${periodLabel}`} value={metrics.totalSaleValue.toLocaleString('ru-RU')} color="green" />
          <StatCard icon={TrendingUp} label={`Сумма закупа за ${periodLabel}`} value={metrics.totalPurchaseValue.toLocaleString('ru-RU')} color="purple" />
          <StatCard icon={BarChart3} label={`Маржа за ${periodLabel}`} value={margin.toLocaleString('ru-RU')} color={margin > 0 ? 'green' : 'orange'} />
          <StatCard 
            icon={FileText} 
            label={`Приёмок за ${periodLabel}`} 
            value={metrics.receptionsCount} 
            color="indigo" 
            clickable
            onClick={() => onNavigate && onNavigate('reception')}
          />
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

      {/* График остатков — полная ширина, 500px */}
      {isAdmin && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Остатки (шт) по городам</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Mode tabs */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setChartMode('current')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${chartMode === 'current' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  Текущий
                </button>
                <button
                  onClick={() => setChartMode('dynamic')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${chartMode === 'dynamic' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  Динамика
                </button>
              </div>
              {/* Period buttons */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {[
                  { id: 'week', label: 'Неделя' },
                  { id: 'month', label: 'Месяц' },
                  { id: 'quarter', label: '3 мес' },
                  { id: 'halfyear', label: 'Полгода' },
                  { id: 'all', label: 'Всё' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setChartRange(opt.id)}
                    className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${chartRange === opt.id ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-800'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {trendCityNames.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={chartMode === 'current' ? currentStockChartData : stockTrendData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} width={50} allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [`${Number(value || 0).toLocaleString('ru-RU')} шт`, name]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                  contentStyle={{ fontSize: 12, borderRadius: 8, maxHeight: 320, overflowY: 'auto' }}
                  itemSorter={(a) => -(a.value || 0)}
                />
                {trendCityNames.map((name, i) => (
                  <Line
                    key={name}
                    type={chartMode === 'current' ? 'linear' : 'monotone'}
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
            <div className="flex items-center justify-center h-[500px] text-gray-400 text-sm">Нет данных</div>
          )}
        </div>
      )}

      {/* Круговые диаграммы */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                      
                      onClik={() => {
                        // Пытаемся найти suppierId по имени
                        const supplier = suppliers.find(s => s.nme === item.name);
                        if (upplier && onNavigate) {
                          // Переход в раздел остатков с фильтрацией (в реальном приложении 
                          // потребуется передать состояние или через кэш/роутинг, 
                          // но пока просто перейдем на вкладку)
                          setShowStockBreakdown(false);
                          // Чтобы StockDesktop увидел выбранный город, можно 
                          // сохранить его в localStorage или использовать общий стейт
                          try { localStorage.setItem('ns_selected_supplier', supplier.id); } catch {}
                          onNavigate('tock');
                        }
                      }}
                      class cursor-pointer
                    
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
