import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, DollarSign, Package, X, CheckCircle } from 'lucide-react';
import { getActiveShift, getShifts, endShift, getSales } from '../lib/pocketbase';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function ShiftScreen({ onBack }) {
  const [activeShift, setActiveShift] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [closingShift, setClosingShift] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      
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
      const userId = localStorage.getItem('userId');
      const currentTime = new Date().toISOString();
      
      // Получаем продажи за время смены
      const sales = await getSales({
        filter: `user = "${userId}" && created >= "${activeShift.start}"`
      });
      
      // Считаем итоги
      const totalAmount = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const totalItems = sales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0);
      
      // Закрываем смену
      await endShift(activeShift.id, currentTime, totalAmount, totalItems, sales);
      
      // Обновляем данные
      setShowCloseModal(false);
      setActiveShift(null);
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
    return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: ru });
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
              onClick={() => setShowCloseModal(true)}
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
                      Смена от {format(new Date(shift.start), 'dd MMMM yyyy', { locale: ru })}
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
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Закрыть смену?</h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Вы уверены, что хотите закрыть смену? После закрытия вы сможете посмотреть статистику в истории.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleCloseShift}
                disabled={closingShift}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {closingShift ? 'Закрытие...' : 'Закрыть смену'}
              </button>
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
                  Смена от {format(new Date(selectedShift.start), 'dd MMMM yyyy', { locale: ru })}
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
                              {format(new Date(sale.created), 'HH:mm')}
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
