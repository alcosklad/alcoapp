import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, MapPin, X, Plus, Edit2, Check } from 'lucide-react';
import { getStocksAggregated, getSuppliers, getProducts, updateProduct, createProduct } from '../../lib/pocketbase';
import { detectSubcategory } from '../../lib/subcategories';
import pb from '../../lib/pocketbase';

export default function StockDesktop() {
  const [stocks, setStocks] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [cityModal, setCityModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalProduct, setEditModalProduct] = useState(null);
  const [editModalForm, setEditModalForm] = useState({ name: '', article: '', category: '', subcategory: '', cost: 0, price: 0 });
  const [editModalSaving, setEditModalSaving] = useState(false);
  const [editModalError, setEditModalError] = useState('');

  const userRole = pb.authStore.model?.role;
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadSuppliers();
    loadStocks();
  }, []);

  useEffect(() => {
    loadStocks();
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers().catch(() => []);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadStocks = async () => {
    try {
      setLoading(true);
      const data = await getStocksAggregated(selectedSupplier || null).catch(() => []);
      setStocks(data || []);
    } catch (error) {
      console.error('Error loading stocks:', error);
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

  // Хелпер для получения данных продукта
  const getProduct = (stock) => stock?.expand?.product || stock?.product || {};

  // Категории для select в модалке
  const allCategories = useMemo(() => {
    const cats = new Set();
    stocks.forEach(s => {
      const p = getProduct(s);
      const c = Array.isArray(p?.category) ? p.category[0] : p?.category;
      if (c) cats.add(c);
    });
    return [...cats].sort();
  }, [stocks]);

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
      loadStocks();
    } catch (err) {
      console.error('Error saving product:', err);
      setEditModalError('Ошибка сохранения: ' + (err?.message || ''));
    } finally {
      setEditModalSaving(false);
    }
  };

  // Получаем уникальные категории (category — массив в PocketBase)
  const categories = [...new Set(stocks.map(stock => {
    const cat = stock?.expand?.product?.category || stock?.product?.category || '';
    return Array.isArray(cat) ? cat[0] : cat;
  }).filter(Boolean))].sort();

  // Фильтрация и сортировка данных
  const filteredStocks = useMemo(() => {
    return stocks
      .filter(stock => {
        const product = getProduct(stock);
        const name = product.name || '';
        const article = product.article || '';
        const category = Array.isArray(product.category) ? product.category[0] : (product.category || '');
        const query = searchQuery.toLowerCase();
        
        const matchesSearch = name.toLowerCase().includes(query) || article.toLowerCase().includes(query);
        const matchesCategory = !selectedCategory || category === selectedCategory;
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const pA = getProduct(a);
        const pB = getProduct(b);

        // Первичная сортировка — по категории всегда (для группировки)
        const catA = (Array.isArray(pA?.category) ? pA.category[0] : (pA?.category || '')) || '';
        const catB = (Array.isArray(pB?.category) ? pB.category[0] : (pB?.category || '')) || '';
        if (catA !== catB) return catA.localeCompare(catB);

        // Внутри категории — сортировка по подкатегории
        const subA = (pA?.subcategory || detectSubcategory(pA?.name)) || '';
        const subB = (pB?.subcategory || detectSubcategory(pB?.name)) || '';
        if (subA !== subB) return subA.localeCompare(subB);

        // Внутри подкатегории — по выбранному полю
        let aVal, bVal;
        switch (sortField) {
          case 'name':
            aVal = pA.name || '';
            bVal = pB.name || '';
            break;
          case 'article':
            aVal = pA.article || '';
            bVal = pB.article || '';
            break;
          case 'quantity':
            aVal = a?.quantity || 0;
            bVal = b?.quantity || 0;
            break;
          case 'purchasePrice':
            aVal = pA.cost || 0;
            bVal = pB.cost || 0;
            break;
          case 'price':
            aVal = pA.price || 0;
            bVal = pB.price || 0;
            break;
          case 'volume':
            aVal = pA.volume || '';
            bVal = pB.volume || '';
            break;
          case 'margin':
            aVal = (pA.price || 0) - (pA.cost || 0);
            bVal = (pB.price || 0) - (pB.cost || 0);
            break;
          case 'stockValue':
            aVal = (a?.quantity || 0) * (pA.price || 0);
            bVal = (b?.quantity || 0) * (pB.price || 0);
            break;
          default:
            aVal = pA.name || '';
            bVal = pB.name || '';
        }

        if (typeof aVal === 'string') {
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      });
  }, [stocks, searchQuery, selectedCategory, sortField, sortDir]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // Итоги
  const totalQuantity = filteredStocks.reduce((sum, s) => sum + (s?.quantity || 0), 0);
  const totalCostValue = filteredStocks.reduce((sum, s) => {
    const product = getProduct(s);
    return sum + ((product.cost || 0) * (s?.quantity || 0));
  }, 0);
  const totalSaleValue = filteredStocks.reduce((sum, s) => {
    const product = getProduct(s);
    return sum + ((product.price || 0) * (s?.quantity || 0));
  }, 0);
  const totalMargin = totalSaleValue - totalCostValue;

  // Кол-во колонок зависит от роли
  const colCount = isAdmin ? 10 : 7;

  return (
    <div className="space-y-4">
      {/* Панель фильтров */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Город:</label>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все города</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Категория:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={loadStocks}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          title="Обновить"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Добавить товар
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto">
          Найдено: {filteredStocks.length}
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
                <th className="text-left px-2 py-2 font-medium text-gray-600">
                  Подкатегория
                </th>
                <th 
                  className="text-left px-2 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('volume')}
                >
                  <div className="flex items-center gap-1">
                    Объём <SortIcon field="volume" />
                  </div>
                </th>
                <th 
                  className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Остаток <SortIcon field="quantity" />
                  </div>
                </th>
                {isAdmin && (
                  <th 
                    className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('purchasePrice')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Закуп <SortIcon field="purchasePrice" />
                    </div>
                  </th>
                )}
                <th 
                  className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Продажа <SortIcon field="price" />
                  </div>
                </th>
                {isAdmin && (
                  <th 
                    className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('margin')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Маржа <SortIcon field="margin" />
                    </div>
                  </th>
                )}
                {isAdmin && (
                  <th 
                    className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('stockValue')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Сумма <SortIcon field="stockValue" />
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-6 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Загрузка...
                    </div>
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-6 text-center text-gray-500">
                    {searchQuery || selectedCategory ? 'Ничего не найдено' : 'Нет данных'}
                  </td>
                </tr>
              ) : (
                <>
                  {(() => {
                    let lastCategory = null;
                    let lastSubcategory = null;
                    return filteredStocks.map((stock) => {
                      const product = getProduct(stock);
                      const quantity = stock?.quantity || 0;
                      const cost = product.cost || 0;
                      const price = product.price || 0;
                      const margin = price - cost;
                      const stockValue = quantity * price;
                      const category = Array.isArray(product.category) ? product.category[0] : (product.category || '');
                      const subcategory = product.subcategory || detectSubcategory(product.name);
                      const isGlobal = !selectedSupplier;
                      const hasCityBreakdown = isGlobal && stock._cityBreakdown && stock._cityBreakdown.length >= 1;

                      const showCategoryHeader = category !== lastCategory;
                      const showSubcategoryHeader = subcategory && (showCategoryHeader || subcategory !== lastSubcategory);
                      if (showCategoryHeader) lastSubcategory = null;
                      lastCategory = category;
                      lastSubcategory = subcategory;

                      return (
                        <React.Fragment key={stock.id}>
                          {showCategoryHeader && category && (
                            <tr className="bg-blue-50 border-y border-blue-200">
                              <td colSpan={colCount} className="px-3 py-1.5 font-semibold text-blue-800 text-xs sticky top-0">
                                {category}
                              </td>
                            </tr>
                          )}
                          {showSubcategoryHeader && subcategory && (
                            <tr className="bg-gray-50 border-y border-gray-200">
                              <td colSpan={colCount} className="px-6 py-1 font-medium text-gray-600 text-xs">
                                {subcategory}
                              </td>
                            </tr>
                          )}
                          <tr 
                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onDoubleClick={() => isAdmin && openEditModal(product)}
                          >
                            <td className="px-2 py-1.5 font-mono text-xs text-gray-500 w-[70px] max-w-[70px] truncate">
                              {product.article || '—'}
                            </td>
                            <td className="px-3 py-1.5">
                              {product.name || 'Без названия'}
                            </td>
                            <td className="px-2 py-1.5 text-gray-500 text-xs">
                              {subcategory || '—'}
                            </td>
                            <td className="px-2 py-1.5 text-gray-600">
                              {product.volume || '—'}
                            </td>
                            <td className={`px-3 py-1.5 text-right font-medium ${quantity < 3 ? 'text-red-600' : ''}`}>
                              <span className="inline-flex items-center gap-1">
                                {quantity} шт
                                {hasCityBreakdown && (
                                  <button
                                    onClick={() => setCityModal({ product, breakdown: stock._cityBreakdown, totalQty: quantity })}
                                    className="text-blue-400 hover:text-blue-600"
                                    title="Наличие в городах"
                                  >
                                    <MapPin size={12} />
                                  </button>
                                )}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="px-3 py-1.5 text-right text-gray-600">
                                {cost.toLocaleString('ru-RU')}
                              </td>
                            )}
                            <td className="px-3 py-1.5 text-right font-medium">
                              {price.toLocaleString('ru-RU')}
                            </td>
                            {isAdmin && (
                              <td className={`px-3 py-1.5 text-right font-medium ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {margin.toLocaleString('ru-RU')}
                              </td>
                            )}
                            {isAdmin && (
                              <td className="px-3 py-1.5 text-right font-medium">
                                {stockValue.toLocaleString('ru-RU')}
                              </td>
                            )}
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()}
                  {/* Строка итогов */}
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold text-xs">
                    <td colSpan={4} className="px-3 py-2 text-right text-gray-700">Итого:</td>
                    <td className="px-3 py-2 text-right text-gray-900">{totalQuantity} шт</td>
                    {isAdmin && (
                      <td className="px-3 py-2 text-right text-gray-600">{totalCostValue.toLocaleString('ru-RU')}</td>
                    )}
                    <td className="px-3 py-2 text-right text-gray-900">{totalSaleValue.toLocaleString('ru-RU')}</td>
                    {isAdmin && (
                      <td className={`px-3 py-2 text-right ${totalMargin > 0 ? 'text-green-700' : 'text-red-700'}`}>{totalMargin.toLocaleString('ru-RU')}</td>
                    )}
                    {isAdmin && (
                      <td className="px-3 py-2 text-right text-gray-900">{totalSaleValue.toLocaleString('ru-RU')}</td>
                    )}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка: разбивка по городам */}
      {cityModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCityModal(null)}>
          <div className="bg-white rounded-xl max-w-md w-full mx-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{cityModal.product?.name || 'Товар'}</h3>
                <p className="text-xs text-gray-500">Всего: {cityModal.totalQty} шт</p>
              </div>
              <button onClick={() => setCityModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {cityModal.breakdown
                .sort((a, b) => b.quantity - a.quantity)
                .map((city, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-800">{city.supplierName}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{city.quantity} шт</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
