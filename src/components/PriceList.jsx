import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit2, X, ChevronLeft, ChevronRight, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { getProducts, updateProduct } from '../lib/pocketbase';
import { detectSubcategory, CATEGORY_ORDER } from '../lib/subcategories';
import pb from '../lib/pocketbase';
import EditProductModal from './EditProductModal';
import CreateProductModal from './CreateProductModal';

export default function PriceList() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Фильтры
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    minCost: '',
    maxCost: '',
    volume: '',
    city: ''
  });
  
  // Выбранный город
  const [selectedCity, setSelectedCity] = useState('Все города');
  
  const productsPerPage = 50;
  
  // Получаем роль пользователя
  const userRole = pb.authStore.model?.role;

  useEffect(() => {
    loadProducts();
  }, []);

  // Блокировка скролла при открытом модальном окне
  useEffect(() => {
    if (isFilterModalOpen || isEditModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFilterModalOpen, isEditModalOpen]);

  useEffect(() => {
    applyFilters();
  }, [products, searchQuery, filters, sortField, sortDirection]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts().catch(err => {
        console.error('Error loading products:', err);
        return [];
      });
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Ошибка загрузки товаров');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];
    
    // Фильтрация
    const filteredProducts = products.filter(product => {
      // Фильтр по городу (работаем с массивом cities)
      if (selectedCity !== 'Все города') {
        const productCities = product?.cities || [];
        if (!productCities.includes(selectedCity)) {
          return false;
        }
      }
      
      // Фильтр по поиску
      if (searchQuery && !product?.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Фильтр по категории
      if (filters.category) {
        const productCategories = Array.isArray(product?.category) ? product.category : [product?.category].filter(Boolean);
        if (!productCategories.includes(filters.category)) {
          return false;
        }
      }
      
      // Фильтр по цене продажи
      if (filters.minPrice && (!product?.price || product.price < parseFloat(filters.minPrice))) {
        return false;
      }
      if (filters.maxPrice && (!product?.price || product.price > parseFloat(filters.maxPrice))) {
        return false;
      }
      
      // Фильтр по цене закупа
      if (filters.minCost && (!product?.cost || product.cost < parseFloat(filters.minCost))) {
        return false;
      }
      if (filters.maxCost && (!product?.cost || product.cost > parseFloat(filters.maxCost))) {
        return false;
      }
      
      // Фильтр по объему
      if (filters.volume && product?.volume !== filters.volume) {
        return false;
      }
      
      return true;
    });
    
    // Сортировка
    filtered.sort((a, b) => {
      // When user explicitly sorts by price or category — use that as primary sort
      if (sortField === 'cost' || sortField === 'price') {
        const aVal = sortField === 'cost' ? (Number(a?.cost) || 0) : (Number(a?.price) || 0);
        const bVal = sortField === 'cost' ? (Number(b?.cost) || 0) : (Number(b?.price) || 0);
        if (aVal !== bVal) return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        return (a?.name || '').localeCompare(b?.name || '');
      }

      if (sortField === 'category') {
        const catA = (Array.isArray(a?.category) ? a.category[0] : (a?.category || '')) || '';
        const catB = (Array.isArray(b?.category) ? b.category[0] : (b?.category || '')) || '';
        const cmp = sortDirection === 'asc' ? catA.localeCompare(catB) : catB.localeCompare(catA);
        if (cmp !== 0) return cmp;
        return (a?.name || '').localeCompare(b?.name || '');
      }

      // Default: group by category → subcategory → name
      const catA = (Array.isArray(a?.category) ? a.category[0] : (a?.category || '')) || '';
      const catB = (Array.isArray(b?.category) ? b.category[0] : (b?.category || '')) || '';
      if (catA !== catB) {
        const idxA = CATEGORY_ORDER.indexOf(catA);
        const idxB = CATEGORY_ORDER.indexOf(catB);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      }

      const subA = (a?.subcategory || detectSubcategory(a?.name)) || '';
      const subB = (b?.subcategory || detectSubcategory(b?.name)) || '';
      if (subA !== subB) return subA.localeCompare(subB);

      const aName = (a?.name || '').toLowerCase();
      const bName = (b?.name || '').toLowerCase();
      return sortDirection === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
    });
    
    setFilteredProducts(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleProductUpdated = (updatedProduct) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setIsEditModalOpen(false);
    setSelectedProduct(null);
  };

  const handleProductCreated = (newProduct) => {
    setProducts(prev => [newProduct, ...prev]);
  };

  // Пагинация
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Получаем уникальные города из массива cities
  const allCities = products.flatMap(p => p?.cities || []);
  const uniqueCities = [...new Set(allCities)].sort();
  const cities = ['Все города', ...uniqueCities];
  
  // Получаем уникальные категории для фильтра
  const allCategories = products.map(p => ({
    name: p?.name,
    category: p?.category,
    categoryType: typeof p?.category
  }));
  console.log('Products with categories:', allCategories.slice(0, 5)); // Показываем первые 5
  
  const categories = products.length > 0 ? [...new Set(
    products.flatMap(p => {
      // Если категория - массив, берем все элементы
      if (Array.isArray(p?.category)) {
        return p.category.filter(Boolean);
      }
      return p?.category ? [p.category] : [];
    })
  )] : CATEGORY_ORDER;
  console.log('Categories found:', categories); // Отладка

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
            onClick={loadProducts}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Прайс-лист</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Кнопка фильтров */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter size={18} />
            Фильтры
            {(filters.category || filters.minPrice || filters.maxPrice) && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </button>
          
          {/* Кнопка добавления товара (только для админа) */}
          {(userRole === 'admin' || userRole === 'superadmin') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Добавить
            </button>
          )}
        </div>
      </header>

      {/* Поиск и выбор города */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex gap-4 items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>
          
          {/* Выбор города */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Таблица */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Заголовок таблицы */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b font-medium text-sm text-gray-700">
                <div className="col-span-8">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  >
                    Название
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </button>
                </div>
                <div className="col-span-2 text-right pr-6">
                  <button
                    onClick={() => handleSort('cost')}
                    className="flex items-center gap-1 justify-end hover:text-blue-600 transition-colors w-full"
                  >
                    Закупка
                    {sortField === 'cost' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </button>
                </div>
                <div className="col-span-2 text-right pr-6">
                  <button
                    onClick={() => handleSort('price')}
                    className="flex items-center gap-1 justify-end hover:text-blue-600 transition-colors w-full"
                  >
                    Продажа
                    {sortField === 'price' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* Строки таблицы */}
              <div className="divide-y divide-gray-100">
                {(() => {
                  let lastCategory = null;
                  let lastSubcategory = null;
                  
                  return currentProducts.map((product) => {
                    const category = Array.isArray(product.category) ? product.category[0] : (product.category || '');
                    const subcategory = product.subcategory || detectSubcategory(product.name);
                    const showCategoryHeader = category !== lastCategory;
                    const showSubcategoryHeader = subcategory && (showCategoryHeader || subcategory !== lastSubcategory);
                    
                    if (showCategoryHeader) lastSubcategory = null;
                    lastCategory = category;
                    lastSubcategory = subcategory;

                    return (
                      <React.Fragment key={product?.id || Math.random()}>
                        {showCategoryHeader && category && (
                          <div className="bg-indigo-100 border-y border-indigo-200 sticky top-0 z-10 shadow-sm">
                            <div className="px-6 py-2.5 font-bold text-indigo-900 text-sm uppercase tracking-wider">{category}</div>
                          </div>
                        )}
                        {showSubcategoryHeader && subcategory && (
                          <div className="bg-indigo-50/60 border-y border-indigo-100">
                            <div className="px-6 py-1.5 font-semibold text-indigo-700 text-xs border-l-[3px] border-indigo-400">{subcategory}</div>
                          </div>
                        )}
                        <div
                          className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-gray-50 transition-colors items-center border-b border-gray-100"
                        >
                          <div className="col-span-8 flex items-center gap-2">
                            {userRole === 'admin' && (
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                                title="Редактировать"
                              >
                                <Edit2 size={16} className="text-gray-500" />
                              </button>
                            )}
                            <p className="font-medium text-gray-900">{product?.name || '—'}</p>
                          </div>
                          <div className="col-span-2 text-right pr-6">
                            <p className="text-gray-600">
                              {product?.cost ? `${product.cost.toLocaleString('ru-RU')}` : '—'}
                            </p>
                          </div>
                          <div className="col-span-2 text-right pr-6">
                            <p className="font-semibold text-gray-900">
                              {product?.price ? `${product.price.toLocaleString('ru-RU')}` : '—'}
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Товары не найдены
                </div>
              )}
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Показано {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} из {filteredProducts.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Назад
                  </button>
                  <span className="px-3 py-1">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Модальное окно фильтров */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Фильтры</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категория
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Все категории</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat} className="text-gray-900">{cat || 'EMPTY'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена продажи
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                      placeholder="От"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-gray-500">—</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                      placeholder="До"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цена закупа
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={filters.minCost}
                      onChange={(e) => setFilters(prev => ({ ...prev, minCost: e.target.value }))}
                      placeholder="От"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-gray-500">—</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={filters.maxCost}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxCost: e.target.value }))}
                      placeholder="До"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Объем
                </label>
                <select
                  value={filters.volume}
                  onChange={(e) => setFilters(prev => ({ ...prev, volume: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все объемы</option>
                  <option value="0.5л">0.5л</option>
                  <option value="0.7л">0.7л</option>
                  <option value="1л">1л</option>
                  <option value="1.5л">1.5л</option>
                  <option value="другое">Другое</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setFilters({ category: '', minPrice: '', maxPrice: '', minCost: '', maxCost: '', volume: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Сбросить
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {isEditModalOpen && selectedProduct && (
        <EditProductModal
          product={selectedProduct}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedProduct(null);
          }}
          onSave={handleProductUpdated}
        />
      )}

      {/* Модальное окно создания товара */}
      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProductCreated={handleProductCreated}
      />
    </div>
  );
}
