import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function QuantityModal({ isOpen, onClose, onConfirm, product }) {
  const [quantity, setQuantity] = useState('1');
  const [cost, setCost] = useState(product.cost?.toString() || '');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!quantity || !cost) return;
    
    onConfirm({
      product,
      quantity: parseInt(quantity),
      cost: parseFloat(cost)
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {product.article && (
            <p className="text-sm text-gray-500">Арт. {product.article}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Количество
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цена закупа (₽)
            </label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              Сумма: {(quantity * cost).toLocaleString('ru-RU')} ₽
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={!quantity || !cost}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl transition-colors"
          >
            ОК
          </button>
        </div>
      </div>
    </div>
  );
}
