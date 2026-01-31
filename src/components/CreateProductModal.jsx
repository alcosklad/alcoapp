import React, { useState } from 'react';
import { X } from 'lucide-react';
import pb from '../lib/pocketbase';

const CATEGORIES = [
  'Вино',
  'Водка',
  'Виски',
  'Коньяк',
  'Ром',
  'Текила',
  'Джин',
  'Ликер',
  'Шампанское',
  'Вермут',
  'Пиво',
  'Сидр',
  'Напитки',
  'Сигареты и Стики',
  'Электронные сигареты',
  'Снэки и Закуски',
  'Шоколад и Конфеты',
  'Энергетики',
  'Безалкогольные напитки',
  'Другое'
];

const CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Уфа',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Самара',
  'Воронеж',
  'Волгоград',
  'Сочи',
  'Краснодар',
  'Пермь',
  'Челябинск',
  'Омск',
  'Красноярск',
  'Омск',
  'Калининград',
  'Сургут',
  'Саратов',
  'Мурманск',
  'Новосибирск'
];

export default function CreateProductModal({ isOpen, onClose, onProductCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    cost: '',
    cities: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        price: formData.price ? parseFloat(formData.price) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        cities: formData.cities,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      const record = await pb.collection('products').create(productData);
      onProductCreated(record);
      onClose();
      
      // Сброс формы
      setFormData({
        name: '',
        category: '',
        price: '',
        cost: '',
        cities: []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (city) => {
    setFormData(prev => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter(c => c !== city)
        : [...prev.cities, city]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Создать товар</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название товара
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Например: Водка Русский Стандарт 0.7л"
            />
          </div>

          {/* Категория */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категория
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Выберите категорию</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Цены */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цена продажи (₽)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цена закупа (₽)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Города */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Города присутствия
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
              {CITIES.map(city => (
                <label key={city} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={formData.cities.includes(city)}
                    onChange={() => handleCityChange(city)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{city}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать товар'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
