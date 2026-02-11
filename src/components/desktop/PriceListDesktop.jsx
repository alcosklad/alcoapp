import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, X, Plus, Check, Trash2, Copy, Merge } from 'lucide-react';
import { getProducts, updateProduct, createProduct, deleteProduct, getStocksForProduct, mergeProducts } from '../../lib/pocketbase';
import { detectSubcategory, ALL_SUBCATEGORIES } from '../../lib/subcategories';
import pb from '../../lib/pocketbase';

export default function PriceListDesktop() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // Модалка редактирования/создания
  const [showModal, setShowModal] = useState(false);
  const [modalProduct, setModalProduct] = useState(null); // null = создание
  const [modalForm, setModalForm] = useState({ name: '', category: '', subcategory: '', cost: 0, price: 0 });
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [merging, setMerging] = useState(false);

  const userRole = pb.authStore.model?.role;
  const canEdit = userRole === 'admin';

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  const loadSuppliers = async () => {
    try {
      const { getSuppliers } = await import('../../lib/pocketbase');
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

  // Категории для select
  const allCategories = useMemo(() => {
    const cats = new Set();
    products.forEach(p => {
      const c = Array.isArray(p?.category) ? p.category[0] : p?.category;
      if (c) cats.add(c);
    });
    return [...cats].sort();
  }, [products]);

  // Подкатегории для select
  const allSubcategories = useMemo(() => {
    const subs = new Set(ALL_SUBCATEGORIES);
    products.forEach(p => {
      if (p?.subcategory) subs.add(p.subcategory);
    });
    return [...subs].sort();
  }, [products]);

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
      // Авто-генерация артикула для нового товара
      if (!modalProduct) {
        const maxArt = products.reduce((max, p) => {
          const num = parseInt(p.article, 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        data.article = String(maxArt + 1).padStart(4, '0');
      }
      if (modalProduct) {
        await updateProduct(modalProduct.id, data);
      } else {
        await createProduct(data);
      }
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
    try {
      // Проверяем есть ли остатки
      const stockRecords = await getStocksForProduct(modalProduct.id);
      const hasStocks = stockRecords && stockRecords.length > 0;
      const totalQty = hasStocks ? stockRecords.reduce((s, r) => s + (r.quantity || 0), 0) : 0;

      let confirmMsg = `Удалить товар "${modalProduct.name}"?`;
      if (hasStocks && totalQty > 0) {
        confirmMsg = `⚠️ Товар "${modalProduct.name}" есть на складе (${totalQty} шт).\n\nВсе остатки будут удалены! Продолжить?`;
      }

      if (!window.confirm(confirmMsg)) return;

      // Удаляем stock записи если есть
      if (hasStocks) {
        for (const sr of stockRecords) {
          try { await pb.collection('stocks').delete(sr.id); } catch (e) { console.warn('Error deleting stock:', e); }
        }
      }

      await deleteProduct(modalProduct.id);
      closeModal();
      loadProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setModalError('Ошибка удаления: ' + (err?.message || ''));
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

      if (selectedCityName) {
        const cities = product?.cities || [];
        if (cities.length > 0 && !cities.some(c => c === selectedCityName || c.includes(selectedCityName) || selectedCityName.includes(c))) {
          return false;
        }
      }

      return matchesSearch;
    })
    .sort((a, b) => {
      const catA = (Array.isArray(a?.category) ? a.category[0] : (a?.category || '')) || '';
      const catB = (Array.isArray(b?.category) ? b.category[0] : (b?.category || '')) || '';
      if (catA !== catB) return catA.localeCompare(catB);

      const subA = (a?.subcategory || detectSubcategory(a?.name)) || '';
      const subB = (b?.subcategory || detectSubcategory(b?.name)) || '';
      if (subA !== subB) return subA.localeCompare(subB);

      let aVal, bVal;
      switch (sortField) {
        case 'name': aVal = a?.name || ''; bVal = b?.name || ''; break;
        case 'article': aVal = a?.article || ''; bVal = b?.article || ''; break;
        case 'purchasePrice': aVal = a?.cost || 0; bVal = b?.cost || 0; break;
        case 'price': aVal = a?.price || 0; bVal = b?.price || 0; break;
        default: aVal = a?.name || ''; bVal = b?.name || '';
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

        <button onClick={loadProducts} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded" title="Обновить">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>

        {canEdit && (
          <button onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Добавить товар
          </button>
        )}

        <span className="text-sm text-gray-500 ml-auto">Найдено: {filteredProducts.length}</span>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-2 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 w-[70px] max-w-[70px]" onClick={() => handleSort('article')}>
                  <div className="flex items-center gap-1">Арт. <SortIcon field="article" /></div>
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Наименование <SortIcon field="name" /></div>
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">Категория <SortIcon field="category" /></div>
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('purchasePrice')}>
                  <div className="flex items-center justify-end gap-1">Закуп <SortIcon field="purchasePrice" /></div>
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-end gap-1">Продажа <SortIcon field="price" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Загрузка...</div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
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
                        <tr className="bg-blue-50 border-y border-blue-200">
                          <td colSpan={5} className="px-3 py-1.5 font-semibold text-blue-800 text-xs sticky top-0">{category}</td>
                        </tr>
                      )}
                      {showSubcategoryHeader && subcategory && (
                        <tr className="bg-gray-50 border-y border-gray-200">
                          <td colSpan={5} className="px-6 py-1 font-medium text-gray-600 text-xs">{subcategory}</td>
                        </tr>
                      )}
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onDoubleClick={() => canEdit && openEditModal(product)}
                      title={canEdit ? 'Двойной клик для редактирования' : ''}
                    >
                      <td className="px-2 py-1.5 font-mono text-xs text-gray-500 w-[70px] max-w-[70px] truncate">{product.article || '—'}</td>
                      <td className="px-3 py-1.5">{product.name || 'Без названия'}</td>
                      <td className="px-3 py-1.5 text-gray-600">{category || '—'}</td>
                      <td className="px-3 py-1.5 text-right">
                        <span className="text-gray-600">{(product.cost || 0).toLocaleString('ru-RU')}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-medium">{(product.price || 0).toLocaleString('ru-RU')}</span>
                      </td>
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
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
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
