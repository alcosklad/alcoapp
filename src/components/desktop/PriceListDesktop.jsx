import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, X, Plus, Check, Trash2, Copy, Merge, Filter, SlidersHorizontal, CheckSquare, Square } from 'lucide-react';
import { getProducts, updateProduct, createProduct, deleteProduct, getStocksForProduct, mergeProducts, getStocksWithDetails } from '../../lib/pocketbase';
import { detectSubcategory, ALL_SUBCATEGORIES, CATEGORY_ORDER, SUBCATEGORIES_BY_CATEGORY } from '../../lib/subcategories';
import pb from '../../lib/pocketbase';
import { getOrFetch, invalidate } from '../../lib/cache';

export default function PriceListDesktop() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [cityStocks, setCityStocks] = useState({}); // productId -> {cost}
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // Фильтры
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');

  const activeFiltersCount = [filterCategory, filterSubcategory, filterPriceMin, filterPriceMax].filter(Boolean).length;

  // Модалка редактирования/создания
  const [showModal, setShowModal] = useState(false);
  const [modalProduct, setModalProduct] = useState(null); // null = создание
  const [modalForm, setModalForm] = useState({ name: '', category: '', subcategory: '', cost: 0, price: 0 });
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [merging, setMerging] = useState(false);
  const [modalCity, setModalCity] = useState('');

  // Мультивыбор
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  const userRole = pb.authStore.model?.role;
  const canEdit = userRole === 'admin';

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  useEffect(() => {
    loadCityStocks();
  }, [selectedSupplier]);

  const loadCityStocks = async () => {
    if (!selectedSupplier) {
      setCityStocks({});
      return;
    }
    try {
      const stocks = await getStocksWithDetails(selectedSupplier);
      const map = {};
      (stocks || []).forEach(s => {
        if (s.product) {
          map[s.product] = { cost: s.cost || 0 };
        }
      });
      setCityStocks(map);
    } catch (e) {
      console.error('Error loading city stocks:', e);
      setCityStocks({});
    }
  };

  const loadSuppliers = async () => {
    try {
      const { getSuppliers } = await import('../../lib/pocketbase');
      const data = await getOrFetch('suppliers', () => getSuppliers().catch(() => []), 300000);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getOrFetch('products:all', () => getProducts().catch(() => []), 120000, (fresh) => { setProducts(fresh || []); setLoading(false); });
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

  // Категории для select — в порядке из CATEGORY_ORDER
  const allCategories = useMemo(() => {
    const cats = new Set();
    products.forEach(p => {
      const c = Array.isArray(p?.category) ? p.category[0] : p?.category;
      if (c) cats.add(c);
    });
    const ordered = CATEGORY_ORDER.filter(c => cats.has(c));
    // Добавить категории, которых нет в CATEGORY_ORDER (на случай новых)
    cats.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
    return ordered;
  }, [products]);

  // Подкатегории для select — зависят от выбранной категории
  const allSubcategories = useMemo(() => {
    if (filterCategory && SUBCATEGORIES_BY_CATEGORY[filterCategory]) {
      return SUBCATEGORIES_BY_CATEGORY[filterCategory];
    }
    const subs = new Set(ALL_SUBCATEGORIES);
    products.forEach(p => {
      if (p?.subcategory) subs.add(p.subcategory);
    });
    return [...subs];
  }, [products, filterCategory]);

  // Поиск дублей по имени (улучшенный)
  const COMMON_WORDS = new Set(['vino', 'вино', 'красн', 'бел', 'розов', 'полусладк', 'полусух', 'сух', 'сладк', 'игрист', 'тих', 'шампанск']);
  const findDuplicates = (name, currentId) => {
    if (!name || name.length < 3) return [];
    const words = name.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !COMMON_WORDS.has(w));
    if (words.length === 0) return [];
    
    // Извлекаем объём из названия (напр. 0.75, 1.0, 0.5)
    const volMatch = name.match(/(\d+[.,]\d+)\s*л/i) || name.match(/(\d+[.,]\d+)/i);
    const volume = volMatch ? volMatch[1].replace(',', '.') : null;
    
    return products.filter(p => {
      if (p.id === currentId) return false;
      const pName = (p.name || '').toLowerCase();
      const matchCount = words.filter(w => pName.includes(w)).length;
      if (matchCount === 0) return false;
      
      // Если есть объём — проверяем совпадение объёма
      if (volume) {
        const pVolMatch = pName.match(/(\d+[.,]\d+)\s*л/i) || pName.match(/(\d+[.,]\d+)/i);
        const pVolume = pVolMatch ? pVolMatch[1].replace(',', '.') : null;
        if (pVolume && pVolume !== volume) return false;
      }
      
      // Минимум 1 значимое слово должно совпадать
      return matchCount >= 1;
    }).slice(0, 10);
  };

  // === MODAL ===
  const openEditModal = (product) => {
    setModalProduct(product);
    setModalForm({
      name: product.name || '',
      category: (Array.isArray(product.category) ? product.category[0] : product.category) || '',
      subcategory: product.subcategory || '',
      cost: product.cost || 0,
      price: product.price || 0,
    });
    setDuplicates([]);
    setShowDuplicates(false);
    setModalError('');
    setShowModal(true);
  };

  const openCreateModal = () => {
    setModalProduct(null);
    setModalForm({ name: '', category: '', subcategory: '', cost: 0, price: 0 });
    setModalCity(selectedSupplier || '');
    setDuplicates([]);
    setShowDuplicates(false);
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalProduct(null);
    setModalError('');
    setDuplicates([]);
  };

  const handleNameChange = (name) => {
    setModalForm(prev => ({ ...prev, name }));
    // Дубли только при создании нового товара
    if (!modalProduct && name.length >= 3) {
      setDuplicates(findDuplicates(name, null));
    } else {
      setDuplicates([]);
    }
  };

  const handleMerge = async (duplicateProduct) => {
    if (!modalProduct) return;
    const msg = `Объединить "${duplicateProduct.name}" в "${modalProduct.name}"?\n\nОстатки дубля перенесутся, дубль будет удалён.`;
    if (!window.confirm(msg)) return;
    try {
      setMerging(true);
      await mergeProducts(modalProduct.id, duplicateProduct.id);
      invalidate('products');
      invalidate('stocks');
      setDuplicates(prev => prev.filter(d => d.id !== duplicateProduct.id));
      loadProducts();
      alert('Товары объединены!');
    } catch (err) {
      console.error('Error merging products:', err);
      alert('Ошибка объединения: ' + (err?.message || ''));
    } finally {
      setMerging(false);
    }
  };

  const saveModal = async () => {
    if (!modalForm.name.trim()) {
      setModalError('Введите название товара');
      return;
    }
    setModalSaving(true);
    setModalError('');
    try {
      const data = {
        name: modalForm.name.trim(),
        category: modalForm.category ? [modalForm.category] : [],
        subcategory: modalForm.subcategory || detectSubcategory(modalForm.name),
        cost: Number(modalForm.cost) || 0,
        price: Number(modalForm.price) || 0,
      };
      // Авто-генерация артикула для нового товара или если артикул пустой
      if (!modalProduct || !modalProduct.article || modalProduct.article.trim() === '' || modalProduct.article === '-') {
        const maxArt = products.reduce((max, p) => {
          if (!p.article) return max;
          const m = p.article.match(/ALC-(\d+)/); 
          const num = m ? parseInt(m[1], 10) : 0;
          return num > max ? num : max;
        }, 0);
        data.article = `ALC-${String(maxArt + 1).padStart(4, '0')}`;
      }
      if (modalProduct) {
        await updateProduct(modalProduct.id, data);
      } else {
        const newProduct = await createProduct(data);
        // If city selected, create a stock record for that city
        if (modalCity && newProduct?.id) {
          try {
            await pb.collection('stocks').create({
              product: newProduct.id,
              supplier: modalCity,
              quantity: 0,
              cost: Number(modalForm.cost) || 0,
              price: Number(modalForm.price) || 0,
            });
            invalidate('stocks');
          } catch (e) {
            console.warn('Failed to create stock for city:', e);
          }
        }
      }
      invalidate('products');
      closeModal();
      loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setModalError('Ошибка сохранения: ' + (err?.message || ''));
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!modalProduct) return;
    
    setModalSaving(true);
    setModalError('');
    
    try {
      // Проверяем есть ли остатки
      const stockRecords = await getStocksForProduct(modalProduct.id);
      const hasStocks = stockRecords && stockRecords.length > 0;
      const totalQty = hasStocks ? stockRecords.reduce((s, r) => s + (r.quantity || 0), 0) : 0;

      let confirmMsg = `Удалить товар "${modalProduct.name}"?`;
      if (hasStocks && totalQty > 0) {
        confirmMsg = `⚠️ Товар "${modalProduct.name}" есть на складе (${totalQty} шт).\n\nВсе остатки будут удалены! Продолжить?`;
      }

      if (!window.confirm(confirmMsg)) {
        setModalSaving(false);
        return;
      }

      // Удаляем stock записи если есть
      if (hasStocks) {
        for (const sr of stockRecords) {
          try { 
            await pb.collection('stocks').delete(sr.id); 
          } catch (e) { 
            console.warn('Error deleting stock:', e); 
          }
        }
      }

      // Удаляем товар
      await deleteProduct(modalProduct.id);
      
      // Инвалидируем кеш
      invalidate('products');
      invalidate('stocks');
      
      // Закрываем модалку и обновляем список
      closeModal();
      await loadProducts();
      
      alert('Товар удалён');
    } catch (err) {
      console.error('Error deleting product:', err);
      setModalError('Ошибка удаления: ' + (err?.message || ''));
    } finally {
      setModalSaving(false);
    }
  };

  // Находим имя выбранного города для фильтрации по cities
  const selectedCityName = useMemo(() => {
    if (!selectedSupplier) return '';
    const sup = suppliers.find(s => s.id === selectedSupplier);
    return sup?.name || '';
  }, [selectedSupplier, suppliers]);

  const resetFilters = () => {
    setFilterCategory('');
    setFilterSubcategory('');
    setFilterPriceMin('');
    setFilterPriceMax('');
  };

  // Диапазон цен для ползунка
  const priceRange = useMemo(() => {
    let min = Infinity, max = 0;
    products.forEach(p => {
      if (p?.price > 0) {
        if (p.price < min) min = p.price;
        if (p.price > max) max = p.price;
      }
    });
    return { min: min === Infinity ? 0 : min, max: max || 10000 };
  }, [products]);

  const filteredProducts = products
    .filter(product => {
      const name = product?.name || '';
      const query = searchQuery.toLowerCase();
      const matchesSearch = name.toLowerCase().includes(query);

      if (selectedCityName) {
        const cities = product?.cities || [];
        if (cities.length > 0 && !cities.some(c => c === selectedCityName || c.includes(selectedCityName) || selectedCityName.includes(c))) {
          return false;
        }
      }

      // Фильтр по категории
      if (filterCategory) {
        const cat = Array.isArray(product?.category) ? product.category[0] : (product?.category || '');
        if (cat !== filterCategory) return false;
      }

      // Фильтр по подкатегории
      if (filterSubcategory) {
        const sub = product?.subcategory || detectSubcategory(product?.name);
        if (sub !== filterSubcategory) return false;
      }

      // Фильтр по цене
      const price = product?.price || 0;
      if (filterPriceMin && price < Number(filterPriceMin)) return false;
      if (filterPriceMax && price > Number(filterPriceMax)) return false;

      return matchesSearch;
    })
    .sort((a, b) => {
      // When user explicitly sorts by price or category — use that as primary sort
      if (sortField === 'purchasePrice' || sortField === 'price') {
        const aVal = sortField === 'purchasePrice' ? (Number(a?.cost) || 0) : (Number(a?.price) || 0);
        const bVal = sortField === 'purchasePrice' ? (Number(b?.cost) || 0) : (Number(b?.price) || 0);
        if (aVal !== bVal) return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        return (a?.name || '').localeCompare(b?.name || '');
      }

      if (sortField === 'category') {
        const catA = (Array.isArray(a?.category) ? a.category[0] : (a?.category || '')) || '';
        const catB = (Array.isArray(b?.category) ? b.category[0] : (b?.category || '')) || '';
        const cmp = sortDir === 'asc' ? catA.localeCompare(catB) : catB.localeCompare(catA);
        if (cmp !== 0) return cmp;
        return (a?.name || '').localeCompare(b?.name || '');
      }

      if (sortField === 'subcategory') {
        const subA = a.subcategory || detectSubcategory(a.name) || '';
        const subB = b.subcategory || detectSubcategory(b.name) || '';
        const cmp = sortDir === 'asc' ? subA.localeCompare(subB) : subB.localeCompare(subA);
        if (cmp !== 0) return cmp;
        return (a?.name || '').localeCompare(b?.name || '');
      }

      if (sortField === 'margin') {
        const aVal = (a.price || 0) - (a.cost || 0);
        const bVal = (b.price || 0) - (b.cost || 0);
        if (aVal !== bVal) return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
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
      return sortDir === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
    });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const toggleSelectMode = () => {
    setSelectMode(v => !v);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Удалить ${selectedIds.size} товаров? Это действие необратимо.`)) return;
    setBatchProcessing(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try {
        const stockRecords = await getStocksForProduct(id);
        if (stockRecords?.length) {
          for (const sr of stockRecords) {
            try { await pb.collection('stocks').delete(sr.id); } catch {}
          }
        }
        await deleteProduct(id);
        ok++;
      } catch { fail++; }
    }
    setBatchProcessing(false);
    setSelectedIds(new Set());
    invalidate('products');
    invalidate('stocks');
    loadProducts();
    alert(`Удалено: ${ok}${fail ? `, ошибок: ${fail}` : ''}`);
  };

  const handleBatchMerge = async () => {
    if (selectedIds.size < 2) { alert('Выберите минимум 2 товара для объединения'); return; }
    const ids = [...selectedIds];
    const main = products.find(p => p.id === ids[0]);
    const others = ids.slice(1).map(id => products.find(p => p.id === id)).filter(Boolean);
    if (!main || others.length === 0) return;
    const names = others.map(p => p.name).join(', ');
    if (!window.confirm(`Объединить ${others.length} товаров в "${main.name}"?\n\nБудут объединены: ${names}`)) return;
    setBatchProcessing(true);
    let ok = 0, fail = 0;
    for (const other of others) {
      try {
        await mergeProducts(main.id, other.id);
        ok++;
      } catch { fail++; }
    }
    setBatchProcessing(false);
    setSelectedIds(new Set());
    invalidate('products');
    invalidate('stocks');
    loadProducts();
    alert(`Объединено: ${ok}${fail ? `, ошибок: ${fail}` : ''}`);
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
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
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
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-sm transition-colors ${
            showFilters || activeFiltersCount > 0
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal size={16} />
          Фильтры
          {activeFiltersCount > 0 && (
            <span className="ml-1 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">{activeFiltersCount}</span>
          )}
        </button>

        <button onClick={loadProducts} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded" title="Обновить">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>

        {canEdit && (
          <button
            onClick={toggleSelectMode}
            className={`p-1.5 rounded transition-colors ${selectMode ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            title={selectMode ? 'Выйти из режима выбора' : 'Выбрать несколько'}
          >
            <CheckSquare size={18} />
          </button>
        )}

        {canEdit && (
          <button onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Добавить товар
          </button>
        )}

        <span className="text-sm text-gray-500 ml-auto">Найдено: {filteredProducts.length}</span>
      </div>

      {/* Панель массовых действий */}
      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Выбрано: {selectedIds.size}</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleBatchMerge}
              disabled={batchProcessing || selectedIds.size < 2}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-100 transition-colors disabled:opacity-40"
            >
              <Merge size={14} /> Объединить
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-40"
            >
              <Trash2 size={14} /> Удалить
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Снять выбор"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Панель фильтров (анимированная) */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: showFilters ? '300px' : '0px', opacity: showFilters ? 1 : 0 }}
      >
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Категория */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Категория</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Все категории</option>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Подкатегория */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Подкатегория</label>
              <select
                value={filterSubcategory}
                onChange={(e) => setFilterSubcategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Все подкатегории</option>
                {allSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Цена от */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Цена от</label>
              <input
                type="number"
                value={filterPriceMin}
                onChange={(e) => setFilterPriceMin(e.target.value)}
                placeholder={`${priceRange.min}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Цена до */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Цена до</label>
              <input
                type="number"
                value={filterPriceMax}
                onChange={(e) => setFilterPriceMax(e.target.value)}
                placeholder={`${priceRange.max}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Кнопки фильтров */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {activeFiltersCount > 0 ? `Активных фильтров: ${activeFiltersCount}` : 'Фильтры не применены'}
            </span>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Сбросить
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {selectMode && (
                  <th className="w-8 px-2 py-2 text-center">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-blue-600">
                      {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? <CheckSquare size={15} className="text-blue-600" /> : <Square size={15} />}
                    </button>
                  </th>
                )}
                <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Наименование <SortIcon field="name" /></div>
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('subcategory')}>
                  <div className="flex items-center gap-1">Подкатегория <SortIcon field="subcategory" /></div>
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Остаток</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('purchasePrice')}>
                  <div className="flex items-center justify-end gap-1">Закуп <SortIcon field="purchasePrice" /></div>
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-end gap-1">Продажа <SortIcon field="price" /></div>
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('margin')}>
                  <div className="flex items-center justify-end gap-1">Маржа <SortIcon field="margin" /></div>
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Сумма закупа</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Сумма продажи</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={selectMode ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Загрузка...</div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={selectMode ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'Ничего не найдено' : 'Нет данных'}
                  </td>
                </tr>
              ) : (
                (() => {
                let lastCategory = null;
                let lastSubcategory = null;
                return filteredProducts.map((product) => {
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
                        <tr className="bg-indigo-100 border-y border-indigo-200">
                          <td colSpan={colCount} className="px-4 py-2.5 font-bold text-indigo-900 text-sm uppercase tracking-wider sticky top-0 z-10 shadow-sm">{category}</td>
                        </tr>
                      )}
                      {showSubcategoryHeader && subcategory && (
                        <tr className="bg-indigo-50/60 border-y border-indigo-100">
                          <td colSpan={colCount} className="px-6 py-1.5 font-semibold text-indigo-700 text-xs border-l-[3px] border-indigo-400">{subcategory}</td>
                        </tr>
                      )}
                    <tr
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectMode && selectedIds.has(product.id) ? 'bg-blue-50' : ''}`}
                      onClick={() => selectMode && toggleSelect(product.id)}
                      onDoubleClick={() => !selectMode && canEdit && openEditModal(product)}
                      title={selectMode ? 'Клик для выбора' : canEdit ? 'Двойной клик для редактирования' : ''}
                    >
                      {selectMode && (
                        <td className="w-8 px-2 py-1.5 text-center">
                          {selectedIds.has(product.id) ? <CheckSquare size={15} className="text-blue-600" /> : <Square size={15} className="text-gray-300" />}
                        </td>
                      )}
                      <td className="px-3 py-1.5">{product.name || 'Без названия'}</td>
                      <td className="px-3 py-1.5 text-gray-500 text-xs">{subcategory || '—'}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-gray-700">{(totalStocks[product.id] || 0)} шт</td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        <span className="text-gray-600">
                          {(selectedSupplier && cityStocks[product.id] && cityStocks[product.id].cost > 0
                            ? cityStocks[product.id].cost
                            : (product.cost || 0)
                          ).toLocaleString('ru-RU')}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        <span className="font-medium">{(product.price || 0).toLocaleString('ru-RU')}</span>
                      </td>
                      <td className={`px-3 py-1.5 text-right font-medium ${((product.price || 0) - (product.cost || 0)) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {((product.price || 0) - (product.cost || 0)).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        {((totalStocks[product.id] || 0) * (product.cost || 0)).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        {((totalStocks[product.id] || 0) * (product.price || 0)).toLocaleString('ru-RU')}
                      </td>
                    </tr>
                    </React.Fragment>
                  );
                });
              })()
              )}
            </tbody>
            {filteredProducts.length > 0 && !loading && (
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold text-xs">
                  <td colSpan={selectMode ? 3 : 2} className="px-3 py-2 text-right text-gray-700">Итого:</td>
                  <td className="px-3 py-2 text-right text-gray-900">{totalQty} шт</td>
                  <td className="px-3 py-2 text-right text-gray-900">—</td>
                  <td className="px-3 py-2 text-right text-gray-900">—</td>
                  <td className="px-3 py-2 text-right text-gray-900">—</td>
                  <td className="px-3 py-2 text-right text-gray-600">{totalCostSum.toLocaleString('ru-RU')}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{totalSaleSum.toLocaleString('ru-RU')}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Модалка редактирования/создания товара */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalProduct ? 'Редактировать товар' : 'Новый товар'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {modalError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{modalError}</div>}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Название</label>
                  {duplicates.length > 0 && (
                    <div
                      className="relative"
                      onMouseEnter={() => setShowDuplicates(true)}
                      onMouseLeave={() => setShowDuplicates(false)}
                    >
                      <span className="flex items-center gap-1 text-xs text-amber-600 cursor-pointer">
                        <Copy size={12} />
                        {duplicates.length}
                      </span>
                      {showDuplicates && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-80 max-h-56 overflow-y-auto">
                          <div className="p-2 text-xs text-gray-500 border-b">Похожие товары:</div>
                          {duplicates.map(d => (
                            <div key={d.id} className="px-3 py-1.5 text-xs hover:bg-gray-50 border-b border-gray-50 flex items-center justify-between gap-2">
                              <div className="font-medium text-gray-700 flex-1 min-w-0 truncate">{d.name}</div>
                              {modalProduct && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMerge(d); }}
                                  disabled={merging}
                                  className="shrink-0 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                                  title="Объединить"
                                >
                                  Объединить
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <input type="text" value={modalForm.name}
                  onChange={e => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Название товара" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                  <select value={modalForm.category} onChange={e => setModalForm({...modalForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Не указана</option>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Подкатегория</label>
                  <select value={modalForm.subcategory} onChange={e => setModalForm({...modalForm, subcategory: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Авто</option>
                    {allSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {!modalProduct && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                  <select value={modalCity} onChange={e => setModalCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Все города (без привязки)</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Закуп</label>
                  <input type="number" value={modalForm.cost}
                    onChange={e => setModalForm({...modalForm, cost: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Продажа</label>
                  <input type="number" value={modalForm.price}
                    onChange={e => setModalForm({...modalForm, price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div>
                {modalProduct && (
                  <button onClick={handleDelete}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} /> Удалить
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
                <button onClick={saveModal} disabled={modalSaving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {modalSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Check size={16} />}
                  {modalProduct ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
