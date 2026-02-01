import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, DollarSign, Package, X, CheckCircle } from 'lucide-react';
import { getActiveShift, getShifts, endShift, getSales } from '../lib/pocketbase';
import pb from '../lib/pocketbase';

export default function ShiftScreen({ onBack }) {
  const [activeShift, setActiveShift] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [closingShift, setClosingShift] = useState(false);
  const [shiftData, setShiftData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userId = pb.authStore.model?.id;
      
      if (!userId) {
        console.error('❌ Нет ID пользователя');
        setLoading(false);
        return;
      }
      
      // Загружаем активную смену
      const active = await getActiveShift(userId);
      setActiveShift(active);
      
      // Загружаем историю смен
      const history = await getShifts(userId);
      setShifts(history.filter(s => s.status === 'closed'));
    } catch (error) {
      console.error('Ошибка загрузки смен:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    try {
      setClosingShift(true);
      const userId = pb.authStore.model?.id;
      
      if (!userId) {
        console.error('❌ Нет ID пользователя');
        return;
      }
      
      const currentTime = new Date().toISOString();
      
      // Получаем продажи за время смены
      const sales = await getSales({
        filter: `user = "${userId}" && created >= "${activeShift.start}"`
      });
      
      // Если sales не работает, пробуем orders
      let orders = [];
      if (sales.length === 0) {
        try {
          // Пробуем более мягкий фильтр - за сегодня
          const today = new Date().toISOString().split('T')[0];
          const shiftDate = activeShift.start.split('T')[0];
          
          let filter = `user = "${userId}"`;
          if (shiftDate === today) {
            // Если смена сегодня, ищем за сегодня
            filter += ` && created >= "${shiftDate}T00:00:00.000Z"`;
          } else {
            // Если смена в другой день, используем время начала смены
            filter += ` && created >= "${activeShift.start}"`;
          }
          
          orders = await pb.collection('orders').getFullList({
            filter: filter
          });
          
          console.log('PocketBase: Фильтр заказов:', filter);
          console.log('PocketBase: Найдено заказов за смену:', orders.length);
          
          // Дополнительно фильтруем по времени начала смены
          const shiftStartTime = new Date(activeShift.start);
          orders = orders.filter(order => {
            const orderTime = new Date(order.created);
            return orderTime >= shiftStartTime;
          });
          
          console.log('PocketBase: После фильтрации по времени:', orders.length);
        } catch (err) {
          console.log('Не удалось загрузить orders:', err);
        }
      }
      
      // Используем тот массив, где есть данные
      const salesData = sales.length > 0 ? sales : orders;
      
      console.log('PocketBase: Данные для смены:', {
        shiftStart: activeShift.start,
        salesCount: salesData.length,
        sales: salesData
      });
      
      // Считаем итоги
      const totalAmount = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const totalItems = salesData.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
      
      // Сохраняем данные для модального окна
      setClosingShift(false);
      setShiftData({
        endTime: currentTime,
        totalAmount,
        totalItems,
        sales: salesData
      });
      setShowCloseModal(true);
    } catch (error) {
      console.error('Ошибка подготовки данных смены:', error);
      alert('Ошибка при получении данных смены');
      setClosingShift(false);
    }
  };

  const confirmCloseShift = async () => {
    try {
      setClosingShift(true);
      await endShift(activeShift.id, shiftData.endTime, shiftData.totalAmount, shiftData.totalItems, shiftData.sales);
      
      // Обновляем данные
      setShowCloseModal(false);
      setActiveShift(null);
      setShiftData(null);
      loadData();
      
      // Показываем уведомление
      alert('Смена успешно закрыта!');
    } catch (error) {
      console.error('Ошибка закрытия смены:', error);
      alert('Ошибка при закрытии смены');
    } finally {
      setClosingShift(false);
    }
  };

  const formatDuration = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate - startDate;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}ч ${minutes}м`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Смена</h1>
        </div>
      </header>

      {/* Active Shift */}
      {activeShift && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Активная смена</p>
              <p className="text-xs text-blue-500">
                Начата: {formatDate(activeShift.start)}
              </p>
            </div>
            <button
              onClick={handleCloseShift}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Закрыть смену
            </button>
          </div>
        </div>
      )}

      {/* Shifts History */}
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">История смен</h2>
        
        {shifts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock size={48} className="mx-auto mb-2 text-gray-300" />
            <p>Нет закрытых смен</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                onClick={() => {
                  setSelectedShift(shift);
                  setShowDetailModal(true);
                }}
                className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      Смена от {new Date(shift.start).toLocaleDateString('ru-RU')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(shift.start)} - {formatDate(shift.end)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Длительность: {formatDuration(shift.start, shift.end)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {shift.totalItems} шт
                    </p>
                    <p className="text-sm text-green-600">
                      {shift.totalAmount.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close Shift Modal */}
      {showCloseModal && shiftData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Закрытие смены</h3>
                <button
                  onClick={() => {
                    setShowCloseModal(false);
                    setShiftData(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Clock size={16} />
                    <span className="text-sm">Время работы</span>
                  </div>
                  <p className="font-semibold">
                    {formatDuration(activeShift.start, shiftData.endTime)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Package size={16} />
                    <span className="text-sm">Товары</span>
                  </div>
                  <p className="font-semibold">{shiftData.totalItems} шт</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <DollarSign size={16} />
                    <span className="text-sm">Сумма</span>
                  </div>
                  <p className="font-semibold text-green-600">
                    {shiftData.totalAmount.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
              
              {/* Sales List */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Продажи за смену</h4>
                {shiftData.sales && shiftData.sales.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {shiftData.sales.map((sale, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(sale.created).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}
                            </p>
                            <p className="text-xs text-gray-500">
                              {sale.items?.length || 0} товаров
                            </p>
                            {sale.discount_value && (
                              <p className="text-xs text-orange-600">
                                Скидка: {sale.discount_value} {sale.discount_type === 'percent' ? '%' : '₽'}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {sale.total?.toLocaleString('ru-RU')} ₽
                            </p>
                            <p className="text-xs text-gray-500">
                              {sale.payment_method === 'cash' ? 'Наличные' : 'Карта'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Продаж не было</p>
                )}
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCloseModal(false);
                    setShiftData(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmCloseShift}
                  disabled={closingShift}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {closingShift ? 'Закрытие...' : 'Закрыть смену'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Detail Modal */}
      {showDetailModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Смена от {new Date(selectedShift.start).toLocaleDateString('ru-RU')}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Clock size={16} />
                    <span className="text-sm">Время</span>
                  </div>
                  <p className="font-semibold">
                    {formatDuration(selectedShift.start, selectedShift.end)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Package size={16} />
                    <span className="text-sm">Товары</span>
                  </div>
                  <p className="font-semibold">{selectedShift.totalItems} шт</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <DollarSign size={16} />
                    <span className="text-sm">Сумма</span>
                  </div>
                  <p className="font-semibold text-green-600">
                    {selectedShift.totalAmount.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
              
              {/* Sales List */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Продажи</h4>
                {selectedShift.sales && selectedShift.sales.length > 0 ? (
                  <div className="space-y-2">
                    {selectedShift.sales.map((sale, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(sale.created).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}
                            </p>
                            <p className="text-xs text-gray-500">
                              {sale.items?.length || 0} товаров
                            </p>
                            {sale.discount_value && (
                              <p className="text-xs text-orange-600">
                                Скидка: {sale.discount_value} {sale.discount_type === 'percent' ? '%' : '₽'}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {sale.total?.toLocaleString('ru-RU')} ₽
                            </p>
                            <p className="text-xs text-gray-500">
                              {sale.payment_method === 'cash' ? 'Наличные' : 'Карта'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Продаж не было</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
