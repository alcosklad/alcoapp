import React, { useState, useEffect } from 'react';
import { X, Package, RussianRuble } from 'lucide-react';

export default function SellModal({ isOpen, onClose, product, onSell }) {
  const [quantity, setQuantity] = useState(1);
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

  if (!isOpen || !product) return null;

  const totalPrice = (product.price || 0) * quantity;
  const maxQuantity = product.quantity || 0;

  const handleSell = async () => {
    if (quantity > maxQuantity) {
      alert(`Недостаточно товара! Доступно: ${maxQuantity}`);
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const saleData = {
        user: product.userId,
        product: product.id,
        quantity: quantity,
        price: product.price || 0,
        total: totalPrice,
        supplier: product.supplier,
        sale_date: now.toISOString().split('T')[0],
        sale_time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };

      await onSell(saleData);
      onClose();
    } catch (error) {
      alert('Ошибка при продаже: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Продать товар</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Product Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Package className="text-blue-600 mt-1" size={24} />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{product.name}</h3>
              <p className="text-sm text-gray-500">Доступно: {maxQuantity} шт</p>
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Количество
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
              className="flex-1 text-center border border-gray-300 rounded-lg py-2"
              min="1"
              max={maxQuantity}
            />
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
            >
              +
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Цена за единицу:</span>
            <span className="font-semibold text-gray-900">{(product.price || 0).toLocaleString('ru-RU')}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg mt-2">
            <span className="text-sm font-medium text-gray-700">Общая сумма:</span>
            <span className="text-xl font-bold text-green-600">{totalPrice.toLocaleString('ru-RU')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleSell}
            disabled={loading || quantity > maxQuantity}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Продажа...</span>
              </>
            ) : (
              <>
                <RussianRuble size={20} />
                <span>Продать</span>
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
