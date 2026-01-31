import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, MapPin, Building, Search, Calendar, X } from 'lucide-react';
import { getSuppliers, getWarehouses, getProducts } from '../lib/pocketbase';
import ProductSelectorModal from './ProductSelectorModal';

export default function CreateReceptionScreen({ onBack, onContinue }) {
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedWarehouses, setSelectedWarehouses] = useState([]); // Массив выбранных магазинов
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        searchProducts(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  const searchProducts = async (query) => {
    try {
      console.log('🔍 Ищем товары:', query);
      const results = await getProducts(query).catch(err => {
        console.error('Ошибка поиска товаров:', err);
        return [];
      });
      console.log('✅ Найдено товаров:', results?.length || 0);
      setSearchResults(results || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    }
  };

  const handleAddItem = (item) => {
    // Проверяем, есть ли товар уже в списке
    const exists = selectedItems.find(i => i.product.id === item.product.id);
    if (!exists) {
      setSelectedItems(prev => [...prev, item]);
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleRemoveItem = (index) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [suppliersData, warehousesData] = await Promise.all([
        getSuppliers().catch(err => {
          console.error('Ошибка загрузки suppliers:', err);
          return [];
        }),
        getWarehouses().catch(err => {
          console.error('Ошибка загрузки warehouses:', err);
          return [];
        })
      ]);
      
      setSuppliers(suppliersData || []);
      setWarehouses(warehousesData || []);
      
      if (suppliersData && suppliersData.length > 0) {
        setSelectedSupplier(suppliersData[0].id);
      }
      if (warehousesData && warehousesData.length > 0) {
        // Не выбираем автоматически, пусть пользователь выбирает
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedSupplier || selectedWarehouses.length === 0) {
      setError('Выберите город и хотя бы один магазин');
      return;
    }
    
    // Рассчитываем общую сумму
    const totalAmount = selectedItems.reduce((sum, item) => {
      return sum + (item.quantity * item.cost);
    }, 0);
    
    const dataToPass = {
      supplier: selectedSupplier,
      warehouses: selectedWarehouses, // Передаем массив магазинов
      date: date,
      items: selectedItems,
      totalAmount: totalAmount
    };
    
    console.log('CreateReceptionScreen передает данные:', dataToPass);
    onContinue(dataToPass);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Создать приемку</h1>
        </div>
      </header>

      {/* Content с скроллом */}
      <div className="px-4 py-6 space-y-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Дата */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Calendar size={18} className="text-gray-400" />
                Дата приемки
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Город */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <MapPin size={18} className="text-gray-400" />
                Город
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="">Выберите город</option>
                {(suppliers || []).map(supplier => (
                  <option key={supplier?.id || Math.random()} value={supplier?.id}>
                    {supplier?.name || 'Неизвестный город'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Магазин */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Building size={18} className="text-gray-400" />
                Магазин
              </label>
              <div className="relative">
                {/* Селект для выбора магазинов */}
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !selectedWarehouses.includes(e.target.value)) {
                      setSelectedWarehouses(prev => [...prev, e.target.value]);
                    }
                  }}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="">Выберите магазин</option>
                  {(warehouses || []).map(warehouse => {
                    const isSelected = selectedWarehouses.includes(warehouse?.id);
                    return (
                      <option 
                        key={warehouse?.id || Math.random()} 
                        value={warehouse?.id}
                        disabled={isSelected}
                      >
                        {warehouse?.name || 'Неизвестный магазин'}{isSelected ? ' (выбран)' : ''}
                      </option>
                    );
                  })}
                </select>
                
                {/* Теги выбранных магазинов */}
                {selectedWarehouses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedWarehouses.map(warehouseId => {
                      const warehouse = warehouses.find(w => w.id === warehouseId);
                      return (
                        <span
                          key={warehouseId}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {warehouse?.name || 'Магазин'}
                          <button
                            onClick={() => {
                              setSelectedWarehouses(prev => prev.filter(id => id !== warehouseId));
                            }}
                            className="ml-1 hover:text-blue-900"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Поиск товаров */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Search size={18} className="text-gray-400" />
                Добавить товары
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию или артикулу"
                  className="w-full px-4 py-3 pl-10 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="absolute right-3 top-3.5 p-0.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>

              {/* Результаты поиска */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map(product => (
                    <button
                      key={product?.id || Math.random()}
                      onClick={() => {
                        handleAddItem({
                          product: product,
                          quantity: 1,
                          cost: product?.cost || 0
                        });
                      }}
                      className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{product?.name || 'Товар'}</p>
                        {product?.article && (
                          <p className="text-sm text-gray-500">Арт. {product.article}</p>
                        )}
                      </div>
                      {product?.price && (
                        <p className="text-sm font-semibold text-blue-600">
                          {product.price.toLocaleString('ru-RU')} ₽
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Выбранные товары */}
            {selectedItems.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Товары для приемки ({selectedItems.length})
                </label>
                <div className="space-y-2">
                  {selectedItems.map((item, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item?.product?.name || 'Товар'}</p>
                        <p className="text-sm text-gray-500">
                          {item?.quantity || 0} шт × {item?.cost || 0} ₽ = {((item?.quantity || 0) * (item?.cost || 0)).toLocaleString('ru-RU')} ₽
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Общая сумма */}
                <div className="mt-4 bg-blue-50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-blue-900">Итого:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {selectedItems.reduce((sum, item) => sum + ((item?.quantity || 0) * (item?.cost || 0)), 0).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Кнопка перехода к приемке */}
            {selectedItems.length > 0 && (
              <button
                onClick={handleContinue}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>Перейти к приемке</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      {!loading && (
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Product Selector Modal */}
      <ProductSelectorModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onAdd={handleAddItem}
      />
    </div>
  );
}
