import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Minus, Trash2, Search, Star, ChevronLeft, ChevronRight, PlusCircle, Check } from 'lucide-react';
import { getFavorites, addToFavorites, removeFromFavorites, createProduct } from '../../lib/pocketbase';
import { CATEGORY_ORDER, ALL_SUBCATEGORIES, detectSubcategory } from '../../lib/subcategories';
import { invalidate } from '../../lib/cache';

const ITEMS_PER_PAGE = 15;

export default function CreateReceptionModal({ 
  isOpen, 
  onClose, 
  suppliers, 
  stores, 
  products,
  onSave,
  initialFormData = null
}) {
  const defaultStores = [
    { id: 'lenta', name: 'Лента' },
    { id: 'magnit', name: 'Магнит' },
    { id: 'am', name: 'АМ' },
    { id: 'kant', name: 'Кант/Бутыль' },
    { id: 'metro', name: 'Метро' },
    { id: 'pyaterochka', name: 'Пятёрочка' },
    { id: 'kb', name: 'КБ' },
    { id: 'bristol', name: 'Бристоль' },
    { id: 'perekrestok', name: 'Перекрёсток' }
  ];

  const storesList = stores && stores.length > 0 ? stores : defaultStores;

  const [formData, setFormData] = useState({
    supplier: '',
    selectedStores: [],
    items: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Избранное');
  const [favorites, setFavorites] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Создание нового товара
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', category: '', subcategory: '', cost: 0, price: 0 });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form on every open or set from initial
      if (initialFormData) {
        setFormData(initialFormData);
      } else {
        setFormData({ supplier: '', selectedStores: [], items: [] });
      }
      setSearchQuery('');
      setActiveCategory('Избранное');
      setCurrentPage(1);
      setErrors({});
      setSubmitting(false);
      setShowCreateProduct(false);
      loadFavorites();
    }
  }, [isOpen, initialFormData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);


  const loadFavorites = async () => {
    try {
      const data = await getFavorites();
      setFavorites(data || []);
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  };

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.product)), [favorites]);

  // Категории из товаров — в порядке CATEGORY_ORDER
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach(p => {
      const c = Array.isArray(p?.category) ? p.category[0] : p?.category;
      if (c) cats.add(c);
    });
    const ordered = CATEGORY_ORDER.filter(c => cats.has(c));
    cats.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
    return ['Избранное', ...ordered];
  }, [products]);

  // Товары текущей категории (при поиске — ищем по ВСЕМ категориям)
  const categoryProducts = useMemo(() => {
    let list;
    if (searchQuery) {
      // Search across ALL products
      const q = searchQuery.toLowerCase();
      list = products.filter(p => (p.name || '').toLowerCase().includes(q));
    } else if (activeCategory === 'Избранное') {
      list = products.filter(p => favoriteIds.has(p.id));
    } else {
      list = products.filter(p => {
        const c = Array.isArray(p?.category) ? p.category[0] : p?.category;
        return c === activeCategory;
      });
    }
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [products, activeCategory, favoriteIds, searchQuery]);

  // Пагинация
  const totalPages = Math.ceil(categoryProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = categoryProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleToggleFavorite = async (productId) => {
    try {
      if (favoriteIds.has(productId)) {
        const fav = favorites.find(f => f.product === productId);
        if (fav) await removeFromFavorites(fav.id);
      } else {
        await addToFavorites(productId);
      }
      await loadFavorites();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const getItemQuantity = (productId) => {
    const item = formData.items.find(i => i.product === productId);
    return item ? item.quantity : 0;
  };

  const handleQuantityDelta = (product, delta) => {
    setFormData(prev => {
      const existing = prev.items.find(i => i.product === product.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return { ...prev, items: prev.items.filter(i => i.product !== product.id) };
        }
        return {
          ...prev,
          items: prev.items.map(i =>
            i.product === product.id ? { ...i, quantity: newQty } : i
          )
        };
      } else if (delta > 0) {
        return {
          ...prev,
          items: [...prev.items, {
            product: product.id,
            name: product.name,
            article: product.article,
            quantity: 1,
            cost: product.cost || 0
          }]
        };
      }
      return prev;
    });
  };

  const handleSetQuantity = (productId, value) => {
    const qty = parseInt(value) || 0;
    setFormData(prev => {
      if (qty <= 0) {
        return { ...prev, items: prev.items.filter(i => i.product !== productId) };
      }
      const existing = prev.items.find(i => i.product === productId);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i =>
            i.product === productId ? { ...i, quantity: qty } : i
          )
        };
      }
      const product = products.find(p => p.id === productId);
      if (!product) return prev;
      return {
        ...prev,
        items: [...prev.items, {
          product: product.id,
          name: product.name,
          article: product.article,
          quantity: qty,
          cost: product.cost || 0
        }]
      };
    });
  };

  const handleCartCostChange = (productId, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.product === productId ? { ...i, cost: parseFloat(value) || 0 } : i
      )
    }));
  };

  const handleCartQuantityChange = (productId, delta) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(i => {
        if (i.product === productId) {
          const newQty = Math.max(1, i.quantity + delta);
          return { ...i, quantity: newQty };
        }
        return i;
      })
    }));
  };

  const handleRemoveItem = (productId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.product !== productId)
    }));
  };

  const handleAddStore = (storeId) => {
    if (!formData.selectedStores.includes(storeId)) {
      setFormData(prev => ({
        ...prev,
        selectedStores: [...prev.selectedStores, storeId]
      }));
    }
  };

  const handleRemoveStore = (storeId) => {
    setFormData(prev => ({
      ...prev,
      selectedStores: prev.selectedStores.filter(id => id !== storeId)
    }));
  };

  const handleCreateProduct = async () => {
    if (!createForm.name.trim()) { setCreateError('Введите название'); return; }
    if (!createForm.category) { setCreateError('Выберите категорию'); return; }
    setCreateSaving(true);
    setCreateError('');
    try {
      const sub = createForm.subcategory || detectSubcategory(createForm.name);
      const cityName = suppliers.find(s => s.id === formData.supplier)?.name || '';
      const newProduct = await createProduct({
        name: createForm.name.trim(),
        category: [createForm.category],
        subcategory: sub,
        cost: Number(createForm.cost) || 0,
        price: Number(createForm.price) || 0,
        cities: cityName ? [cityName] : [],
      });
      invalidate('products');
      // Добавляем в корзину приёмки
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          product: newProduct.id,
          name: newProduct.name,
          article: newProduct.article || '',
          quantity: 1,
          cost: Number(createForm.cost) || 0,
        }]
      }));
      setShowCreateProduct(false);
      setCreateForm({ name: '', category: '', subcategory: '', cost: 0, price: 0 });
    } catch (err) {
      console.error('Error creating product:', err);
      setCreateError('Ошибка: ' + (err?.message || ''));
    } finally {
      setCreateSaving(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.supplier) newErrors.supplier = 'Выберите город';
    if (formData.selectedStores.length === 0) newErrors.stores = 'Выберите хотя бы один магазин';
    if (formData.items.length === 0) newErrors.items = 'Добавьте хотя бы один товар';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const totalAmount = formData.items.reduce((s, i) => s + (i.cost * i.quantity), 0);
      await onSave({
        supplier: formData.supplier,
        stores: formData.selectedStores,
        items: formData.items.map(i => ({
          product: i.product,
          name: i.name,
          article: i.article,
          quantity: i.quantity,
          cost: i.cost
        })),
        total_amount: totalAmount
      });
    } catch (err) {
      console.error('Error submitting reception:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = formData.items.reduce((s, i) => s + (i.cost * i.quantity), 0);
  const totalItems = formData.items.reduce((s, i) => s + i.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[95vh] overflow-hidden flex flex-col">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Создать новую приёмку</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Город + Магазины */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Город <span className="text-red-500">*</span></label>
            <select
              value={formData.supplier}
              onChange={e => setFormData({ ...formData, supplier: e.target.value })}
              className={`px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.supplier ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Выберите город</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Магазины <span className="text-red-500">*</span></label>
            <select
              onChange={e => { if (e.target.value) { handleAddStore(e.target.value); e.target.value = ''; } }}
              className={`px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.stores ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Выберите магазин</option>
              {storesList.filter(st => !formData.selectedStores.includes(st.id)).map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
            {formData.selectedStores.map(storeId => {
              const st = storesList.find(s => s.id === storeId);
              return (
                <span key={storeId} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                  {st?.name || storeId}
                  <button onClick={() => handleRemoveStore(storeId)} className="hover:bg-blue-200 rounded"><X size={10} /></button>
                </span>
              );
            })}
          </div>
          <div className="relative ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                const conf = window.confirm('Очистить текущую корзину и загрузить популярные товары для этого города?');
                if (conf) {
                  // Here we could load a template or top items
                  // For now, let's just add top 5 favorites
                  const favItems = products
                    .filter(p => favoriteIds.has(p.id))
                    .slice(0, 5)
                    .map(p => ({
                      product: p.id,
                      name: p.name,
                      article: p.article || '',
                      quantity: 1,
                      cost: p.cost || 0
                    }));
                  
                  if (favItems.length > 0) {
                    setFormData(prev => ({
                      ...prev,
                      items: favItems
                    }));
                    alert(`Добавлено ${favItems.length} товаров из избранного`);
                  } else {
                    alert('Нет товаров в избранном');
                  }
                }
              }}
              className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs transition-colors"
              title="Шаблон: Топ из избранного"
            >
              <Star size={13} /> Шаблон
            </button>
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск товара..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-7 pr-2 py-1 border border-gray-300 rounded text-xs w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => { setShowCreateProduct(v => !v); setCreateError(''); }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${showCreateProduct ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              <PlusCircle size={13} /> Создать
            </button>
          </div>
        </div>

        {/* Форма создания нового товара */}
        {showCreateProduct && (
          <div className="px-4 py-2 border-b border-green-200 bg-green-50/50">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text" placeholder="Название товара *"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                className="flex-1 min-w-[200px] px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <select
                value={createForm.category}
                onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="">Категория *</option>
                {CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={createForm.subcategory}
                onChange={e => setCreateForm(f => ({ ...f, subcategory: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="">Подкат. (авто)</option>
                {ALL_SUBCATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="number" placeholder="Закуп"
                value={createForm.cost || ''}
                onChange={e => setCreateForm(f => ({ ...f, cost: e.target.value }))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <input
                type="number" placeholder="Продажа"
                value={createForm.price || ''}
                onChange={e => setCreateForm(f => ({ ...f, price: e.target.value }))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button
                onClick={handleCreateProduct}
                disabled={createSaving}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
              >
                {createSaving ? '...' : 'Создать и добавить'}
              </button>
              <button onClick={() => setShowCreateProduct(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            {createError && <p className="text-xs text-red-500 mt-1">{createError}</p>}
          </div>
        )}

        {/* Основная область: категории + таблица */}
        <div className="flex-1 flex overflow-hidden">
          {/* Сайдбар категорий */}
          <div className="w-40 border-r border-gray-200 overflow-y-auto bg-white shrink-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-3 py-2 text-xs border-b border-gray-100 transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-l-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat === 'Избранное' && <Star size={11} className="inline mr-1 text-blue-500" fill="currentColor" />}{cat}
              </button>
            ))}
          </div>

          {/* Таблица товаров */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="w-8 px-2 py-2"></th>
                    <th className="text-left px-2 py-2 font-medium text-gray-600">Наименование</th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600 w-28">Количество</th>
                    <th className="text-right px-2 py-2 font-medium text-gray-600 w-28">Цена закупа</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">
                        {activeCategory === 'Избранное' ? 'Нет избранных товаров' : 'Нет товаров в категории'}
                      </td>
                    </tr>
                  ) : paginatedProducts.map(product => {
                    const qty = getItemQuantity(product.id);
                    const isFav = favoriteIds.has(product.id);
                    const isSelected = qty > 0;
                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${
                          isSelected
                            ? 'bg-blue-100/80 shadow-[inset_3px_0_0_0_rgba(37,99,235,0.9)]'
                            : ''
                        }`}
                      >
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => handleToggleFavorite(product.id)}
                            className={`p-0.5 rounded ${isFav ? 'text-blue-500' : 'text-gray-300 hover:text-blue-400'}`}
                            title={isFav ? 'Убрать из избранного' : 'В избранное'}
                          >
                            <Star size={13} fill={isFav ? 'currentColor' : 'none'} />
                          </button>
                        </td>
                        <td className={`px-2 py-1.5 ${isSelected ? 'text-blue-900 font-semibold' : 'text-gray-900'}`}>{product.name}</td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleQuantityDelta(product, -1)}
                              className="text-blue-600 hover:bg-blue-100 rounded px-1"
                              disabled={qty === 0}
                            >
                              —
                            </button>
                            <input
                              type="number"
                              value={qty || ''}
                              onChange={e => handleSetQuantity(product.id, e.target.value)}
                              placeholder="0"
                              className="w-12 text-center border border-gray-300 rounded py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              min="0"
                            />
                            <button
                              onClick={() => handleQuantityDelta(product, 1)}
                              className="text-blue-600 hover:bg-blue-100 rounded px-1"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-500">
                          {(product.cost || 0).toLocaleString('ru-RU')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-1.5 border-t border-gray-200 bg-gray-50 text-xs">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-gray-600">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Корзина - выбранные товары */}
        {formData.items.length > 0 && (
          <div className="border-t-2 border-blue-200 bg-blue-50/30 max-h-[30vh] overflow-y-auto">
            <div className="px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-100/60 border-b border-blue-200 sticky top-0">
              Выбрано: {formData.items.length} поз. / {totalItems} шт. / Итого: {totalAmount.toLocaleString('ru-RU')} ₽
            </div>
            <table className="w-full text-xs">
              <thead className="bg-blue-50/50 sticky top-7">
                <tr className="border-b border-blue-100">
                  <th className="text-left px-3 py-1.5 font-medium text-gray-600">Товар</th>
                  <th className="text-center px-2 py-1.5 font-medium text-gray-600 w-28">Кол-во</th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600 w-28">Цена закупа</th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-600 w-24">Сумма</th>
                  <th className="w-8 px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map(item => (
                  <tr
                    key={item.product}
                    className="border-b border-blue-100/50 hover:bg-blue-50/50"
                  >
                    <td className="px-3 py-1 text-gray-900">{item.name}</td>
                    <td className="px-2 py-1">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleCartQuantityChange(item.product, -1)} className="text-blue-600 hover:bg-blue-100 rounded px-1">—</button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button onClick={() => handleCartQuantityChange(item.product, 1)} className="text-blue-600 hover:bg-blue-100 rounded px-1">+</button>
                      </div>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        value={item.cost}
                        onChange={e => handleCartCostChange(item.product, e.target.value)}
                        className="w-20 px-1.5 py-0.5 border border-gray-300 rounded text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="0"
                      />
                    </td>
                    <td className="px-2 py-1 text-right font-medium text-gray-900">{(item.cost * item.quantity).toLocaleString('ru-RU')}</td>
                    <td className="px-2 py-1">
                      <button onClick={() => handleRemoveItem(item.product)} className="p-0.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ошибки */}
        {(errors.supplier || errors.stores || errors.items) && (
          <div className="px-4 py-1 bg-red-50 text-red-600 text-xs">
            {errors.supplier || errors.stores || errors.items}
          </div>
        )}

        {/* Футер */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {formData.items.length > 0 && (
              <span>Итого: <strong className="text-gray-900">{totalAmount.toLocaleString('ru-RU')} ₽</strong></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">Отмена</button>
            <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
              {submitting && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>}
              {submitting ? 'Создание...' : 'Создать приёмку'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
