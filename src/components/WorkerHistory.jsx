import React, { useState, useEffect } from 'react';
import { History, Calendar, DollarSign, Package, Search } from 'lucide-react';
import pb from '../lib/pocketbase';

export default function WorkerHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    loadSalesHistory();
  }, []);

  const loadSalesHistory = async () => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;

      // Загружаем продажи воркера
      const records = await pb.collection('sales').getFullList({
        filter: `user = "${userId}"`,
        sort: '-created',
        expand: 'product'
      });

      setSales(records);
    } catch (error) {
      console.error('Error loading sales history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.expand?.product?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = selectedDate ? 
      new Date(sale.created).toDateString() === new Date(selectedDate).toDateString() : 
      true;
    return matchesSearch && matchesDate;
  });

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalItems = filteredSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка истории...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">История продаж</h1>
          <p className="text-gray-600 mt-1">Все ваши продажи</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Продажи</p>
                <p className="text-xl font-bold text-gray-900">{filteredSales.length}</p>
              </div>
              <History size={20} className="text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Выручка</p>
                <p className="text-xl font-bold text-gray-900">
                  {totalRevenue.toLocaleString('ru-RU')} ₽
                </p>
              </div>
              <DollarSign size={20} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию товара..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Date Filter */}
            <div className="relative">
              <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="px-4 pb-4">
        {filteredSales.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <History size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Продаж не найдено</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {sale.expand?.product?.name || 'Товар'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {sale.quantity} шт × {sale.price?.toLocaleString('ru-RU')} ₽
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(sale.created)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {sale.total?.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
