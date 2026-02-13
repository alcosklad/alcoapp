import React, { useState, useEffect } from 'react';
import { Clock, RussianRuble, Package, X, CheckCircle, ChevronRight, RotateCcw } from 'lucide-react';
import { getActiveShift, getShifts, endShift, getOrders } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';

export default function WorkerShift({ user }) {
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
      if (!userId) return;
      const active = await getActiveShift(userId);
      setActiveShift(active);
      const history = await getShifts(userId);
      setShifts(history.filter(s => s.status === 'closed'));
    } catch (e) {
      console.error('Error loading shifts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    try {
      setClosingShift(true);
      const userId = pb.authStore.model?.id;
      if (!userId || !activeShift) {
        setClosingShift(false);
        return;
      }
      const currentTime = new Date().toISOString();
      const shiftStartTime = new Date(activeShift.start);

      // Используем getOrders (работает в Истории) и фильтруем по дате смены
      let salesData = [];
      try {
        const allOrders = await getOrders();
        salesData = allOrders.filter(o => {
          const orderDate = new Date(o.created || o.created_date);
          return orderDate >= shiftStartTime;
        });
      } catch (_) {
        console.error('Failed to load orders for shift');
      }

      const totalAmount = salesData.reduce((sum, s) => sum + (s.total || 0), 0);
      const totalItems = salesData.reduce((sum, s) => sum + (s.items || []).reduce((q, i) => q + (i.quantity || 1), 0), 0);

      setClosingShift(false);
      setShiftData({ endTime: currentTime, totalAmount, totalItems, sales: salesData });
      setShowCloseModal(true);
    } catch (e) {
      console.error('Error preparing shift close:', e);
      alert('Ошибка при получении данных смены');
      setClosingShift(false);
    }
  };

  const confirmCloseShift = async () => {
    try {
      setClosingShift(true);
      await endShift(activeShift.id, shiftData.endTime, shiftData.totalAmount, shiftData.totalItems, shiftData.sales);
      setShowCloseModal(false);
      setActiveShift(null);
      setShiftData(null);
      loadData();
    } catch (e) {
      console.error('Error closing shift:', e);
      alert('Ошибка при закрытии смены');
    } finally {
      setClosingShift(false);
    }
  };

  const formatDuration = (start, end) => {
    const diff = new Date(end) - new Date(start);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}ч ${m}м`;
  };

  const formatDate = (d) => new Date(d).toLocaleString('ru-RU');
  const formatShortDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const paymentLabels = { '0': 'Наличные', '1': 'Перевод', '2': 'Предоплата', 'cash': 'Наличные', 'transfer': 'Перевод', 'prepaid': 'Предоплата' };
  const getPaymentLabel = (pm) => paymentLabels[pm] || '—';

  const renderSalesList = (sales) => {
    if (!sales || sales.length === 0) return <p className="text-center text-gray-400 text-sm py-4">Продаж не было</p>;

    const refundsCount = sales.filter(s => s.status === 'refund').length;
    const cashCount = sales.filter(s => s.payment_method === '0' || s.payment_method === 'cash').length;
    const transferCount = sales.filter(s => s.payment_method === '1' || s.payment_method === 'transfer').length;
    const prepaidCount = sales.filter(s => s.payment_method === '2' || s.payment_method === 'prepaid').length;

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Продажи ({sales.length})</p>
          <div className="flex gap-2 text-[10px] flex-wrap justify-end">
            {cashCount > 0 && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Нал: {cashCount}</span>}
            {transferCount > 0 && <span className="bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">Перевод: {transferCount}</span>}
            {prepaidCount > 0 && <span className="bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded">Предоплата: {prepaidCount}</span>}
            {refundsCount > 0 && <span className="bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded">Вычет: {refundsCount}</span>}
          </div>
        </div>
        <div className="space-y-2 max-h-[45vh] overflow-y-auto">
          {sales.map((sale, i) => {
            const isRefund = sale.status === 'refund';
            return (
              <div key={i} className={`rounded-xl px-3 py-2.5 border-l-[3px] ${
                isRefund ? 'bg-orange-50/60 border-l-orange-400' : 'bg-gray-50 border-l-emerald-400'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {new Date(sale.created || sale.local_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isRefund ? 'bg-orange-100 text-orange-600 font-bold' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isRefund ? 'ВЫЧЕТ' : getPaymentLabel(sale.payment_method)}
                    </span>
                  </div>
                  <p className={`text-sm font-bold ${isRefund ? 'text-orange-500 line-through' : 'text-gray-900'}`}>
                    {(sale.total || 0).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                {sale.items && sale.items.length > 0 && (
                  <div className="space-y-0.5 ml-0.5">
                    {sale.items.map((item, j) => (
                      <div key={j} className="flex justify-between text-xs">
                        <span className="text-gray-600 truncate flex-1 mr-2">
                          {item.name} <span className="text-gray-400">×{item.quantity}</span>
                        </span>
                        <span className="text-gray-400 shrink-0">{((item.price || 0) * (item.quantity || 0)).toLocaleString('ru-RU')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* Active Shift Card */}
      {activeShift ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-green-600">Смена активна</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400">Начало</p>
              <p className="text-sm font-semibold text-gray-900">{formatTime(activeShift.start)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Длительность</p>
              <p className="text-sm font-semibold text-gray-900">{formatDuration(activeShift.start, new Date().toISOString())}</p>
            </div>
          </div>
          <button
            onClick={handleCloseShift}
            disabled={closingShift}
            className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {closingShift ? 'Подготовка...' : 'Закрыть смену'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <span className="text-sm font-semibold text-gray-400">Нет активной смены</span>
          </div>
          <p className="text-xs text-gray-400">Смена начнётся автоматически при первой продаже</p>
        </div>
      )}

      {/* Shift History */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">История смен</h2>
        {shifts.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={40} className="mx-auto text-gray-200 mb-2" />
            <p className="text-gray-400 text-sm">Нет закрытых смен</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shifts.map(shift => (
              <button
                key={shift.id}
                onClick={() => { setSelectedShift(shift); setShowDetailModal(true); }}
                className="w-full bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatShortDate(shift.start)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatTime(shift.start)} – {formatTime(shift.end)} · {formatDuration(shift.start, shift.end)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">{(shift.totalAmount || 0).toLocaleString('ru-RU')} ₽</p>
                      <p className="text-xs text-gray-400">{shift.totalItems || 0} шт</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Close Shift Modal */}
      {showCloseModal && shiftData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => { setShowCloseModal(false); setShiftData(null); }}>
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Закрытие смены</h3>
                <button onClick={() => { setShowCloseModal(false); setShiftData(null); }} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Clock size={18} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-400">Время</p>
                  <p className="text-sm font-bold text-gray-900">{formatDuration(activeShift.start, shiftData.endTime)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Package size={18} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-400">Товары</p>
                  <p className="text-sm font-bold text-gray-900">{shiftData.totalItems} шт</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <RussianRuble size={18} className="mx-auto text-green-500 mb-1" />
                  <p className="text-xs text-gray-400">Сумма</p>
                  <p className="text-sm font-bold text-green-600">{shiftData.totalAmount.toLocaleString('ru-RU')}</p>
                </div>
              </div>

              {renderSalesList(shiftData.sales)}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCloseModal(false); setShiftData(null); }}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmCloseShift}
                  disabled={closingShift}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-all"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Смена {formatShortDate(selectedShift.start)}
                </h3>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">Время</p>
                  <p className="text-sm font-bold">{formatDuration(selectedShift.start, selectedShift.end)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">Товары</p>
                  <p className="text-sm font-bold">{selectedShift.totalItems} шт</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400">Сумма</p>
                  <p className="text-sm font-bold text-green-600">{(selectedShift.totalAmount || 0).toLocaleString('ru-RU')}</p>
                </div>
              </div>

              {renderSalesList(selectedShift.sales)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
