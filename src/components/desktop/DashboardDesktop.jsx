import React, { useState, useEffect } from 'react';
import { getDashboardStats, getSuppliers } from '../../lib/pocketbase';
import { Package, TrendingUp, ShoppingCart, AlertTriangle, FileText, Calendar, Clock } from 'lucide-react';
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
  
  const userRole = pb.authStore.model?.role;

  useEffect(() => {
    loadSuppliers();
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
      {userRole === 'admin' ? (
        // Карточки для админа
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            icon={Package}
            label="Товаров на складе"
            value={`${stats.totalProducts.toLocaleString('ru-RU')} шт`}
            color="blue"
          />
          <StatCard
            icon={ShoppingCart}
            label="Сумма продажи"
            value={`${stats.totalSaleValue.toLocaleString('ru-RU')} ₽`}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Сумма закупа"
            value={`${stats.totalPurchaseValue.toLocaleString('ru-RU')} ₽`}
            color="purple"
          />
          <StatCard
            icon={FileText}
            label="Приёмок за месяц"
            value={stats.receptionsCount}
            color="indigo"
          />
          <StatCard
            icon={AlertTriangle}
            label="Неликвид (>30 дней)"
            value={stats.staleProductsCount}
            color="orange"
            clickable={stats.staleProductsCount > 0}
            onClick={() => setShowStaleProducts(true)}
          />
        </div>
      ) : (
        // Карточки для оператора
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            icon={Package}
            label="Товаров на складе"
            value={`${stats.totalProducts.toLocaleString('ru-RU')} шт`}
            color="blue"
          />
          <StatCard
            icon={ShoppingCart}
            label="Сумма продажи"
            value={`${stats.totalSaleValue.toLocaleString('ru-RU')} ₽`}
            color="green"
          />
          <StatCard
            icon={Clock}
            label="Продаж за день"
            value={stats.salesDay.count}
            color="indigo"
          />
          <StatCard
            icon={Calendar}
            label="Продаж за неделю"
            value={stats.salesWeek.count}
            color="purple"
          />
          <StatCard
            icon={Calendar}
            label="Продаж за месяц"
            value={stats.salesMonth.count}
            color="orange"
          />
          <StatCard
            icon={Calendar}
            label="Продаж за полгода"
            value={stats.salesHalfYear.count}
            color="pink"
          />
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
                        <p className="text-xs text-gray-500">{(stock?.expand?.product?.price || 0).toLocaleString('ru-RU')} ₽</p>
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
