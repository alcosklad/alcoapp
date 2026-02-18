import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { getProducts } from '../lib/pocketbase';
import QuantityModal from './QuantityModal';

export default function ProductSelector({ isOpen, onClose, onAdd }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  useEffect(() => {
    console.log('ProductSelector: isOpen =', isOpen);
    if (isOpen) {
      console.log('ProductSelector: Загружаем товары...');
      loadProducts();
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [searchQuery]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('ProductSelector: Запрашиваем товары с поиском:', searchQuery || 'без фильтра');
      
      const data = await getProducts(searchQuery).catch(err => {
        console.error('Ошибка загрузки товаров:', err);
        return [];
      });
      
      console.log('ProductSelector: Получено товаров:', data?.length || 0);
      // Защита от null/undefined
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Ошибка загрузки товаров');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product) => {
    console.log('ProductSelector: Выбран товар:', product?.name || 'Без имени');
    setSelectedProduct(product);
    setShowQuantityModal(true);
  };

  const handleAddItem = (item) => {
    console.log('ProductSelector: Добавляем товар в приемку:', item);
    onAdd(item);
    setSelectedProduct(null);
    setSearchQuery('');
  };

  if (!isOpen) {
    console.log('ProductSelector: Не рендеримся, т.к. isOpen = false');
    return null;
  }

  console.log('ProductSelector: Рендеримся, isOpen = true');

  return (
    <>
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <button
            onClick={() => {
              console.log('ProductSelector: Нажата кнопка закрытия');
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
          <h1 className="text-xl font-semibold">Выберите товар</h1>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или артикулу"
              className="w-full pl-10 pr-4 py-3 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-red-500">{error}</p>
                <button
                  onClick={loadProducts}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Попробовать снова
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {(products || []).map(product => (
                <button
                  key={product?.id || Math.random()}
                  onClick={() => handleProductClick(product)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900 break-words">
                      {product?.name || 'Товар без названия'}
                    </h3>
                    {product?.price && (
                      <p className="text-sm text-blue-600">Цена: {product.price}</p>
                    )}
                  </div>
                </button>
              ))}
              
              {(!products || products.length === 0) && !loading && !error && (
                <div className="text-center py-8 text-gray-500">
                  Товары не найдены
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quantity Modal */}
      <QuantityModal
        isOpen={showQuantityModal}
        onClose={() => setShowQuantityModal(false)}
        onConfirm={handleAddItem}
        product={selectedProduct}
      />
    </>
  );
}
