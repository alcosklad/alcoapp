import React, { useState, useEffect } from 'react';
import { Search, X, Package, Plus } from 'lucide-react';
import { getProducts } from '../lib/pocketbase';

export default function ProductSelectorModal({ isOpen, onClose, onAdd }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProducts('');
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        loadProducts(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, isOpen]);

  const loadProducts = async (query = '') => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts(query).catch(err => {
        console.error('Ошибка загрузки товаров:', err);
        return [];
      });
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
    setSelectedProduct(product);
    setShowQuantityModal(true);
  };

  const handleAddItem = (item) => {
    onAdd(item);
    setSelectedProduct(null);
    setSearchQuery('');
    setShowQuantityModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Выберите товар</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>
          
          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или артикулу"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-red-500">{error}</p>
                <button
                  onClick={() => loadProducts(searchQuery)}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Попробовать снова
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-2 gap-3">
              {products.map(product => (
                <button
                  key={product?.id || Math.random()}
                  onClick={() => handleProductClick(product)}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 text-left group"
                >
                  {/* Иконка товара */}
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                    <Package size={24} className="text-blue-600" />
                  </div>
                  
                  {/* Название */}
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                    {product?.name || 'Товар без названия'}
                  </h3>
                  
                  
                  {/* Цена */}
                  {product?.cost && (
                    <p className="text-sm font-bold text-gray-900">
                      {product.cost.toLocaleString('ru-RU')}                    </p>
                  )}
                  
                  {/* Кнопка добавления */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Нажмите чтобы добавить</span>
                    <Plus size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </button>
              ))}
              
              {products.length === 0 && !loading && !error && (
                <div className="col-span-2 text-center py-12">
                  <Package size={48} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Товары не найдены</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте товары в базу данных'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quantity Modal */}
      {showQuantityModal && (
        <QuantityModal
          isOpen={showQuantityModal}
          onClose={() => setShowQuantityModal(false)}
          onConfirm={handleAddItem}
          product={selectedProduct}
        />
      )}
    </>
  );
}

// Вспомогательный компонент для ввода количества
function QuantityModal({ isOpen, onClose, onConfirm, product }) {
  const [quantity, setQuantity] = useState('1');
  const [cost, setCost] = useState(product?.cost?.toString() || '0');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const qty = parseInt(quantity) || 0;
    const price = parseFloat(cost) || 0;
    
    if (qty <= 0) {
      alert('Количество должно быть больше 0');
      return;
    }
    
    if (price < 0) {
      alert('Цена не может быть отрицательной');
      return;
    }
    
    onConfirm({
      product,
      quantity: qty,
      cost: price
    });
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-end">
        <div className="bg-white w-full rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Добавить товар</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Product Info */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package size={24} className="text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {product?.name || 'Товар'}
                </h4>
              </div>
            </div>
          </div>
          
          {/* Form */}
          <div className="px-4 py-6 space-y-6">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Количество
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-center text-lg"
              />
            </div>
            
            {/* Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Цена закупки,              </label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-center text-lg"
              />
            </div>
            
            {/* Total */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">Сумма</span>
                <span className="text-xl font-bold text-blue-600">
                  {((parseInt(quantity) || 0) * (parseFloat(cost) || 0)).toLocaleString('ru-RU')}                </span>
              </div>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="px-4 py-4 bg-gray-50 rounded-b-3xl">
            <button
              onClick={handleConfirm}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors"
            >
              Добавить
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
