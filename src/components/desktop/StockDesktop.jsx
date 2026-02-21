import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, MapPin, X, Plus, Trash2, Check, Calendar, Clock, FileX, RotateCcw, CheckSquare, Square, Merge, Pencil } from 'lucide-react';
import { getStocksAggregated, getSuppliers, getProducts, updateProduct, createStockRecord, deleteStockRecord, updateStockRecord, getReceptionHistoryForProduct, getWriteOffs, createWriteOff, cancelWriteOff, updateWriteOff, deleteProduct } from '../../lib/pocketbase';
import { detectSubcategory, ALL_SUBCATEGORIES, CATEGORY_ORDER } from '../../lib/subcategories';
import pb from '../../lib/pocketbase';
import { getOrFetch, invalidate } from '../../lib/cache';

export default function StockDesktop({ onNavigate }) {
  const [stocks, setStocks] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(() => {
    try {
      const saved = localStorage.getItem('ns_selected_supplier');
      if (saved) {
        localStorage.removeItem('ns_selected_supplier');
        return saved;
      }
    } catch (e) {}
    return '';
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [cityModal, setCityModal] = useState(null);

  // Модалка редактирования (двойной клик)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStock, setEditStock] = useState(null); // stock row (aggregated)
  const [editProduct, setEditProduct] = useState(null); // product data
  const [editForm, setEditForm] = useState({ name: '', category: '', subcategory: '', cost: 0, price: 0 });
  const [editCities, setEditCities] = useState([]); // [{stockId, supplierId, supplierName, quantity}]
  const [editSaving, setEditSaving] = useState(false);
  const [deleteProductSaving, setDeleteProductSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [receptionHistory, setReceptionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [writeOffHistory, setWriteOffHistory] = useState([]);
  const [writeOffHistoryLoading, setWriteOffHistoryLoading] = useState(false);

  // Модалка создания остатка
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ productId: '', supplierId: '', quantity: 1 });
  const [createSearch, setCreateSearch] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Табы: Остатки / Списание
  const [activeTab, setActiveTab] = useState('stocks');
  const [writeOffs, setWriteOffs] = useState([]);
  const [writeOffsLoading, setWriteOffsLoading] = useState(false);
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [writeOffForm, setWriteOffForm] = useState({ quantity: 1, reason: '', supplierId: '' });
  const [writeOffSaving, setWriteOffSaving] = useState(false);
  const [editingWriteOff, setEditingWriteOff] = useState(null);
  const [writeOffEditForm, setWriteOffEditForm] = useState({ quantity: 1, reason: '' });
  const [writeOffEditSaving, setWriteOffEditSaving] = useState(false);

  // Мультивыбор
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  const userRole = pb.authStore.model?.role;
  const isAdmin = userRole === 'admin';
  const isOperator = userRole === 'operator';

  useEffect(() => {
    loadSuppliers();
    loadStocks();
    loadAllProducts();
  }, []);

  useEffect(() => {
    loadStocks();
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      const data = await getOrFetch('suppliers', () => getSuppliers().catch(() => []), 300000);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleDeleteProductAndStocks = async () => {
    const productId = editProduct?.id;
    if (!productId) return;

    if (!window.confirm(`Удалить товар "${editProduct?.name || 'Товар'}" и все его остатки?`)) return;

    setDeleteProductSaving(true);
    setEditError('');
    try {
      const allStockRows = await pb.collection('stocks').getFullList({
        filter: `product = "${productId}"`,
      }).catch(() => []);

      for (const row of allStockRows) {
        await deleteStockRecord(row.id).catch(() => {});
      }

      await deleteProduct(productId);

      closeEditModal();
      invalidate('stocks');
      invalidate('products');
      invalidate('dashboard');
      loadStocks();
      loadAllProducts();
    } catch (err) {
      console.error('Error deleting product and stocks:', err);
      setEditError('Ошибка удаления товара: ' + (err?.message || ''));
    } finally {
      setDeleteProductSaving(false);
    }
  };

  const loadStocks = async () => {
    try {
      setLoading(true);
      const cacheKey = 'stocks:agg:' + (selectedSupplier || 'all');
      const data = await getOrFetch(cacheKey, () => getStocksAggregated(selectedSupplier || null).catch(() => []), 60000, (fresh) => { setStocks(fresh || []); setLoading(false); });
      setStocks(data || []);
    } catch (error) {
      console.error('Error loading stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWriteOffs = async () => {
    try {
      setWriteOffsLoading(true);
      const data = await getOrFetch('writeoffs:all', () => getWriteOffs(), 60000, (fresh) => setWriteOffs(fresh || []));
      setWriteOffs(data || []);
    } catch (error) {
      console.error('Error loading write-offs:', error);
    } finally {
      setWriteOffsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'writeoffs') loadWriteOffs();
  }, [activeTab]);

  const handleWriteOff = async () => {
    if (!editStock || !editProduct) return;
    try {
      setWriteOffSaving(true);
      const preferredCity = [...editCities]
        .filter((c) => (Number(c.quantity) || 0) > 0)
        .sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0))[0];
      const supplierId = writeOffForm.supplierId || selectedSupplier || preferredCity?.supplierId || '';
      const selectedCity = editCities.find((c) => c.supplierId === supplierId);

      if (selectedCity && (Number(selectedCity.quantity) || 0) <= 0) {
        throw new Error(`В городе "${selectedCity.supplierName || '—'}" нет остатка для списания`);
      }

      await createWriteOff({
        product: editProduct.id,
        supplier: supplierId,
        quantity: writeOffForm.quantity,
        reason: writeOffForm.reason,
        cost_per_unit: editForm.cost || 0,
        product_name: editProduct.name,
        city: selectedCity?.supplierName || suppliers.find(s => s.id === supplierId)?.name || ''
      });
      invalidate('stocks');
      invalidate('writeoffs');
      invalidate('dashboard');
      setShowWriteOffModal(false);
      setShowEditModal(false);
      setWriteOffForm({ quantity: 1, reason: '', supplierId: '' });
      loadStocks();
      if (activeTab === 'writeoffs') loadWriteOffs();
      alert('Товар списан');
    } catch (err) {
      alert('Ошибка списания: ' + (err.message || ''));
    } finally {
      setWriteOffSaving(false);
    }
  };

  const handleCancelWriteOff = async (writeOff) => {
    if (!window.confirm(`Отменить списание "${writeOff.product_name || 'товар'}" (${writeOff.quantity} шт)?`)) return;
    try {
      await cancelWriteOff(writeOff.id);
      invalidate('writeoffs');
      invalidate('stocks');
      invalidate('dashboard');
      loadWriteOffs();
      loadStocks();
    } catch (err) {
      alert('Ошибка отмены: ' + (err.message || ''));
    }
  };

  const handleOpenWriteOffEdit = (writeOff) => {
    setEditingWriteOff(writeOff);
    setWriteOffEditForm({
      quantity: Number(writeOff.quantity) || 1,
      reason: writeOff.reason || '',
    });
  };

  const handleSaveWriteOffEdit = async () => {
    if (!editingWriteOff) return;
    try {
      setWriteOffEditSaving(true);
      await updateWriteOff(editingWriteOff.id, {
        quantity: writeOffEditForm.quantity,
        reason: writeOffEditForm.reason,
      });
      setEditingWriteOff(null);
      invalidate('writeoffs');
      invalidate('stocks');
      invalidate('dashboard');
      loadWriteOffs();
      loadStocks();
    } catch (err) {
      alert('Ошибка редактирования списания: ' + (err.message || ''));
    } finally {
      setWriteOffEditSaving(false);
    }
  };

  const loadAllProducts = async () => {
    try {
      const data = await getOrFetch('products:all', () => getProducts().catch(() => []), 120000);
      setAllProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
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
  const getProduct = (stock) => {
    const expanded = stock?.expand?.product;
    if (expanded && typeof expanded === 'object') return expanded;

    if (stock?.product && typeof stock.product === 'object') return stock.product;

    if (typeof stock?.product === 'string') {
      return allProducts.find((p) => p.id === stock.product) || { id: stock.product };
    }

    return {};
  };

  // Категории для фильтра
  const allCategories = useMemo(() => {
    const cats = new Set();
    stocks.forEach(s => {
      const p = getProduct(s);
      const c = Array.isArray(p?.category) ? p.category[0] : p?.category;
      if (c) cats.add(c);
    });
    return [...cats].sort();
  }, [stocks]);

  // Подкатегории для select
  const allSubcategories = useMemo(() => {
    const subs = new Set(ALL_SUBCATEGORIES);
    stocks.forEach(s => {
      const p = getProduct(s);
      if (p?.subcategory) subs.add(p.subcategory);
    });
    return [...subs].sort();
  }, [stocks]);

  // === EDIT MODAL (двойной клик) ===
  const openEditModal = async (stock) => {
    const product = getProduct(stock);
    setEditStock(stock);
    setEditProduct(product);
    // Use stock-level cost if available (updated by receptions), fallback to product cost
    const stockCost = stock.cost || product.cost || 0;
    setEditForm({
      name: product.name || '',
      category: (Array.isArray(product.category) ? product.category[0] : product.category) || '',
      subcategory: product.subcategory || '',
      cost: stockCost,
      price: product.price || 0,
    });
    // Города: если агрегировано — из _cityBreakdown, если нет — одна запись
    if (stock._cityBreakdown && stock._cityBreakdown.length > 0) {
      setEditCities(stock._cityBreakdown.map(c => ({
        stockId: null,
        supplierId: c.supplierId,
        supplierName: c.supplierName,
        quantity: Number(c.quantity) || 0,
      })));
    } else {
      setEditCities([{
        stockId: stock.id,
        supplierId: stock.supplier,
        supplierName: stock.expand?.supplier?.name || '—',
        quantity: stock.quantity || 0,
      }]);
    }
    setEditError('');
    setReceptionHistory([]);
    setWriteOffHistory([]);
    setShowEditModal(true);
    // Загружаем историю приёмок
    if (product?.id) {
      setHistoryLoading(true);
      try {
        const history = await getReceptionHistoryForProduct(product.id, selectedSupplier || null);
        setReceptionHistory(history);
      } catch (e) {
        console.error('Error loading history:', e);
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditStock(null);
    setEditProduct(null);
    setEditError('');
  };

  const saveEditModal = async () => {
    if (!editForm.name.trim()) {
      setEditError('Введите название товара');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      // Сохраняем данные продукта
      const productId = editProduct?.id;
      if (productId) {
        await updateProduct(productId, {
          name: editForm.name.trim(),
          category: editForm.category ? [editForm.category] : [],
          subcategory: editForm.subcategory || detectSubcategory(editForm.name),
          cost: Number(editForm.cost) || 0,
          price: Number(editForm.price) || 0,
        });

        // Также обновляем цену закупа во всех остатках этого товара, чтобы она применилась везде
        const allCityRecords = await pb.collection('stocks').getFullList({
          filter: `product = "${productId}"`
        }).catch(() => []);
        
        for (const record of allCityRecords) {
          if (record.cost_per_unit !== Number(editForm.cost)) {
            await updateStockRecord(record.id, {
              cost_per_unit: Number(editForm.cost)
            }).catch(() => {});
          }
        }
      }
      closeEditModal();
      invalidate('stocks');
      loadStocks();
      loadAllProducts();
    } catch (err) {
      console.error('Error saving:', err);
      setEditError('Ошибка сохранения: ' + (err?.message || ''));
    } finally {
      setEditSaving(false);
    }
  };

  const getCityStockRecords = async (productId, supplierId) => {
    if (!productId || !supplierId) return [];
    return await pb.collection('stocks').getFullList({
      filter: `product = "${productId}" && supplier = "${supplierId}"`,
      sort: '+reception_date,+created'
    }).catch(() => []);
  };

  const handleDeleteCity = async (cityEntry) => {
    // Найти stock record по product + supplier и удалить
    const productId = editProduct?.id;
    if (!productId) return;
    if (!window.confirm(`Удалить остаток в "${cityEntry.supplierName}"?`)) return;
    try {
      const rows = await getCityStockRecords(productId, cityEntry.supplierId);
      for (const row of rows) {
        await deleteStockRecord(row.id).catch(() => {});
      }

      const nextCities = editCities.filter(c => c.supplierId !== cityEntry.supplierId);
      setEditCities(nextCities);
      if (nextCities.length === 0) {
        closeEditModal();
      }

      invalidate('stocks');
      loadStocks();
    } catch (err) {
      console.error('Error deleting stock:', err);
      setEditError('Ошибка удаления: ' + (err?.message || ''));
    }
  };

  const handleUpdateCityQty = async (cityEntry, newQty) => {
    const productId = editProduct?.id;
    if (!productId) return;

    const targetQty = Math.max(0, Number(newQty) || 0);

    try {
      const rows = await getCityStockRecords(productId, cityEntry.supplierId);

      if (targetQty <= 0) {
        for (const row of rows) {
          await deleteStockRecord(row.id).catch(() => {});
        }
        const nextCities = editCities.filter(c => c.supplierId !== cityEntry.supplierId);
        setEditCities(nextCities);
        if (nextCities.length === 0) {
          closeEditModal();
        }
      } else if (rows.length === 0) {
        await createStockRecord({
          product: productId,
          supplier: cityEntry.supplierId,
          quantity: targetQty,
        });
        setEditCities(prev => prev.map(c =>
          c.supplierId === cityEntry.supplierId ? { ...c, quantity: targetQty } : c
        ));
      } else {
        // Нормализуем в одну запись на город, чтобы +/- и удаление работали стабильно
        const [head, ...tail] = rows;
        await updateStockRecord(head.id, { quantity: targetQty });
        for (const row of tail) {
          await deleteStockRecord(row.id).catch(() => {});
        }
        setEditCities(prev => prev.map(c =>
          c.supplierId === cityEntry.supplierId ? { ...c, quantity: targetQty } : c
        ));
      }

      invalidate('stocks');
      loadStocks();
    } catch (err) {
      console.error('Error updating stock qty:', err);
      setEditError('Ошибка обновления количества: ' + (err?.message || ''));
    }
  };

  const handleAdjustCityQty = async (cityEntry, delta) => {
    const baseQty = Number(cityEntry.quantity) || 0;
    await handleUpdateCityQty(cityEntry, Math.max(0, baseQty + delta));
  };

  const handleAddCity = async (supplierId) => {
    const productId = editProduct?.id;
    if (!productId || !supplierId) return;
    // Проверяем что такого города ещё нет
    if (editCities.some(c => c.supplierId === supplierId)) {
      setEditError('Этот город уже добавлен');
      return;
    }
    try {
      await createStockRecord({
        product: productId,
        supplier: supplierId,
        quantity: 1,
      });
      const sup = suppliers.find(s => s.id === supplierId);
      setEditCities(prev => [...prev, {
        stockId: null,
        supplierId,
        supplierName: sup?.name || '—',
        quantity: 1,
      }]);
      loadStocks();
    } catch (err) {
      console.error('Error adding city:', err);
      setEditError('Ошибка добавления: ' + (err?.message || ''));
    }
  };

  // === CREATE MODAL ===
  const openCreateModal = () => {
    setCreateForm({ productId: '', supplierId: '', quantity: 1 });
    setCreateSearch('');
    setCreateError('');
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError('');
  };

  const filteredCreateProducts = useMemo(() => {
    if (!createSearch.trim()) return allProducts.slice(0, 50);
    const q = createSearch.toLowerCase();
    return allProducts.filter(p => (p.name || '').toLowerCase().includes(q)).slice(0, 50);
  }, [allProducts, createSearch]);

  const saveCreateModal = async () => {
    if (!createForm.productId) {
      setCreateError('Выберите товар');
      return;
    }
    if (!createForm.supplierId) {
      setCreateError('Выберите город');
      return;
    }
    if (!createForm.quantity || createForm.quantity <= 0) {
      setCreateError('Укажите количество');
      return;
    }
    setCreateSaving(true);
    setCreateError('');
    try {
      await createStockRecord({
        product: createForm.productId,
        supplier: createForm.supplierId,
        quantity: Number(createForm.quantity),
      });
      closeCreateModal();
      loadStocks();
    } catch (err) {
      console.error('Error creating stock:', err);
      setCreateError('Ошибка создания: ' + (err?.message || ''));
    } finally {
      setCreateSaving(false);
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
        const category = Array.isArray(product.category) ? product.category[0] : (product.category || '');
        const query = searchQuery.toLowerCase();
        
        const matchesSearch = name.toLowerCase().includes(query);
        const matchesCategory = !selectedCategory || category === selectedCategory;
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const pA = getProduct(a);
        const pB = getProduct(b);

        const catA = (Array.isArray(pA?.category) ? pA.category[0] : (pA?.category || '')) || '';
        const catB = (Array.isArray(pB?.category) ? pB.category[0] : (pB?.category || '')) || '';
        if (catA !== catB) return catA.localeCompare(catB);

        const subA = (pA?.subcategory || detectSubcategory(pA?.name)) || '';
        const subB = (pB?.subcategory || detectSubcategory(pB?.name)) || '';
        if (subA !== subB) return subA.localeCompare(subB);

        let aVal, bVal;
        switch (sortField) {
          case 'name':
            aVal = pA.name || '';
            bVal = pB.name || '';
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
    if (selectedIds.size === paginatedStocks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedStocks.map(s => s.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Удалить остатки для ${selectedIds.size} товаров?`)) return;
    setBatchProcessing(true);
    let ok = 0, fail = 0;
    for (const stockId of selectedIds) {
      const stock = stocks.find(s => s.id === stockId);
      if (!stock) continue;
      try {
        if (stock._stockRecordIds?.length) {
          for (const rid of stock._stockRecordIds) {
            try { await deleteStockRecord(rid); } catch {}
          }
        } else {
          await deleteStockRecord(stockId);
        }
        ok++;
      } catch { fail++; }
    }
    setBatchProcessing(false);
    setSelectedIds(new Set());
    invalidate('stocks');
    loadStocks();
    alert(`Удалено: ${ok}${fail ? `, ошибок: ${fail}` : ''}`);
  };

  const handleBatchWriteOff = async () => {
    if (selectedIds.size === 0) return;
    const reason = window.prompt(`Причина списания для ${selectedIds.size} товаров:`);
    if (reason === null) return;
    setBatchProcessing(true);
    let ok = 0, fail = 0;
    const supplierId = selectedSupplier || '';
    const cityName = suppliers.find(s => s.id === supplierId)?.name || '';
    for (const stockId of selectedIds) {
      const stock = stocks.find(s => s.id === stockId);
      if (!stock) continue;
      const product = getProduct(stock);
      try {
        // Если выбран конкретный город — списываем как раньше одной записью.
        // Если "Все города" и строка агрегированная — списываем по каждому городу отдельно,
        // иначе можно попытаться списать общий объём в одном городе и получить ошибку.
        if (supplierId || !Array.isArray(stock._cityBreakdown) || stock._cityBreakdown.length === 0) {
          await createWriteOff({
            product: product.id,
            supplier: supplierId || (stock._cityBreakdown?.[0]?.supplierId) || '',
            quantity: stock.quantity || 1,
            reason: reason || '',
            cost_per_unit: stock.cost || product.cost || 0,
            product_name: product.name,
            city: cityName || (stock._cityBreakdown?.[0]?.supplierName) || ''
          });
        } else {
          for (const cityPart of stock._cityBreakdown) {
            const qty = Number(cityPart.quantity) || 0;
            if (qty <= 0) continue;
            await createWriteOff({
              product: product.id,
              supplier: cityPart.supplierId || '',
              quantity: qty,
              reason: reason || '',
              cost_per_unit: stock.cost || product.cost || 0,
              product_name: product.name,
              city: cityPart.supplierName || ''
            });
          }
        }
        ok++;
      } catch { fail++; }
    }
    setBatchProcessing(false);
    setSelectedIds(new Set());
    invalidate('stocks');
    invalidate('writeoffs');
    loadStocks();
    if (activeTab === 'writeoffs') loadWriteOffs();
    alert(`Списано: ${ok}${fail ? `, ошибок: ${fail}` : ''}`);
  };

  const handleBatchMerge = async () => {
    if (selectedIds.size < 2) { alert('Выберите минимум 2 товара для объединения'); return; }
    const ids = [...selectedIds];
    const mainStock = stocks.find(s => s.id === ids[0]);
    const mainProduct = getProduct(mainStock);
    const others = ids.slice(1).map(id => {
      const s = stocks.find(st => st.id === id);
      return s ? getProduct(s) : null;
    }).filter(Boolean);
    if (!mainProduct || others.length === 0) return;
    const { mergeProducts } = await import('../../lib/pocketbase');
    const names = others.map(p => p.name).join(', ');
    if (!window.confirm(`Объединить ${others.length} товаров в "${mainProduct.name}"?\n\nБудут объединены: ${names}`)) return;
    setBatchProcessing(true);
    let ok = 0, fail = 0;
    for (const other of others) {
      try {
        await mergeProducts(mainProduct.id, other.id);
        ok++;
      } catch { fail++; }
    }
    setBatchProcessing(false);
    setSelectedIds(new Set());
    invalidate('products');
    invalidate('stocks');
    loadStocks();
    loadAllProducts();
    alert(`Объединено: ${ok}${fail ? `, ошибок: ${fail}` : ''}`);
  };

  // Пагинация
  const totalPages = Math.ceil(filteredStocks.length / ITEMS_PER_PAGE);
  const paginatedStocks = filteredStocks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Сбрасываем страницу при изменении фильтров
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCategory, selectedSupplier]);

  // Итоги (по всем, не только по текущей странице)
  const totalQuantity = filteredStocks.reduce((sum, s) => sum + (s?.quantity || 0), 0);
  const totalCostValue = filteredStocks.reduce((sum, s) => {
    const product = getProduct(s);
    const cost = (selectedSupplier && s.cost) ? s.cost : (product.cost || 0);
    return sum + (cost * (s?.quantity || 0));
  }, 0);
  const totalSaleValue = filteredStocks.reduce((sum, s) => {
    const product = getProduct(s);
    return sum + ((product.price || 0) * (s?.quantity || 0));
  }, 0);
  const totalMargin = totalSaleValue - totalCostValue;

  const colCount = (isAdmin ? 9 : 6) + (selectMode ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Табы */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('stocks')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stocks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Остатки
        </button>
        {!isOperator && (
          <button
            onClick={() => setActiveTab('writeoffs')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'writeoffs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <FileX size={14} />
            Списание
          </button>
        )}
      </div>

      {activeTab === 'stocks' ? (
      <>
      {/* Панель фильтров */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Город:</label>
          <select
            value={selectedSupplier}
            onChange={(e) => { invalidate('stocks'); setSelectedSupplier(e.target.value); }}
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
            onClick={toggleSelectMode}
            className={`p-1 rounded transition-colors ${selectMode ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            title={selectMode ? 'Выйти из режима выбора' : 'Выбрать несколько'}
          >
            <CheckSquare size={16} />
          </button>
        )}

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Добавить на склад
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto">
          Найдено: {filteredStocks.length}
        </span>
      </div>

      {/* Панель массовых действий */}
      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-xs font-medium text-blue-800">Выбрано: {selectedIds.size}</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleBatchWriteOff}
              disabled={batchProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-orange-300 text-orange-700 rounded hover:bg-orange-50 transition-colors disabled:opacity-40"
            >
              <FileX size={14} /> Списать
            </button>
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
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Таблица */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {selectMode && (
                  <th className="w-8 px-2 py-2 text-center">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-blue-600">
                      {selectedIds.size === paginatedStocks.length && paginatedStocks.length > 0 ? <CheckSquare size={15} className="text-blue-600" /> : <Square size={15} />}
                    </button>
                  </th>
                )}
                <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Наименование <SortIcon field="name" /></div>
                </th>
                <th className="text-left px-2 py-2 font-medium text-gray-600">Подкатегория</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center justify-end gap-1">Остаток <SortIcon field="quantity" /></div>
                </th>
                {isAdmin && (
                  <th className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('purchasePrice')}>
                    <div className="flex items-center justify-end gap-1">Закуп <SortIcon field="purchasePrice" /></div>
                  </th>
                )}
                <th className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-end gap-1">Продажа <SortIcon field="price" /></div>
                </th>
                {isAdmin && (
                  <th className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('margin')}>
                    <div className="flex items-center justify-end gap-1">Маржа <SortIcon field="margin" /></div>
                  </th>
                )}
                {isAdmin && (
                  <th className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('stockValue')}>
                    <div className="flex items-center justify-end gap-1">Сумма <SortIcon field="stockValue" /></div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-6 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" /> Загрузка...
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
                    return paginatedStocks.map((stock) => {
                      const product = getProduct(stock);
                      const quantity = stock?.quantity || 0;
                      const cost = (selectedSupplier && stock.cost) ? stock.cost : (product.cost || 0);
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
                              <td colSpan={colCount} className="px-3 py-1.5 font-semibold text-blue-800 text-xs sticky top-0">{category}</td>
                            </tr>
                          )}
                          {showSubcategoryHeader && subcategory && (
                            <tr className="bg-indigo-50/60 border-y border-indigo-100">
                              <td colSpan={colCount} className="px-6 py-1.5 font-semibold text-indigo-700 text-xs border-l-[3px] border-indigo-400">{subcategory}</td>
                            </tr>
                          )}
                          <tr
                            className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectMode && selectedIds.has(stock.id) ? 'bg-blue-50' : ''}`}
                            onClick={() => selectMode && toggleSelect(stock.id)}
                            onDoubleClick={() => !selectMode && isAdmin && openEditModal(stock)}
                            title={selectMode ? 'Клик для выбора' : isAdmin ? 'Двойной клик для редактирования' : ''}
                          >
                            {selectMode && (
                              <td className="w-8 px-2 py-1.5 text-center">
                                {selectedIds.has(stock.id) ? <CheckSquare size={15} className="text-blue-600" /> : <Square size={15} className="text-gray-300" />}
                              </td>
                            )}
                            <td className="px-3 py-1.5">{product.name || 'Без названия'}</td>
                            <td className="px-2 py-1.5 text-gray-500 text-xs">{subcategory || '—'}</td>
                            <td className={`px-3 py-1.5 text-right font-medium ${quantity < 3 ? 'text-red-600' : ''}`}>
                              <span className="inline-flex items-center gap-1">
                                {quantity} шт
                                {hasCityBreakdown && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setCityModal({ product, breakdown: stock._cityBreakdown, totalQty: quantity }); }}
                                    className="text-blue-400 hover:text-blue-600"
                                    title="Наличие в городах"
                                  >
                                    <MapPin size={12} />
                                  </button>
                                )}
                              </span>
                            </td>
                            {isAdmin && <td className="px-3 py-1.5 text-right text-gray-600">{cost.toLocaleString('ru-RU')}</td>}
                            <td className="px-3 py-1.5 text-right font-medium">{price.toLocaleString('ru-RU')}</td>
                            {isAdmin && <td className={`px-3 py-1.5 text-right font-medium ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>{margin.toLocaleString('ru-RU')}</td>}
                            {isAdmin && <td className="px-3 py-1.5 text-right font-medium">{stockValue.toLocaleString('ru-RU')}</td>}
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()}
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold text-xs">
                    <td colSpan={3} className="px-3 py-2 text-right text-gray-700">Итого:</td>
                    <td className="px-3 py-2 text-right text-gray-900">{totalQuantity} шт</td>
                    {isAdmin && <td className="px-3 py-2 text-right text-gray-600">{totalCostValue.toLocaleString('ru-RU')}</td>}
                    <td className="px-3 py-2 text-right text-gray-900">{totalSaleValue.toLocaleString('ru-RU')}</td>
                    {isAdmin && <td className={`px-3 py-2 text-right ${totalMargin > 0 ? 'text-green-700' : 'text-red-700'}`}>{totalMargin.toLocaleString('ru-RU')}</td>}
                    {isAdmin && <td className="px-3 py-2 text-right text-gray-900">{totalSaleValue.toLocaleString('ru-RU')}</td>}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-3">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Назад
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let page;
            if (totalPages <= 7) {
              page = i + 1;
            } else if (currentPage <= 4) {
              page = i + 1;
            } else if (currentPage >= totalPages - 3) {
              page = totalPages - 6 + i;
            } else {
              page = currentPage - 3 + i;
            }
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 text-xs rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Вперёд →
          </button>
          <span className="text-xs text-gray-400 ml-2">Стр. {currentPage} из {totalPages}</span>
        </div>
      )}

      </>
      ) : (
      <>
      {/* Списание — таблица */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-medium text-gray-600">№</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Дата / Время</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Товар</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Кол-во</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Причина</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Город</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 w-20">Статус</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {writeOffsLoading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Загрузка...</td></tr>
              ) : writeOffs.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Нет списаний</td></tr>
              ) : writeOffs.map((wo, idx) => {
                const isCancelled = wo.status === 'cancelled';
                return (
                  <tr key={wo.id} className={`border-b border-gray-100 ${isCancelled ? 'opacity-70 bg-gray-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2 font-mono text-gray-500">{writeOffs.length - idx}</td>
                    <td className="px-3 py-2">
                      <div className="text-gray-900">{(() => { try { return new Date(String(wo.writeoff_date || wo.created || '').replace(' ','T')).toLocaleDateString('ru-RU', {day:'2-digit',month:'2-digit',year:'2-digit'}); } catch { return '—'; } })()}</div>
                      <div className="text-[10px] text-gray-400">{(() => { try { return new Date(String(wo.writeoff_date || wo.created || '').replace(' ','T')).toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}); } catch { return ''; } })()}</div>
                    </td>
                    <td className={`px-3 py-2 ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>{wo.expand?.product?.name || wo.product_name || '—'}</td>
                    <td className={`px-3 py-2 text-right font-medium ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>{wo.quantity} шт</td>
                    <td className="px-3 py-2 text-gray-600">{wo.comment || wo.reason || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{wo.expand?.supplier?.name || wo.city || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {isCancelled 
                        ? <span className="px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-600 rounded">Возвращено</span>
                        : <span className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 rounded">Списано</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-center">
                      {!isCancelled && isAdmin && (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenWriteOffEdit(wo)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700" title="Редактировать">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleCancelWriteOff(wo)} className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-emerald-50 rounded text-gray-400 hover:text-emerald-600 text-[10px]" title="Вернуть в остатки">
                            <RotateCcw size={12} />
                            <span className="hidden sm:inline">Вернуть</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {writeOffs.length > 0 && (
          <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-500">
            Всего: {writeOffs.filter(w => w.status !== 'cancelled').length} списаний
          </div>
        )}
      </div>
      </>
      )}

      {/* Модалка: разбивка по городам */}
      {cityModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
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

      {/* Модалка: редактирование товара + остатки по городам */}
      {showEditModal && editProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Редактировать товар</h3>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      const cityWithStock = [...editCities]
                        .filter((c) => (Number(c.quantity) || 0) > 0)
                        .sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0))[0];
                      const defaultSupplier = selectedSupplier || cityWithStock?.supplierId || '';
                      setWriteOffForm({ quantity: 1, reason: '', supplierId: defaultSupplier });
                      setShowWriteOffModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <FileX size={14} />
                    Списать
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={handleDeleteProductAndStocks}
                    disabled={deleteProductSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deleteProductSaving ? 'Удаление...' : 'Удалить товар'}
                  </button>
                )}
                <button onClick={closeEditModal} className="p-1 hover:bg-gray-100 rounded">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {editError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{editError}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                  <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Не указана</option>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Подкатегория</label>
                  <select value={editForm.subcategory} onChange={e => setEditForm({...editForm, subcategory: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Авто</option>
                    {allSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Закуп</label>
                  <input type="number" value={editForm.cost} onChange={e => setEditForm({...editForm, cost: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Продажа</label>
                  <input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Остатки по городам */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Остатки по городам</label>
                <div className="space-y-2">
                  {editCities.map((city, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <MapPin size={14} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700 flex-1">{city.supplierName}</span>
                      <button
                        onClick={() => handleAdjustCityQty(city, -1)}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Уменьшить"
                      >
                        —
                      </button>
                      <input
                        type="number"
                        value={city.quantity}
                        onChange={e => {
                          const val = e.target.value;
                          setEditCities(prev => prev.map((c, i) => i === idx ? {...c, quantity: val} : c));
                        }}
                        onBlur={e => handleUpdateCityQty(city, e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                      />
                      <button
                        onClick={() => handleAdjustCityQty(city, 1)}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Увеличить"
                      >
                        +
                      </button>
                      <span className="text-xs text-gray-500">шт</span>
                      <button onClick={() => handleDeleteCity(city)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Удалить остаток">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {/* Добавить город */}
                  <div className="flex items-center gap-2">
                    <select
                      id="addCitySelect"
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>+ Добавить город...</option>
                      {suppliers.filter(s => !editCities.some(c => c.supplierId === s.id)).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById('addCitySelect');
                        if (sel.value) { handleAddCity(sel.value); sel.value = ''; }
                      }}
                      className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* История приёмок */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={14} className="inline mr-1" />
                  История приёмок
                </label>
                {historyLoading ? (
                  <div className="text-center py-3 text-xs text-gray-400">
                    <RefreshCw size={14} className="inline animate-spin mr-1" /> Загрузка...
                  </div>
                ) : receptionHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Нет данных о приёмках</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {receptionHistory.map((h, idx) => {
                      const d = h.date ? new Date((h.date||'').replace(' ','T')) : null;
                      const dateStr = d && !isNaN(d.getTime()) ? d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
                      const timeStr = '';
                      const receptionLabel = h.receptionName || h.batchNumber || '';
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs">
                          <Clock size={12} className="text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-32 shrink-0">
                            {dateStr}{timeStr ? `, ${timeStr}` : ''}
                          </span>
                          {receptionLabel && (
                            <span 
                              onClick={() => {
                                if (onNavigate && h.receptionId) {
                                  closeEditModal();
                                  onNavigate('reception');
                                  // In a real app we might pass the reception ID to open it directly,
                                  // but for now just navigating to the tab is a good start.
                                  // We can store it in localStorage if we want ReceptionDesktop to pick it up.
                                  try { localStorage.setItem('ns_open_reception', h.receptionId); } catch {}
                                }
                              }}
                              className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium shrink-0 cursor-pointer hover:bg-blue-200 transition-colors"
                            >
                              {receptionLabel}
                            </span>
                          )}
                          <MapPin size={12} className="text-blue-400 shrink-0" />
                          <span className="text-gray-700 flex-1 truncate">{h.city || '—'}</span>
                          <span className="font-medium text-gray-900 shrink-0">{h.quantity} шт</span>
                          <span className="text-gray-500 shrink-0">× {(h.cost || 0).toLocaleString('ru-RU')} ₽</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button onClick={closeEditModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
              <button onClick={saveEditModal} disabled={editSaving || deleteProductSaving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {editSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Check size={16} />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: добавить товар на склад */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Добавить на склад</h3>
                <p className="text-sm text-gray-500 mt-0.5">Выберите товар и укажите параметры</p>
              </div>
              <button onClick={closeCreateModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="px-8 py-6 space-y-5">
              {createError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{createError}</div>}

              {/* Поиск товара */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Товар</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Начните вводить название товара..."
                    value={createSearch}
                    onChange={e => setCreateSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  />
                </div>
                {/* Выбранный товар */}
                {createForm.productId && (() => {
                  const sel = allProducts.find(p => p.id === createForm.productId);
                  if (!sel) return null;
                  const cat = Array.isArray(sel.category) ? sel.category[0] : sel.category;
                  return (
                    <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{sel.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {cat && <span className="px-2 py-0.5 bg-white rounded-md">{cat}</span>}
                          {sel.subcategory && <span className="px-2 py-0.5 bg-white rounded-md">{sel.subcategory}</span>}
                          <span>Закуп: <strong className="text-gray-700">{(sel.cost || 0).toLocaleString('ru-RU')}</strong></span>
                          <span>Продажа: <strong className="text-green-600">{(sel.price || 0).toLocaleString('ru-RU')}</strong></span>
                        </div>
                      </div>
                      <button onClick={() => setCreateForm({...createForm, productId: ''})} className="p-1.5 hover:bg-blue-100 rounded-lg">
                        <X size={16} className="text-blue-500" />
                      </button>
                    </div>
                  );
                })()}
                {/* Результаты поиска */}
                {!createForm.productId && createSearch.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden max-h-[200px] overflow-y-auto">
                    {filteredCreateProducts.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400 text-center">Ничего не найдено</p>
                    ) : (
                      filteredCreateProducts.map(p => {
                        const cat = Array.isArray(p.category) ? p.category[0] : p.category;
                        return (
                          <button
                            key={p.id}
                            onClick={() => { setCreateForm({...createForm, productId: p.id}); setCreateSearch(''); }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{p.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                                {cat && <span>{cat}</span>}
                                {p.subcategory && <span>· {p.subcategory}</span>}
                                {(p.cost || 0) > 0 && <span>· {(p.cost || 0).toLocaleString('ru-RU')}₽</span>}
                              </div>
                            </div>
                            <Plus size={16} className="text-blue-500 shrink-0" />
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Город + Количество в ряд */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Город</label>
                  <select
                    value={createForm.supplierId}
                    onChange={e => setCreateForm({...createForm, supplierId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  >
                    <option value="">Выберите город...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Количество</label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.quantity}
                    onChange={e => setCreateForm({...createForm, quantity: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={closeCreateModal} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Отмена</button>
              <button onClick={saveCreateModal} disabled={createSaving}
                className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm">
                {createSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Plus size={16} />}
                Добавить на склад
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: списание товара */}
      {showWriteOffModal && editProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FileX size={18} className="text-red-500" />
                <h3 className="text-base font-semibold text-gray-900">Списание</h3>
              </div>
              <button onClick={() => setShowWriteOffModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{editProduct.name}</p>
                <p className="text-xs text-gray-500">Закуп: {(editForm.cost || 0).toLocaleString('ru-RU')} ₽</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
                <input
                  type="number"
                  min="1"
                  value={writeOffForm.quantity}
                  onChange={e => setWriteOffForm({...writeOffForm, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {editCities.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                  <select
                    value={writeOffForm.supplierId}
                    onChange={e => setWriteOffForm({...writeOffForm, supplierId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Выберите город</option>
                    {editCities.map((city) => (
                      <option key={city.supplierId} value={city.supplierId}>{city.supplierName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Причина</label>
                <select
                  value={writeOffForm.reason}
                  onChange={e => setWriteOffForm({...writeOffForm, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Выберите причину</option>
                  <option value="Испорчен">Испорчен</option>
                  <option value="Потерян">Потерян</option>
                  <option value="Просрочен">Просрочен</option>
                  <option value="Другое">Другое</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowWriteOffModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
              <button
                onClick={handleWriteOff}
                disabled={writeOffSaving || !writeOffForm.reason || (editCities.length > 1 && !writeOffForm.supplierId)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {writeOffSaving ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div> : <FileX size={14} />}
                Списать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: редактирование списания */}
      {editingWriteOff && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Pencil size={18} className="text-gray-600" />
                <h3 className="text-base font-semibold text-gray-900">Редактирование списания</h3>
              </div>
              <button onClick={() => setEditingWriteOff(null)} className="p-1 hover:bg-gray-100 rounded">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{editingWriteOff.expand?.product?.name || editingWriteOff.product_name || 'Товар'}</p>
                <p className="text-xs text-gray-500">Город: {editingWriteOff.expand?.supplier?.name || editingWriteOff.city || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
                <input
                  type="number"
                  min="1"
                  value={writeOffEditForm.quantity}
                  onChange={e => setWriteOffEditForm({...writeOffEditForm, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Причина</label>
                <select
                  value={writeOffEditForm.reason}
                  onChange={e => setWriteOffEditForm({...writeOffEditForm, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите причину</option>
                  <option value="Испорчен">Испорчен</option>
                  <option value="Потерян">Потерян</option>
                  <option value="Просрочен">Просрочен</option>
                  <option value="Другое">Другое</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button onClick={() => setEditingWriteOff(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
              <button
                onClick={handleSaveWriteOffEdit}
                disabled={writeOffEditSaving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {writeOffEditSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
