import React, { useState, useEffect } from 'react';

export default function SellModal({ isOpen, onClose, stock, onSell }) {
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('продано');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Блокируем скролл при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Возвращаем скролл при размонтировании
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !stock) return null;

  const maxQuantity = stock.quantity || 0;
  const pricePerUnit = stock.expand?.product?.price || 0;
  const costPerUnit = stock.expand?.product?.cost || 0;
  const currentTotal = maxQuantity * pricePerUnit;
  const selectedQuantity = parseInt(quantity) || 0;
  const selectedTotal = selectedQuantity * pricePerUnit;
  const remainingQuantity = maxQuantity - selectedQuantity;
  const remainingTotal = remainingQuantity * pricePerUnit;

  const handleSell = async () => {
    if (selectedQuantity <= 0) {
      alert('Выберите количество для продажи');
      return;
    }

    if (selectedQuantity > stock.quantity) {
      alert('Нельзя продать больше чем есть в наличии');
      return;
    }

    setLoading(true);
    try {
      await onSell({
        productId: stock.product,
        warehouseId: stock.warehouse,
        quantity: selectedQuantity,
        reason: reason,
        comment: comment
      });
      
      // Закрываем модальное окно после успешной продажи
      onClose();
    } catch (error) {
      console.error('Ошибка продажи:', error);
      alert('Ошибка при продаже: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Продажа товара</h2>
          <button
            onClick={handleSell}
            disabled={loading || !quantity}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Списание...' : 'Списать'}
          </button>
        </div>

        {/* Product Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900">{stock.expand?.product?.name || 'Товар'}</h3>
          {stock.expand?.product?.article && (
            <p className="text-sm text-gray-500">Арт. {stock.expand.product.article}</p>
          )}
          <div className="mt-3 space-y-1">
            <p className="text-sm text-gray-600">
              Текущее количество: <span className="font-medium">{maxQuantity} шт</span>
            </p>
            <p className="text-sm text-gray-600">
              Закупочная цена: <span className="font-medium">{costPerUnit.toLocaleString('ru-RU')}</span>
            </p>
            <p className="text-sm text-gray-600">
              Цена продажи: <span className="font-medium">{pricePerUnit.toLocaleString('ru-RU')}</span>
            </p>
            <p className="text-sm font-medium text-gray-900">
              Общая сумма: <span className="text-lg">{currentTotal.toLocaleString('ru-RU')}</span>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSell(); }} className="space-y-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество для списания
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Введите количество"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Доступно: до {maxQuantity} шт</p>
          </div>

          {/* Calculation */}
          <div className="p-2 bg-blue-50 rounded-lg">
            <div className="space-y-1 text-xs">
              <p className="text-gray-600">
                Сумма списания: <span className="font-medium text-blue-600">{selectedTotal.toLocaleString('ru-RU')}</span>
              </p>
              <p className="text-gray-600">
                Остаток после: <span className="font-medium">{remainingQuantity} шт</span>
              </p>
              <p className="text-gray-600">
                Общая сумма остатка: <span className="font-medium text-green-600">{remainingTotal.toLocaleString('ru-RU')}</span>
              </p>
              {selectedQuantity > 0 && (
                <div className="pt-1 border-t border-blue-200">
                  <p className="text-gray-600">
                    Прибыль: <span className="font-medium text-green-600">
                      {((pricePerUnit - costPerUnit) * selectedQuantity).toLocaleString('ru-RU')}                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Причина
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="продано">Продано</option>
              <option value="не ликвид">Не ликвид</option>
              <option value="испорчено">Испорчено</option>
            </select>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Комментарий (необязательно)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Добавьте комментарий..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          </form>
      </div>
    </div>
  );
}
