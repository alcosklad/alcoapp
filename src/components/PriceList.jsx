import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { getStocks, getWarehouses, getProducts, pb } from '../lib/pocketbase';
import AddProductModal from './AddProductModal';

export default function PriceList() {
  const [stocks, setStocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Получаем роль пользователя
  const userRole = pb.authStore.model?.role;

  useEffect(() => {
    loadWarehouses();
    loadProducts();
  }, []);

  useEffect(() => {
    loadStocks();
  }, [selectedWarehouse]);

  const loadProducts = async () => {
    try {
      const data = await getProducts().catch(err => {
        console.error('Error loading products:', err);
        return [];
      });
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const data = await getWarehouses().catch(err => {
        console.error('Error loading warehouses:', err);
        return [];
      });
      setWarehouses(data || []);
      if (data && data.length > 0) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
      setError('Ошибка загрузки складов');
    }
  };

  const loadStocks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStocks(selectedWarehouse || null).catch(err => {
        console.error('Error loading stocks:', err);
        return [];
      });
      setStocks(data || []);
    } catch (error) {
      console.error('Error loading stocks:', error);
      setError('Ошибка загрузки остатков');
    } finally {
      setLoading(false);
    }
  };

  const handleProductAdded = () => {
    // Обновляем список товаров после добавления
    loadStocks();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Ошибка</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={loadStocks}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Прайс-лист</h1>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск товаров по названию или артикулу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Product List */}
      <div className="px-4">
        {((!stocks || stocks.length === 0) && (!products || products.length === 0)) ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Товары не найдены</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Показываем товары из остатков */}
            {(stocks || [])
              .filter(stock => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                const name = stock?.product?.name || '';
                const article = stock?.product?.article || '';
                return name.toLowerCase().includes(query) || article.toLowerCase().includes(query);
              })
              .map(stock => (
              <div key={stock?.id || Math.random()} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {stock?.product?.name || 'Товар не найден'}
                    </h3>
                    {stock?.product?.article && (
                      <p className="text-sm text-gray-500 mt-1">Арт. {stock.product.article}</p>
                    )}
                    {stock?.product?.barcode && (
                      <p className="text-xs text-gray-400 mt-1">ШК {stock.product.barcode}</p>
                    )}
                    <div className="mt-3 flex items-baseline gap-4">
                      <p className="text-2xl font-bold text-blue-600">
                        {stock?.product?.price ? `${stock.product.price.toLocaleString('ru-RU')} ₽` : '—'}
                      </p>
                      {stock?.product?.cost && stock.product.cost !== stock.product.price && (
                        <p className="text-sm text-gray-500">
                          Закупка: {stock.product.cost.toLocaleString('ru-RU')} ₽
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p
                      className={`text-lg font-semibold ${
                        stock?.quantity > 10 ? 'text-green-600' : stock?.quantity > 0 ? 'text-yellow-600' : 'text-red-600'
                      }`}
                    >
                      {stock?.quantity || 0} шт
                    </p>
                    {stock?.warehouse && (
                      <p className="text-xs text-gray-400 mt-2">{stock.warehouse.name}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Показываем товары без остатков */}
            {(stocks || []).length === 0 && (products || [])
              .filter(product => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                const name = product?.name || '';
                const article = product?.article || '';
                return name.toLowerCase().includes(query) || article.toLowerCase().includes(query);
              })
              .map(product => (
              <div key={product?.id || Math.random()} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {product?.name || 'Товар не найден'}
                    </h3>
                    {product?.article && (
                      <p className="text-sm text-gray-500 mt-1">Арт. {product.article}</p>
                    )}
                    {product?.barcode && (
                      <p className="text-xs text-gray-400 mt-1">ШК {product.barcode}</p>
                    )}
                    <div className="mt-3 flex items-baseline gap-4">
                      <p className="text-2xl font-bold text-blue-600">
                        {product?.price ? `${product.price.toLocaleString('ru-RU')} ₽` : '—'}
                      </p>
                      {product?.cost && product.cost !== product.price && (
                        <p className="text-sm text-gray-500">
                          Закупка: {product.cost.toLocaleString('ru-RU')} ₽
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-semibold text-gray-400">
                      0 шт
                    </p>
                    <p className="text-xs text-gray-500">Нет в наличии</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {stocks && stocks.length > 0 && (
        <div className="px-4 py-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-900">
                Всего товаров: {stocks.length}
              </span>
              <span className="text-sm font-medium text-blue-900">
                Общая сумма: {stocks.reduce((sum, stock) => 
                  sum + ((stock?.product?.price || 0) * (stock?.quantity || 0)), 0
                ).toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button - только для администратора */}
      {userRole === 'admin' && (
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Add Product Modal - только для администратора */}
      {userRole === 'admin' && (
        <AddProductModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleProductAdded}
        />
      )}
    </div>
  );
}
