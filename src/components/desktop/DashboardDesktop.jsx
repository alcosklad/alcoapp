import React, { useState, useEffect, useMemo } from 'react';
import { getDashboardStats, getSuppliers, getAllOrders, getReceptions } from '../../lib/pocketbase';
import { getOrFetch } from '../../lib/cache';
import { Package, TrendingUp, ShoppingCart, AlertTriangle, FileText, Calendar, Clock, BarChart3, X } from 'lucide-react';
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

  // Данные для линейного графика закупок по городам (последние 14 дней)
  const { cityPurchaseChart, cityNames } = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({
        date: d,
        label: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      });
    }
    const citySet = new Set();
    receptionsData.forEach(rec => {
      const cityName = rec.expand?.supplier?.name || '';
      if (cityName) citySet.add(cityName);
    });
    const names = Array.from(citySet).sort();
    // Init each day with 0 for each city
    days.forEach(day => {
      names.forEach(name => { day[name] = 0; });
    });
    receptionsData.forEach(rec => {
      const recDate = new Date(rec.date || rec.created);
      recDate.setHours(0, 0, 0, 0);
      const day = days.find(d => d.date.getTime() === recDate.getTime());
      const cityName = rec.expand?.supplier?.name || '';
      if (day && cityName && rec.items) {
        const items = Array.isArray(rec.items) ? rec.items : [];
        const sum = items.reduce((s, item) => {
          const cost = item.cost ?? item.purchase_price ?? 0;
          const qty = item.quantity || 0;
          return s + (cost * qty);
        }, 0);
        day[cityName] += sum;
      }
    });
    return { cityPurchaseChart: days, cityNames: names };
  }, [receptionsData]);

  const CITY_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const PIE_COLORS = ['#22c55e', '#3b82f6', '#a855f7'];

  // Данные для круговой диаграммы способов оплаты
  const paymentMethodsData = useMemo(() => {
    const paymentMap = { cash: 0, transfer: 0, prepaid: 0 };
    const paymentLabels = { cash: 'Наличные', transfer: 'Перевод', prepaid: 'Предоплата' };
    
    salesData.forEach(order => {
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
  }, [salesData]);

  // Данные для круговой диаграммы продаж по городам
  const citySalesData = useMemo(() => {
    const cityMap = {};
    salesData.forEach(order => {
      if (order.status === 'refund') return;
      const cityName = order.expand?.user?.expand?.supplier?.name || 'Неизвестно';
      cityMap[cityName] = (cityMap[cityName] || 0) + (order.total || 0);
    });
    
    return Object.entries(cityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [salesData]);

  const margin = stats.totalSaleValue - stats.totalPurchaseValue;

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
      {/* Фильтр по городу */}
      <div className="flex items-center gap-3">
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

      {/* Карточки статистики */}
      {isAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard icon={Package} label="Товаров на складе" value={`${stats.totalProducts.toLocaleString('ru-RU')} шт`} color="blue" clickable onClick={() => setShowStockBreakdown(true)} />
          <StatCard icon={ShoppingCart} label="Сумма продажи" value={stats.totalSaleValue.toLocaleString('ru-RU')} color="green" />
          <StatCard icon={TrendingUp} label="Сумма закупа" value={stats.totalPurchaseValue.toLocaleString('ru-RU')} color="purple" />
          <StatCard icon={BarChart3} label="Маржа склада" value={margin.toLocaleString('ru-RU')} color={margin > 0 ? 'green' : 'orange'} />
          <StatCard icon={FileText} label="Приёмок за месяц" value={stats.receptionsCount} color="indigo" />
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
          <StatCard icon={Clock} label="Продаж за день" value={stats.salesDay.count} color="indigo" />
          <StatCard icon={Calendar} label="Продаж за неделю" value={stats.salesWeek.count} color="purple" />
          <StatCard icon={Calendar} label="Продаж за месяц" value={stats.salesMonth.count} color="orange" />
        </div>
      )}

      {/* Компактные графики: линейный график слева, круговая диаграмма справа */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Линейный график закупок */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Закупки за 7 дней</h3>
            {cityNames.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={cityPurchaseChart.slice(-7)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} width={50} />
                  <Tooltip
                    formatter={(value) => value.toLocaleString('ru-RU') + ' ₽'}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  {cityNames.map((name, i) => (
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowStockBreakdown(false)}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowStaleProducts(false)}>
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
                        <p className="text-xs text-gray-500">Артикул: {stock?.expand?.product?.article || '—'}</p>
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
