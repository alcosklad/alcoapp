import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, Edit2, Check, X, Plus } from 'lucide-react';
import { getProducts, updateProduct, createProduct, getSuppliers } from '../../lib/pocketbase';
import { detectSubcategory } from '../../lib/subcategories';
import pb from '../../lib/pocketbase';

export default function PriceListDesktop() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalProduct, setEditModalProduct] = useState(null);
  const [editModalForm, setEditModalForm] = useState({ name: '', article: '', category: '', subcategory: '', cost: 0, price: 0 });
  const [editModalSaving, setEditModalSaving] = useState(false);
  const [editModalError, setEditModalError] = useState('');

  const userRole = pb.authStore.model?.role;
  const canEdit = userRole === 'admin';

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers().catch(() => []);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts().catch(() => []);
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditValues({
      purchasePrice: product.cost || 0,
      price: product.price || 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (productId) => {
    try {
      await updateProduct(productId, {
        cost: Number(editValues.purchasePrice),
        price: Number(editValues.price),
      });
      setEditingId(null);
      loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Ошибка сохранения');
    }
  };

  // Категории для select в модалке
  const allCategories = useMemo(() => {
    const cats = new Set();
    products.forEach(p => {
      const c = Array.isArray(p?.category) ? p.category[0] : p?.category;
      if (c) cats.add(c);
    });
    return [...cats].sort();
  }, [products]);

  const openEditModal = (product) => {
    setEditModalProduct(product);
    setEditModalForm({
      name: product.name || '',
      article: product.article || '',
      category: (Array.isArray(product.category) ? product.category[0] : product.category) || '',
      subcategory: product.subcategory || '',
      cost: product.cost || 0,
      price: product.price || 0,
    });
    setEditModalError('');
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setEditModalProduct(null);
    setEditModalForm({ name: '', article: '', category: '', subcategory: '', cost: 0, price: 0 });
    setEditModalError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditModalProduct(null);
    setEditModalError('');
  };

  const saveEditModal = async () => {
    if (!editModalForm.name.trim()) {
      setEditModalError('Введите название товара');
      return;
    }
    setEditModalSaving(true);
    setEditModalError('');
    try {
      const data = {
        name: editModalForm.name.trim(),
        article: editModalForm.article.trim(),
        category: editModalForm.category ? [editModalForm.category] : [],
        subcategory: editModalForm.subcategory || detectSubcategory(editModalForm.name),
        cost: Number(editModalForm.cost) || 0,
        price: Number(editModalForm.price) || 0,
      };
      if (editModalProduct) {
        await updateProduct(editModalProduct.id, data);
      } else {
        await createProduct(data);
      }
      closeEditModal();
      loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setEditModalError('Ошибка сохранения: ' + (err?.message || ''));
    } finally {
      setEditModalSaving(false);
    }
  };

  // Находим имя выбранного города для фильтрации по cities
  const selectedCityName = useMemo(() => {
    if (!selectedSupplier) return '';
    const sup = suppliers.find(s => s.id === selectedSupplier);
    return sup?.name || '';
  }, [selectedSupplier, suppliers]);

  const filteredProducts = products
    .filter(product => {
      const name = product?.name || '';
      const article = product?.article || '';
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.toLowerCase().includes(query) || article.toLowerCase().includes(query);

      // Фильтр по городу: если выбран город, показываем товары у которых этот город в cities
      // Фоллбек: если у товара нет cities вообще — показываем его в любом случае (base_price)
      if (selectedCityName) {
        const cities = product?.cities || [];
        if (cities.length > 0 && !cities.some(c => c === selectedCityName || c.includes(selectedCityName) || selectedCityName.includes(c))) {
          return false;
        }
      }

      return matchesSearch;
    })
    .sort((a, b) => {
      // Первичная: по категории (для группировки)
      const catA = (Array.isArray(a?.category) ? a.category[0] : (a?.category || '')) || '';
      const catB = (Array.isArray(b?.category) ? b.category[0] : (b?.category || '')) || '';
      if (catA !== catB) return catA.localeCompare(catB);

      // Вторичная: по подкатегории
      const subA = (a?.subcategory || detectSubcategory(a?.name)) || '';
      const subB = (b?.subcategory || detectSubcategory(b?.name)) || '';
      if (subA !== subB) return subA.localeCompare(subB);

      // Третичная: по выбранному полю
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
        case 'purchasePrice':
          aVal = a?.cost || 0;
          bVal = b?.cost || 0;
          break;
        case 'price':
          aVal = a?.price || 0;
          bVal = b?.price || 0;
          break;
        default:
          aVal = a?.name || '';
          bVal = b?.name || '';
      }

      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

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
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все города</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
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
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Добавить товар
          </button>
        )}

        <span className="text-sm text-gray-500 ml-auto">
          Найдено: {filteredProducts.length}
        </span>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th 
                  className="text-left px-2 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 w-[70px] max-w-[70px]"
                  onClick={() => handleSort('article')}
                >
                  <div className="flex items-center gap-1">
                    Арт. <SortIcon field="article" />
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
                (() => {
                let lastCategory = null;
                let lastSubcategory = null;
                return filteredProducts.map((product) => {
                  const isEditing = editingId === product.id;
                  const category = Array.isArray(product.category) ? product.category[0] : (product.category || '');
                  const subcategory = product.subcategory || detectSubcategory(product.name);
                  const showCategoryHeader = category !== lastCategory;
                  const showSubcategoryHeader = subcategory && (showCategoryHeader || subcategory !== lastSubcategory);
                  if (showCategoryHeader) lastSubcategory = null;
                  lastCategory = category;
                  lastSubcategory = subcategory;
                  
                  return (
                    <React.Fragment key={product.id}>
                      {showCategoryHeader && category && (
                        <tr className="bg-blue-50 border-y border-blue-200">
                          <td colSpan={canEdit ? 6 : 5} className="px-3 py-1.5 font-semibold text-blue-800 text-xs sticky top-0">
                            {category}
                          </td>
                        </tr>
                      )}
                      {showSubcategoryHeader && subcategory && (
                        <tr className="bg-gray-50 border-y border-gray-200">
                          <td colSpan={canEdit ? 6 : 5} className="px-6 py-1 font-medium text-gray-600 text-xs">
                            {subcategory}
                          </td>
                        </tr>
                      )}
                    <tr 
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-2 py-1.5 font-mono text-xs text-gray-500 w-[70px] max-w-[70px] truncate">
                        {product.article || '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        {product.name || 'Без названия'}
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
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                          />
                        ) : (
                          <span className="text-gray-600">
                            {(product.cost || 0).toLocaleString('ru-RU')}                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.price}
                            onChange={(e) => setEditValues({...editValues, price: e.target.value})}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                          />
                        ) : (
                          <span className="font-medium">
                            {(product.price || 0).toLocaleString('ru-RU')}                          </span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-1.5">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveEdit(product.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openEditModal(product)}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              title="Редактировать товар"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    </React.Fragment>
                  );
                });
              })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка редактирования/создания товара */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeEditModal}>
          <div className="bg-white rounded-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editModalProduct ? 'Редактировать товар' : 'Новый товар'}
              </h3>
              <button onClick={closeEditModal} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editModalError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{editModalError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  type="text"
                  value={editModalForm.name}
                  onChange={e => setEditModalForm({...editModalForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Название товара"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Артикул</label>
                <input
                  type="text"
                  value={editModalForm.article}
                  onChange={e => setEditModalForm({...editModalForm, article: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Артикул"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                  <select
                    value={editModalForm.category}
                    onChange={e => setEditModalForm({...editModalForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Не указана</option>
                    {allCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Подкатегория</label>
                  <input
                    type="text"
                    value={editModalForm.subcategory}
                    onChange={e => setEditModalForm({...editModalForm, subcategory: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Подкатегория"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Закуп</label>
                  <input
                    type="number"
                    value={editModalForm.cost}
                    onChange={e => setEditModalForm({...editModalForm, cost: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Продажа</label>
                  <input
                    type="number"
                    value={editModalForm.price}
                    onChange={e => setEditModalForm({...editModalForm, price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button onClick={closeEditModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Отмена
              </button>
              <button
                onClick={saveEditModal}
                disabled={editModalSaving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {editModalSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Check size={16} />
                )}
                {editModalProduct ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
