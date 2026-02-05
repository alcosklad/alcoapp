import React, { useState, useEffect } from 'react';
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
import { Search, ChevronUp, ChevronDown, RefreshCw, Edit2, Check, X } from 'lucide-react';
=======
import { Search, ChevronUp, ChevronDown, RefreshCw, Edit2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
import { Search, ChevronUp, ChevronDown, RefreshCw, Edit2, Check, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
import { getProducts, updateProduct } from '../../lib/pocketbase';
=======
import { Search, ChevronUp, ChevronDown, RefreshCw, Edit2, Check, X, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { getProducts, updateProduct, deleteProduct } from '../../lib/pocketbase';
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
import pb from '../../lib/pocketbase';
import CreateProductModal from '../CreateProductModal';

export default function PriceListDesktop() {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedCity, setSelectedCity] = useState('Все города');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 50;
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
=======
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx

  const userRole = pb.authStore.model?.role;
  const canEdit = userRole === 'admin';

  const cities = [
    'Все города',
    'Пермь',
    'Екатеринбург',
    'Иркутск',
    'Казань',
    'Калининград',
    'Красноярск',
    'Краснодар',
    'Москва',
    'Мурманск',
    'Нижний Новгород',
    'Новосибирск',
    'Омск',
    'Самара',
    'Саратов',
    'Сочи',
    'Санкт-Петербург',
    'Сургут',
    'Уфа',
    'Волгоград',
    'Воронеж'
  ];
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx

  useEffect(() => {
    loadProducts();
  }, []);
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx

  useEffect(() => {
    filterByCity();
  }, [selectedCity, allProducts]);
=======

  useEffect(() => {
    filterByCity();
    setCurrentPage(1); // Сбрасываем на первую страницу при смене города
  }, [selectedCity, allProducts]);

  useEffect(() => {
    setCurrentPage(1); // Сбрасываем на первую страницу при поиске
  }, [searchQuery]);

  useEffect(() => {
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
    const timer = setTimeout(() => {
      if (page === 1) {
        loadProducts();
      } else {
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
=======

  useEffect(() => {
    filterByCity();
    setCurrentPage(1);
  }, [selectedCity, allProducts]);

  useEffect(() => {
    setCurrentPage(1);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
  }, [searchQuery]);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
    loadProducts();
  }, []);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx

  const loadProducts = async () => {
    try {
      setLoading(true);
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
      const data = await getProducts().catch(() => []);
      setAllProducts(data || []);
=======
      const data = await getProducts(page, 50, searchQuery, selectedCity);
      setProducts(data.items || []);
      setTotalItems(data.totalItems || 0);
      setTotalPages(data.totalPages || 1);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
      const data = await getProducts().catch(() => []);
      setAllProducts(data || []);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
      const data = await getProducts().catch(() => []);
      setAllProducts(data || []);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
      const data = await getProducts().catch(() => ({ items: [] }));
      setAllProducts(data.items || []);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
      const data = await getProducts().catch(() => []);
      // Поддержка обоих форматов: массив (getFullList) или объект с items (getList)
      const items = Array.isArray(data) ? data : (data?.items || []);
      setAllProducts(items);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
=======
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
  const filterByCity = () => {
    if (selectedCity === 'Все города') {
      setProducts(allProducts);
    } else {
      const filtered = allProducts.filter(product => {
        const productCities = product.cities || [];
        return productCities.includes(selectedCity);
      });
      setProducts(filtered);
    }
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
=======
  const handleCityChange = (e) => {
    setSelectedCity(e.target.value);
    setPage(1);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (productId) => {
    try {
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
      await updateProduct(productId, {
=======
=======
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
      const updatedProduct = await updateProduct(productId, {
        name: editValues.name,
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
        cost: Number(editValues.purchasePrice),
        price: Number(editValues.price),
      });
      
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
      // Обновляем товар в списке без перезагрузки
=======
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
      setAllProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, ...updatedProduct } : p)
      );
      
      setEditingId(null);
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
      loadProducts();
=======
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Ошибка сохранения');
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditValues({
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
=======
      name: product.name || '',
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
      name: product.name,
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
      purchasePrice: product.cost || product.purchasePrice || 0,
      price: product.price || 0,
    });
  };

<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
<<<<<<< /Users/rostislavkomkov/Desktop/alcoapp/src/components/desktop/PriceListDesktop.jsx
  const handleProductCreated = (newProduct) => {
    setAllProducts(prev => [newProduct, ...prev]);
=======
  const handleCreateProduct = async (productData) => {
    try {
      setLoading(true);
      await createProduct(productData);
      setIsCreateModalOpen(false);
      // Перезагружаем список, чтобы увидеть новый товар (особенно если он попадает под текущий фильтр города)
      loadProducts(selectedCity, searchQuery, sortField, sortDir, page);
      alert('Товар успешно создан');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Ошибка при создании товара');
    } finally {
      setLoading(false);
    }
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
=======
  const handleProductCreated = (newProduct) => {
    setAllProducts(prev => [newProduct, ...prev]);
>>>>>>> /Users/rostislavkomkov/.windsurf/worktrees/alcoapp/alcoapp-eb6df20a/src/components/desktop/PriceListDesktop.jsx
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Вы уверены, что хотите удалить товар "${productName}"?`)) {
      return;
    }

    try {
      await deleteProduct(productId);
      setAllProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Ошибка при удалении товара');
    }
  };

  const filteredAndSearched = products
    .filter(product => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        product?.name?.toLowerCase().includes(query) ||
        product?.article?.toLowerCase().includes(query)
      );
    });

  const totalPages = Math.ceil(filteredAndSearched.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;

  const filteredProducts = filteredAndSearched
    .sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'name':
          aVal = a?.name || '';
          bVal = b?.name || '';
          break;
        case 'article':
          aVal = a?.article || '';
          bVal = b?.article || '';
          break;
        case 'category':
          aVal = a?.category || '';
          bVal = b?.category || '';
          break;
        case 'purchasePrice':
          aVal = a?.cost || 0;
          bVal = b?.cost || 0;
          break;
        case 'price':
          aVal = a?.price || 0;
          bVal = b?.price || 0;
          break;
        default:
          aVal = '';
          bVal = '';
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    })
    .slice(startIndex, endIndex);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="space-y-4">
      {/* Панель фильтров */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Город:</label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {cities.map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию или артикулу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={loadProducts}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          title="Обновить"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>

        {canEdit && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            <Plus size={14} />
            Создать новый товар
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-500">
            Найдено: {filteredAndSearched.length}
          </span>
          {totalPages > 1 && (
            <>
              <span className="text-sm text-gray-400">|</span>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-0.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Предыдущая страница"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm text-gray-500">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-0.5 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Следующая страница"
              >
                <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th 
                  className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('article')}
                >
                  <div className="flex items-center gap-1">
                    Артикул <SortIcon field="article" />
                  </div>
                </th>
                <th 
                  className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Наименование <SortIcon field="name" />
                  </div>
                </th>
                <th 
                  className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Категория <SortIcon field="category" />
                  </div>
                </th>
                <th 
                  className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('purchasePrice')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Закуп <SortIcon field="purchasePrice" />
                  </div>
                </th>
                <th 
                  className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Продажа <SortIcon field="price" />
                  </div>
                </th>
                {canEdit && (
                  <th className="w-16 px-3 py-2"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin" />
                      Загрузка...
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'Ничего не найдено' : 'Нет данных'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isEditing = editingId === product.id;
                  
                  return (
                    <tr 
                      key={product.id} 
                      className={`border-b border-gray-100 ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-1.5 font-mono text-xs text-gray-600">
                        {product.article || '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.name}
                            onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                            className="w-full px-0 py-0 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span>{product.name || 'Без названия'}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">
                        {product.category || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.purchasePrice}
                            onChange={(e) => setEditValues({...editValues, purchasePrice: e.target.value})}
                            className="w-24 px-0 py-0 border border-blue-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        ) : (
                          <span className="text-gray-600">
                            {(product.cost || 0).toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.price}
                            onChange={(e) => setEditValues({...editValues, price: e.target.value})}
                            className="w-24 px-0 py-0 border border-blue-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        ) : (
                          <span className="font-medium">
                            {(product.price || 0).toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-1.5">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveEdit(product.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Сохранить"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                title="Отменить"
                              >
                                <X size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Удалить товар"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(product)}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              title="Редактировать"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно создания товара */}
      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProductCreated={handleProductCreated}
      />
    </div>
  );
}
