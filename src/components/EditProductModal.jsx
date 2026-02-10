import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { updateProduct } from '../lib/pocketbase';

export default function EditProductModal({ product, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    cost: '',
    price: '',
    volume: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || '',
        cost: product.cost?.toString() || '',
        price: product.price?.toString() || '',
        volume: product.volume?.toString() || ''
      });
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Название товара обязательно');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updateData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        cost: parseFloat(formData.cost) || 0,
        price: parseFloat(formData.price) || 0,
        volume: formData.volume.trim()
      };

      const updated = await updateProduct(product.id, updateData);
      onSave(updated);
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Ошибка при сохранении товара');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Редактировать товар</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Название */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название товара *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                placeholder="Например: Водка Тундра 0.7л"
                required
              />
            </div>

            {/* Категория */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Категория
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              >
                <option value="">Выберите категорию</option>
                <option value="Водка">Водка</option>
                <option value="Виски">Виски</option>
                <option value="Вино">Вино</option>
                <option value="Коньяк">Коньяк</option>
                <option value="Ром">Ром</option>
                <option value="Текила">Текила</option>
                <option value="Джин">Джин</option>
                <option value="Ликер">Ликер</option>
                <option value="Шампанское">Шампанское</option>
                <option value="Пиво">Пиво</option>
                <option value="Другое">Другое</option>
              </select>
            </div>

            {/* Объем */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Объем
              </label>
              <input
                type="text"
                value={formData.volume}
                onChange={(e) => setFormData(prev => ({ ...prev, volume: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                placeholder="Например: 0.7л"
              />
            </div>

            {/* Цена закупа */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Цена закупа,              </label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            {/* Цена продажи */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Цена продажи,              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>

            {/* Ошибка */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Сохранить
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
