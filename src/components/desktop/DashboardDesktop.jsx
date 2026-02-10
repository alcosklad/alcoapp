import React, { useState, useEffect, useMemo } from 'react';
import { getDashboardStats, getSuppliers, getAllOrders } from '../../lib/pocketbase';
import { Package, TrendingUp, ShoppingCart, AlertTriangle, FileText, Calendar, Clock, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import pb from '../../lib/pocketbase';

export default function DashboardDesktop({ user }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSaleValue: 0,
    totalPurchaseValue: 0,
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
  const [salesData, setSalesData] = useState([]);
  
  const userRole = pb.authStore.model?.role;
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadSuppliers();
    loadSalesForChart();
  }, []);

  useEffect(() => {
    if (suppliers.length > 0 || selectedSupplier === '') {
      loadData();
    }
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers().catch(() => []);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadSalesForChart = async () => {
    try {
      const orders = await getAllOrders().catch(() => []);
      setSalesData(orders || []);
    } catch (e) {
      console.error('Error loading sales for chart:', e);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statsData = await getDashboardStats(selectedSupplier || null);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Данные для графика продаж по дням (последние 14 дней)
  const dailySalesChart = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({
        date: d,
        label: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        revenue: 0,
        count: 0,
      });
    }
    salesData.forEach(order => {
      const orderDate = new Date(order.created);
      orderDate.setHours(0, 0, 0, 0);
      const day = days.find(d => d.date.getTime() === orderDate.getTime());
      if (day) {
        day.revenue += order.total || 0;
        day.count += 1;
      }
    });
    return days;
  }, [salesData]);

  // Данные для круговой диаграммы (продажи за период по способам оплаты)
  const paymentChart = useMemo(() => {
    let cash = 0, card = 0;
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    salesData.forEach(order => {
      if (new Date(order.created) >= monthAgo) {
        if (order.payment_method === '0' || order.payment_method === 'cash') {
          cash += order.total || 0;
        } else {
          card += order.total || 0;
        }
      }
    });
    if (cash === 0 && card === 0) return [];
    return [
      { name: 'Наличные', value: cash },
      { name: 'Безнал', value: card },
    ];
  }, [salesData]);

  const PIE_COLORS = ['#22c55e', '#3b82f6'];

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
          <StatCard icon={Package} label="Товаров на складе" value={`${stats.totalProducts.toLocaleString('ru-RU')} шт`} color="blue" />
          <StatCard icon={ShoppingCart} label="Стоимость (продажа)" value={stats.totalSaleValue.toLocaleString('ru-RU')} color="green" />
          <StatCard icon={TrendingUp} label="Стоимость (закуп)" value={stats.totalPurchaseValue.toLocaleString('ru-RU')} color="purple" />
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
          <StatCard icon={Package} label="Товаров на складе" value={`${stats.totalProducts.toLocaleString('ru-RU')} шт`} color="blue" />
          <StatCard icon={Clock} label="Продаж за день" value={stats.salesDay.count} color="indigo" />
          <StatCard icon={Calendar} label="Продаж за неделю" value={stats.salesWeek.count} color="purple" />
          <StatCard icon={Calendar} label="Продаж за месяц" value={stats.salesMonth.count} color="orange" />
        </div>
      )}

      {/* Графики — только для админа */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* График продаж по дням */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Продажи за 14 дней</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailySalesChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={50} />
                <Tooltip
                  formatter={(value, name) => [value.toLocaleString('ru-RU'), name === 'revenue' ? 'Выручка' : 'Продаж']}
                  labelFormatter={(label) => `Дата: ${label}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Выручка" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Круговая диаграмма способов оплаты */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Оплата за месяц</h3>
            {paymentChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={paymentChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentChart.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString('ru-RU')} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
                Нет данных
              </div>
            )}
          </div>
        </div>
      )}

      {/* Продажи за периоды — для админа */}
      {isAdmin && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">За сегодня</p>
            <p className="text-lg font-bold text-gray-900">{stats.salesDay.count} <span className="text-xs font-normal text-gray-400">продаж</span></p>
            <p className="text-sm text-green-600">{(stats.salesDay.totalAmount || 0).toLocaleString('ru-RU')}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">За неделю</p>
            <p className="text-lg font-bold text-gray-900">{stats.salesWeek.count} <span className="text-xs font-normal text-gray-400">продаж</span></p>
            <p className="text-sm text-green-600">{(stats.salesWeek.totalAmount || 0).toLocaleString('ru-RU')}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">За месяц</p>
            <p className="text-lg font-bold text-gray-900">{stats.salesMonth.count} <span className="text-xs font-normal text-gray-400">продаж</span></p>
            <p className="text-sm text-green-600">{(stats.salesMonth.totalAmount || 0).toLocaleString('ru-RU')}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">За полгода</p>
            <p className="text-lg font-bold text-gray-900">{stats.salesHalfYear.count} <span className="text-xs font-normal text-gray-400">продаж</span></p>
            <p className="text-sm text-green-600">{(stats.salesHalfYear.totalAmount || 0).toLocaleString('ru-RU')}</p>
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
