import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronRight, RefreshCw, Plus, Eye, X, Trash2, Minus, PlusCircle } from 'lucide-react';
import { getReceptions, getSuppliers, getProducts, createReception, updateReception, deleteReception, createProduct } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';
import { getOrFetch, invalidate } from '../../lib/cache';
import { formatLocalDate } from '../../lib/dateUtils';
import CreateReceptionModal from './CreateReceptionModal';
import { detectSubcategory, CATEGORY_ORDER } from '../../lib/subcategories';

export default function ReceptionDesktop() {
  const [receptions, setReceptions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedReception, setSelectedReception] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedStores, setExpandedStores] = useState({});
  const [showAddItemPanel, setShowAddItemPanel] = useState(false);
  const [addItemQuery, setAddItemQuery] = useState('');
  const [selectedAddProductId, setSelectedAddProductId] = useState('');
  const [addItemQuantity, setAddItemQuantity] = useState(1);
  const [addItemCost, setAddItemCost] = useState('');
  const [showCreateProductPanel, setShowCreateProductPanel] = useState(false);
  const [createProductForm, setCreateProductForm] = useState({ name: '', category: '', cost: 0, price: 0 });
  const [createProductSaving, setCreateProductSaving] = useState(false);
  const [createProductError, setCreateProductError] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  const userRole = pb.authStore.model?.role;
  const isAdmin = userRole === 'admin';

  // Статичный список магазинов
  const storesList = [
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

  useEffect(() => {
    loadSuppliers();
    loadProducts();
    loadReceptions();
  }, []);

  useEffect(() => {
    const now = new Date();
    let from = new Date();
    const toLocal = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    switch (filterPeriod) {
      case 'today': from.setHours(0,0,0,0); break;
      case 'week': from.setDate(now.getDate() - 7); break;
      case 'month': from.setMonth(now.getMonth() - 1); break;
      case 'all': setFilterDateFrom(''); setFilterDateTo(''); return;
      case 'custom': return;
      default: setFilterDateFrom(''); setFilterDateTo(''); return;
    }
    setFilterDateFrom(toLocal(from));
    setFilterDateTo(toLocal(now));
  }, [filterPeriod]);

  useEffect(() => {
    loadReceptions();
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      const data = await getOrFetch('suppliers', () => getSuppliers().catch(() => []), 300000);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getOrFetch('products:all', () => getProducts().catch(() => []), 120000);
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadReceptions = async () => {
    try {
      setLoading(true);
      const data = await getOrFetch('receptions:all', () => getReceptions().catch(() => []), 60000, (fresh) => {
        const filtered = selectedSupplier ? fresh.filter(r => r.supplier === selectedSupplier) : fresh;
        setReceptions(filtered || []);
        setLoading(false);
      });
      
      // Фильтруем по выбранному городу
      const filtered = selectedSupplier 
        ? data.filter(r => r.supplier === selectedSupplier)
        : data;
      
      setReceptions(filtered || []);
    } catch (error) {
      console.error('Error loading receptions:', error);
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

  const handleCreateReception = async (receptionData) => {
    try {
      setLoading(true);
      await createReception(receptionData);
      invalidate('receptions');
      invalidate('stocks');
      invalidate('dashboard');
      setShowCreateModal(false);
      await loadReceptions();
      alert('Приёмка успешно создана! Остатки обновлены.');
    } catch (error) {
      console.error('Error creating reception:', error);
      alert('Ошибка при создании приёмки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReception = async (receptionId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту приёмку?')) {
      return;
    }
    const shouldDeleteStock = window.confirm(
      'Удалить остатки с города вместе с приёмкой?\n\n' +
      'OK — удалить приёмку и остатки товаров\n' +
      'Отмена — удалить только приёмку, остатки не трогать'
    );

    try {
      setLoading(true);
      await deleteReception(receptionId, { deleteStock: shouldDeleteStock });
      invalidate('receptions');
      invalidate('stocks');
      invalidate('dashboard');
      setSelectedReception(null);
      await loadReceptions();
      alert(shouldDeleteStock ? 'Приёмка и остатки удалены' : 'Приёмка удалена (остатки сохранены)');
    } catch (error) {
      console.error('Error deleting reception:', error);
      alert('Ошибка при удалении приёмки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const normalizeReceptionItems = (items = []) => {
    return items.map((item) => {
      const productId = typeof item.product === 'object' ? item.product?.id : item.product;
      const product = products.find((p) => p.id === productId);
      return {
        ...item,
        product: productId,
        name: item.name || product?.name || 'Товар',
        quantity: Number(item.quantity) || 1,
        cost: Number(item.cost ?? item.purchase_price ?? product?.cost ?? 0) || 0,
      };
    });
  };

  const handleOpenReception = (reception) => {
    setSelectedReception(reception);
    setEditedItems(normalizeReceptionItems(JSON.parse(JSON.stringify(reception.items || []))));
    setHasChanges(false);
    setShowAddItemPanel(false);
    setAddItemQuery('');
    setSelectedAddProductId('');
    setAddItemQuantity(1);
    setAddItemCost('');
    setShowCreateProductPanel(false);
    setCreateProductError('');
  };

  const handleCloseDetails = () => {
    setSelectedReception(null);
    setEditedItems([]);
    setHasChanges(false);
    setShowAddItemPanel(false);
    setShowCreateProductPanel(false);
    setCreateProductError('');
  };

  const handleQuantityChange = (itemIndex, delta) => {
    const newItems = [...editedItems];
    newItems[itemIndex].quantity = Math.max(1, newItems[itemIndex].quantity + delta);
    setEditedItems(newItems);
    setHasChanges(true);
  };

  const handleRemoveItem = (itemIndex) => {
    const newItems = editedItems.filter((_, idx) => idx !== itemIndex);
    setEditedItems(newItems);
    setHasChanges(true);
  };

  const handleCostChange = (itemIndex, value) => {
    const newItems = [...editedItems];
    newItems[itemIndex].cost = Number(value) || 0;
    setEditedItems(newItems);
    setHasChanges(true);
  };

  const filteredAddProducts = useMemo(() => {
    const q = addItemQuery.trim().toLowerCase();
    const usedIds = new Set(editedItems.map((i) => (typeof i.product === 'object' ? i.product?.id : i.product)));
    const available = products.filter((p) => !usedIds.has(p.id));
    if (!q) return available.slice(0, 40);
    return available
      .filter((p) => (p.name || '').toLowerCase().includes(q))
      .slice(0, 40);
  }, [products, editedItems, addItemQuery]);

  const handleAddItemToReception = () => {
    const product = products.find((p) => p.id === selectedAddProductId);
    if (!product) {
      alert('Выберите товар из списка');
      return;
    }
    const qty = Math.max(1, Number(addItemQuantity) || 1);
    const cost = Number(addItemCost === '' ? (product.cost || 0) : addItemCost) || 0;
    setEditedItems((prev) => [
      ...prev,
      {
        product: product.id,
        name: product.name,
        quantity: qty,
        cost,
      },
    ]);
    setHasChanges(true);
    setSelectedAddProductId('');
    setAddItemQuantity(1);
    setAddItemCost('');
    setAddItemQuery('');
  };

  const handleCreateProductFromReception = async () => {
    if (!createProductForm.name.trim()) {
      setCreateProductError('Введите название товара');
      return;
    }
    if (!createProductForm.category) {
      setCreateProductError('Выберите категорию');
      return;
    }
    try {
      setCreateProductSaving(true);
      setCreateProductError('');
      const newProduct = await createProduct({
        name: createProductForm.name.trim(),
        category: [createProductForm.category],
        subcategory: detectSubcategory(createProductForm.name),
        cost: Number(createProductForm.cost) || 0,
        price: Number(createProductForm.price) || 0,
      });

      setProducts((prev) => [newProduct, ...prev]);
      invalidate('products');

      setEditedItems((prev) => [
        ...prev,
        {
          product: newProduct.id,
          name: newProduct.name,
          quantity: 1,
          cost: Number(createProductForm.cost) || 0,
        },
      ]);
      setHasChanges(true);

      setCreateProductForm({ name: '', category: '', cost: 0, price: 0 });
      setShowCreateProductPanel(false);
    } catch (error) {
      setCreateProductError('Ошибка создания товара: ' + (error?.message || ''));
    } finally {
      setCreateProductSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      if (editedItems.length === 0) {
        alert('Добавьте хотя бы один товар в приёмку');
        return;
      }
      setLoading(true);
      const totalAmount = editedItems.reduce((sum, item) => 
        sum + (item.cost * item.quantity), 0
      );

      await updateReception(selectedReception.id, {
        items: editedItems,
        total_amount: totalAmount
      });

      invalidate('receptions');
      invalidate('stocks');
      invalidate('dashboard');
      setSelectedReception(null);
      setEditedItems([]);
      setHasChanges(false);
      await loadReceptions();
      alert('Приёмка обновлена! Остатки пересчитаны.');
    } catch (error) {
      console.error('Error updating reception:', error);
      alert('Ошибка при обновлении приёмки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredReceptions = receptions
    .filter(reception => {
      const supplierName = reception?.expand?.supplier?.name || '';
      const query = searchQuery.toLowerCase();
      if (query) {
        const matchSupplier = supplierName.toLowerCase().includes(query);
        const matchBatch = (reception.batch_number || '').toLowerCase().includes(query);
        if (!matchSupplier && !matchBatch) return false;
      }
      // Date filter
      if (filterDateFrom) {
        const [y, m, d] = filterDateFrom.split('-');
        const from = new Date(y, m - 1, d, 0, 0, 0, 0);
        const recDate = new Date((reception.created||'').replace(' ','T'));
        if (recDate < from) return false;
      }
      if (filterDateTo) {
        const [y, m, d] = filterDateTo.split('-');
        const to = new Date(y, m - 1, d, 23, 59, 59, 999);
        const recDate = new Date((reception.created||'').replace(' ','T'));
        if (recDate > to) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'created':
          aVal = new Date((a.created||'').replace(' ','T'));
          bVal = new Date((b.created||'').replace(' ','T'));
          break;
        case 'supplier':
          aVal = a?.expand?.supplier?.name || '';
          bVal = b?.expand?.supplier?.name || '';
          break;
        case 'total':
          aVal = a.total_amount || 0;
          bVal = b.total_amount || 0;
          break;
        default:
          aVal = '';
          bVal = '';
      }

      if (aVal instanceof Date) {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
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

        <div className="flex items-center gap-1">
          {[
            { key: 'today', label: 'Сегодня' },
            { key: 'week', label: 'Неделя' },
            { key: 'month', label: 'Месяц' },
            { key: 'all', label: 'Всё время' },
            { key: 'custom', label: 'Период' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterPeriod(key)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filterPeriod === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filterPeriod === 'custom' && (
          <div className="flex items-center gap-1">
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs" />
            <span className="text-xs text-gray-400">—</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs" />
          </div>
        )}

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по городу или партии..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={loadReceptions}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          title="Обновить"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            <Plus size={14} />
            Создать приёмку
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto">
          Найдено: {filteredReceptions.length}
        </span>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th 
                  className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created')}
                >
                  <div className="flex items-center gap-1">
                    Дата <SortIcon field="created" />
                  </div>
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">
                  Партия
                </th>
                <th 
                  className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('supplier')}
                >
                  <div className="flex items-center gap-1">
                    Город <SortIcon field="supplier" />
                  </div>
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">
                  Магазины
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">
                  Товаров
                </th>
                <th 
                  className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Сумма закупа <SortIcon field="total" />
                  </div>
                </th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Загрузка...
                    </div>
                  </td>
                </tr>
              ) : filteredReceptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    {searchQuery ? 'Ничего не найдено' : 'Нет приёмок'}
                  </td>
                </tr>
              ) : (
                filteredReceptions.map((reception) => {
                  const itemsCount = reception.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                  const totalAmount = reception.total_amount || 0;
                  
                  return (
                    <tr 
                      key={reception.id} 
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-1.5 text-gray-600">
                        {formatLocalDate(reception.created, 'd MMMM yyyy, HH:mm')}
                      </td>
                      <td className="px-3 py-1.5 font-medium text-gray-700">
                        {reception.batch_number || '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        {reception?.expand?.supplier?.name || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">
                        {reception.stores && reception.stores.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {(() => {
                              const isExpanded = expandedStores[reception.id];
                              const storesToShow = isExpanded ? reception.stores : [reception.stores[0]];
                              return (
                                <>
                                  {storesToShow.map(storeId => {
                                    const store = storesList.find(s => s.id === storeId);
                                    return (
                                      <span key={storeId} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                                        {store?.name || storeId}
                                      </span>
                                    );
                                  })}
                                  {reception.stores.length > 1 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setExpandedStores(prev => ({...prev, [reception.id]: !prev[reception.id]})); }}
                                      className="p-0.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-transform"
                                      title={isExpanded ? 'Свернуть' : `Ещё ${reception.stores.length - 1}`}
                                    >
                                      <ChevronRight size={12} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">
                        {itemsCount} шт
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        {totalAmount.toLocaleString('ru-RU')}                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => handleOpenReception(reception)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs"
                        >
                          <Eye size={14} />
                          Детали
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно создания приёмки */}
      <CreateReceptionModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setInitialFormData(null);
        }}
        suppliers={suppliers}
        stores={storesList}
        products={products}
        onSave={handleCreateReception}
        initialFormData={initialFormData}
      />

      {/* Модалка с деталями приёмки */}
      {selectedReception && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Приёмка {selectedReception.batch_number ? `№ ${selectedReception.batch_number}` : ''} от {formatLocalDate(selectedReception.created, 'd MMMM yyyy')}
                </h3>
                <p className="text-sm text-gray-500">
                  Город: {selectedReception?.expand?.supplier?.name || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      const newFormData = {
                        supplier: selectedReception.supplier,
                        selectedStores: selectedReception.stores || [],
                        items: editedItems.map(item => ({
                          product: item.product,
                          name: item.name,
                          article: item.article || '',
                          quantity: item.quantity,
                          cost: item.cost
                        }))
                      };
                      handleCloseDetails();
                      // We need to pass this to CreateReceptionModal somehow, 
                      // let's add a state for it
                      setInitialFormData(newFormData);
                      setShowCreateModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-purple-600 hover:bg-purple-50 rounded text-xs"
                    title="Копировать приёмку"
                  >
                    Копировать
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setShowAddItemPanel((v) => !v)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${showAddItemPanel ? 'bg-blue-100 text-blue-700' : 'text-blue-600 hover:bg-blue-50'}`}
                    title="Добавить товар"
                  >
                    <Plus size={14} /> Товар
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setShowCreateProductPanel((v) => !v)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${showCreateProductPanel ? 'bg-green-100 text-green-700' : 'text-green-600 hover:bg-green-50'}`}
                    title="Создать новый товар"
                  >
                    <PlusCircle size={14} /> Создать
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteReception(selectedReception.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Удалить приёмку"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={handleCloseDetails} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Контент */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Магазины */}
              {selectedReception.stores && selectedReception.stores.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Магазины:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedReception.stores.map(storeId => {
                      const store = storesList.find(s => s.id === storeId);
                      return (
                        <span key={storeId} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {store?.name || storeId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Общая информация */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
                <div>
                  <p className="text-xs text-gray-500">Товаров</p>
                  <p className="text-base font-semibold">{editedItems.reduce((sum, item) => sum + (item.quantity || 0), 0)} шт</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Сумма закупа</p>
                  <p className="text-base font-semibold">
                    {editedItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0).toLocaleString('ru-RU')}                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Сумма продажи</p>
                  <p className="text-base font-semibold text-green-600">
                    {editedItems.reduce((sum, item) => {
                      const product = products.find(p => p.id === item.product);
                      return sum + ((product?.price || 0) * item.quantity);
                    }, 0).toLocaleString('ru-RU')}                  </p>
                </div>
              </div>

              {/* Панель добавления товара */}
              {isAdmin && showAddItemPanel && (
                <div className="p-4 border border-blue-200 bg-blue-50/40 rounded-lg space-y-3">
                  <h4 className="text-sm font-medium text-gray-800">Добавить товар в приёмку</h4>
                  <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={addItemQuery}
                      onChange={(e) => setAddItemQuery(e.target.value)}
                      placeholder="Поиск товара по названию..."
                      className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-gray-200 rounded bg-white">
                    {filteredAddProducts.length === 0 ? (
                      <p className="text-xs text-gray-400 py-3 text-center">Нет доступных товаров</p>
                    ) : filteredAddProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedAddProductId(p.id);
                          setAddItemCost(String(p.cost || 0));
                        }}
                        className={`w-full text-left px-3 py-2 text-xs border-b border-gray-100 hover:bg-gray-50 ${selectedAddProductId === p.id ? 'bg-blue-100' : ''}`}
                      >
                        <span className="font-medium text-gray-900">{p.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Кол-во</label>
                      <input
                        type="number"
                        min="1"
                        value={addItemQuantity}
                        onChange={(e) => setAddItemQuantity(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Закуп</label>
                      <input
                        type="number"
                        min="0"
                        value={addItemCost}
                        onChange={(e) => setAddItemCost(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <button
                      onClick={handleAddItemToReception}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              )}

              {/* Панель создания товара */}
              {isAdmin && showCreateProductPanel && (
                <div className="p-4 border border-green-200 bg-green-50/40 rounded-lg space-y-3">
                  <h4 className="text-sm font-medium text-gray-800">Создать новый товар</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={createProductForm.name}
                      onChange={(e) => setCreateProductForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Название *"
                      className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                    <select
                      value={createProductForm.category}
                      onChange={(e) => setCreateProductForm((f) => ({ ...f, category: e.target.value }))}
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                    >
                      <option value="">Категория *</option>
                      {CATEGORY_ORDER.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={createProductForm.cost}
                      onChange={(e) => setCreateProductForm((f) => ({ ...f, cost: e.target.value }))}
                      placeholder="Закуп"
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                    <input
                      type="number"
                      value={createProductForm.price}
                      onChange={(e) => setCreateProductForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="Продажа"
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                    />
                    <button
                      onClick={handleCreateProductFromReception}
                      disabled={createProductSaving}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {createProductSaving ? 'Создание...' : 'Создать и добавить'}
                    </button>
                  </div>
                  {createProductError && <p className="text-xs text-red-600">{createProductError}</p>}
                </div>
              )}

              {/* Список товаров */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Товары в приёмке:</h4>
                {editedItems && editedItems.length > 0 ? (
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Товар</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-600">Количество</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Цена за шт</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Сумма</th>
                          {isAdmin && <th className="w-10 px-3 py-2"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {editedItems.map((item, idx) => {
                          const cost = item.cost || 0;
                          const quantity = item.quantity || 0;
                          const total = cost * quantity;
                          
                          return (
                            <tr key={idx} className="border-t border-gray-100">
                              <td className="px-3 py-2">{item.name || 'Товар'}</td>
                              <td className="px-3 py-2">
                                {isAdmin ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleQuantityChange(idx, -1)}
                                      className="p-0.5 hover:bg-gray-100 rounded"
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <span className="w-8 text-center">{quantity}</span>
                                    <button
                                      onClick={() => handleQuantityChange(idx, 1)}
                                      className="p-0.5 hover:bg-gray-100 rounded"
                                    >
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center">{quantity} шт</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {isAdmin ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={cost}
                                    onChange={(e) => handleCostChange(idx, e.target.value)}
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                                  />
                                ) : (
                                  cost.toLocaleString('ru-RU')
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">{total.toLocaleString('ru-RU')}</td>
                              {isAdmin && (
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => handleRemoveItem(idx)}
                                    className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                                    title="Удалить товар"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Нет товаров</p>
                )}
              </div>
            </div>

            {/* Футер с кнопкой сохранения */}
            {isAdmin && hasChanges && (
              <div className="flex items-center justify-end p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={handleSaveChanges}
                  className="px-6 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                >
                  Сохранить изменения
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
