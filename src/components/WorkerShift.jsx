import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, Square, DollarSign } from 'lucide-react';
import pb from '../lib/pocketbase';

export default function WorkerShift() {
  const [shiftActive, setShiftActive] = useState(false);
  const [shiftStart, setShiftStart] = useState(null);
  const [shiftStats, setShiftStats] = useState({
    sales: 0,
    revenue: 0,
    itemsSold: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShiftData();
  }, []);

  const loadShiftData = async () => {
    try {
      // Здесь будет логика загрузки данных смены
      // Пока заглушка
      setLoading(false);
    } catch (error) {
      console.error('Error loading shift data:', error);
      setLoading(false);
    }
  };

  const handleStartShift = () => {
    setShiftActive(true);
    setShiftStart(new Date());
    // Здесь сохраняем начало смены
  };

  const handleEndShift = () => {
    setShiftActive(false);
    setShiftStart(null);
    // Здесь завершаем смену и сохраняем данные
  };

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (start) => {
    if (!start) return '0ч 0м';
    const now = new Date();
    const diff = now - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}ч ${minutes}м`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Смена</h1>
          <p className="text-gray-600 mt-1">Управление рабочей сменой</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="p-4">
        <div className={`rounded-xl p-6 ${
          shiftActive 
            ? 'bg-green-50 border-2 border-green-200' 
            : 'bg-gray-50 border-2 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${
                shiftActive ? 'bg-green-100' : 'bg-gray-200'
              }`}>
                <Clock size={24} className={shiftActive ? 'text-green-600' : 'text-gray-600'} />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {shiftActive ? 'Смена активна' : 'Смена не начата'}
                </p>
                <p className="text-sm text-gray-600">
                  Начало: {formatTime(shiftStart)}
                </p>
              </div>
            </div>
            
            <button
              onClick={shiftActive ? handleEndShift : handleStartShift}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                shiftActive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {shiftActive ? (
                <>
                  <Square size={20} className="inline mr-2" />
                  Завершить
                </>
              ) : (
                <>
                  <Play size={20} className="inline mr-2" />
                  Начать
                </>
              )}
            </button>
          </div>
          
          {shiftActive && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-sm text-green-700">
                Длительность: {formatDuration(shiftStart)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Статистика смены</h2>
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Продажи</p>
                <p className="text-2xl font-bold text-gray-900">{shiftStats.sales}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign size={20} className="text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Выручка</p>
                <p className="text-2xl font-bold text-gray-900">
                  {shiftStats.revenue.toLocaleString('ru-RU')} ₽
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign size={20} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Товаров продано</p>
                <p className="text-2xl font-bold text-gray-900">{shiftStats.itemsSold}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock size={20} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
