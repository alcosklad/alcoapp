import React, { useState, useEffect } from 'react';
import { getDashboardStats, getWarehouses } from '../lib/pocketbase';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalProducts: 0, totalValue: 0 });
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedWarehouse]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [warehousesData, statsData] = await Promise.all([
        getWarehouses().catch(err => {
          console.error('Error loading warehouses:', err);
          return [];
        }),
        getDashboardStats(selectedWarehouse || null).catch(err => {
          console.error('Error loading stats:', err);
          return { totalProducts: 0, totalValue: 0 };
        })
      ]);
      
      setWarehouses(warehousesData || []);
      setStats(statsData || { totalProducts: 0, totalValue: 0 });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Ошибка</h2>
          <p className="text-blue-100 mt-2">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="mt-2 text-white">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-600 pb-20">
      {/* Header */}
      <header className="bg-blue-700 px-4 py-4">
        <h1 className="text-xl font-bold text-white">Главная</h1>
      </header>

      {/* Warehouse Selector */}
      <div className="px-4 py-4">
        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-white/10 backdrop-blur text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          <option value="">Все склады</option>
          {(warehouses || []).map(warehouse => (
            <option key={warehouse?.id || Math.random()} value={warehouse?.id}>
              {warehouse?.name || 'Неизвестный склад'}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="px-4 space-y-4">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Всего товаров</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.totalProducts.toLocaleString('ru-RU')}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Общая сумма склада</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.totalValue.toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
          <h3 className="text-white font-semibold mb-3">Быстрые действия</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-lg transition-colors">
              📦 Новая приемка
            </button>
            <button className="bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-lg transition-colors">
              📊 Отчеты
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
