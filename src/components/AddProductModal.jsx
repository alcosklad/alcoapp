import React, { useState } from 'react';
import { X, Package, Plus } from 'lucide-react';
import { createProduct } from '../lib/pocketbase';

export default function AddProductModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    article: '',
    barcode: '',
    price: '',
    cost: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.name.trim()) {
      setError('Название товара обязательно');
      return;
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Цена должна быть больше 0');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const productData = {
        name: formData.name.trim(),
        article: formData.article.trim(),
        barcode: formData.barcode.trim(),
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : 0
      };
      
      const newProduct = await createProduct(productData);
      
      // Очищаем форму
      setFormData({
        name: '',
        article: '',
        barcode: '',
        price: '',
        cost: ''
      });
      
      // Сообщаем о добавлении
      onAdd(newProduct);
      onClose();
      
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Ошибка при создании товара');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end">
        <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Добавить товар</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
            {/* Иконка товара */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Package size={40} className="text-blue-600" />
              </div>
            </div>
            
            {/* Название */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название товара *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Например: Вино красное"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                autoFocus
              />
            </div>
            
            {/* Штрихкод */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Штрихкод
              </label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                placeholder="4600000000000"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>
            
            {/* Цена и Закупка */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена продажи *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="1500"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-lg font-semibold"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена закупки
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => handleInputChange('cost', e.target.value)}
                    placeholder="1000"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">₽</span>
                </div>
              </div>
            </div>
            
            {/* Маржа */}
            {formData.price && formData.cost && (
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Маржа</span>
                  <span className="text-lg font-bold text-blue-600">
                    {(parseFloat(formData.price) - parseFloat(formData.cost)).toLocaleString('ru-RU')}                    <span className="text-sm font-normal ml-2">
                      ({(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            )}
            
            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Plus size={20} />
                    Добавить
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
