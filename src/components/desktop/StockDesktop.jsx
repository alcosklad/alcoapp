import React, { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, X, Trash2, Check, Plus, PackagePlus } from 'lucide-react';
import { getStocksWithDetails, getSuppliers, updateProduct, deleteProduct, updateStock } from '../../lib/pocketbase';
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
  
  // Inline editing
  const [editingCell, setEditingCell] = useState(null); // { stockId, field }
  const [editValue, setEditValue] = useState('');
  
  // Modal
  const [selectedStock, setSelectedStock] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [targetCityId, setTargetCityId] = useState('');
  
  // Create product modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    name: '',
    article: '',
    cost: '',
    price: '',
    quantity: '',
    supplier: ''
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplier) {
      loadStocks();
    }
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers().catch(() => []);
      setSuppliers(data || []);
      if (data && data.length > 0) {
        setSelectedSupplier(data[0].id);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadStocks = async () => {
    try {
      setLoading(true);
      const data = await getStocksWithDetails(selectedSupplier).catch(() => []);
      setStocks(data || []);
    } catch (error) {
      console.error('Error loading stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Сортировка
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Получаем уникальные категории
  const categories = [...new Set(stocks.map(stock => 
    stock?.expand?.product?.category || stock?.product?.category || ''
  ).filter(Boolean))].sort();

  // Фильтрация и сортировка данных
  const filteredStocks = stocks
    .filter(stock => {
      const name = stock?.expand?.product?.name || stock?.product?.name || '';
      const article = stock?.expand?.product?.article || stock?.product?.article || '';
      const category = stock?.expand?.product?.category || stock?.product?.category || '';
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = name.toLowerCase().includes(query) || article.toLowerCase().includes(query);
      const matchesCategory = !selectedCategory || category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'name':
          aVal = a?.expand?.product?.name || a?.product?.name || '';
          bVal = b?.expand?.product?.name || b?.product?.name || '';
          break;
        case 'article':
          aVal = a?.expand?.product?.article || a?.product?.article || '';
          bVal = b?.expand?.product?.article || b?.product?.article || '';
          break;
        case 'quantity':
          aVal = a?.quantity || 0;
          bVal = b?.quantity || 0;
          break;
        case 'purchasePrice':
          aVal = a?.cost ?? a?.purchase_price ?? a?.expand?.product?.cost ?? a?.product?.cost ?? 0;
          bVal = b?.cost ?? b?.purchase_price ?? b?.expand?.product?.cost ?? b?.product?.cost ?? 0;
          break;
        case 'price':
          aVal = a?.expand?.product?.price || a?.product?.price || 0;
          bVal = b?.expand?.product?.price || b?.product?.price || 0;
          break;
        default:
          aVal = '';
          bVal = '';
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

  // Inline editing handlers
  const startEditing = (stockId, field, currentValue) => {
    setEditingCell({ stockId, field });
    setEditValue(String(currentValue || ''));
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveInlineEdit = async () => {
    if (!editingCell) return;
    
    const { stockId, field } = editingCell;
    const stock = stocks.find(s => s.id === stockId);
    if (!stock) return;

    try {
      const product = stock?.expand?.product || stock?.product;
      const productId = product?.id || stock.product;

      if (field === 'name' || field === 'price' || field === 'cost') {
        // Update product
        const updateData = {};
        if (field === 'name') updateData.name = editValue;
        if (field === 'price') updateData.price = Number(editValue) || 0;
        if (field === 'cost') updateData.cost = Number(editValue) || 0;
        
        await updateProduct(productId, updateData);
      } else if (field === 'quantity') {
        // Update stock quantity
        const newQty = Number(editValue) || 0;
        const diff = newQty - (stock.quantity || 0);
        if (diff !== 0) {
          await pb.collection('stocks').update(stockId, { quantity: newQty });
        }
      }

      await loadStocks();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Ошибка сохранения: ' + error.message);
    } finally {
      cancelEditing();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Modal handlers
  const openModal = (stock) => {
    const product = stock?.expand?.product || stock?.product || {};
    setSelectedStock(stock);
    setModalData({
      name: product.name || '',
      article: product.article || '',
      cost: stock?.cost ?? stock?.purchase_price ?? product?.cost ?? 0,
      price: product.price || 0,
      quantity: stock.quantity || 0,
      supplier: stock.supplier || selectedSupplier
    });
    setTargetCityId('');
  };

  const closeModal = () => {
    setSelectedStock(null);
    setModalData(null);
    setTargetCityId('');
  };

  const saveModal = async () => {
    if (!selectedStock || !modalData) return;

    try {
      const product = selectedStock?.expand?.product || selectedStock?.product;
      const productId = product?.id || selectedStock.product;

      // Update product (name, price, cost)
      await updateProduct(productId, {
        name: modalData.name,
        article: modalData.article,
        cost: Number(modalData.cost) || 0,
        price: Number(modalData.price) || 0
      });

      // Update stock quantity and cost
      await pb.collection('stocks').update(selectedStock.id, {
        quantity: Number(modalData.quantity) || 0,
        cost: Number(modalData.cost) || 0
      });

      await loadStocks();
      closeModal();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Ошибка сохранения: ' + error.message);
    }
  };

  const handleDeleteStock = async () => {
    if (!selectedStock) return;
    
    if (!confirm('Удалить этот товар из остатков?')) return;

    try {
      await pb.collection('stocks').delete(selectedStock.id);
      await loadStocks();
      closeModal();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Ошибка удаления: ' + error.message);
    }
  };

  const handleAddToCity = async () => {
    if (!selectedStock || !modalData || !targetCityId) {
      alert('Выберите город для добавления товара');
      return;
    }

    try {
      const product = selectedStock?.expand?.product || selectedStock?.product;
      const productId = product?.id || selectedStock.product;

      await pb.collection('stocks').create({
        product: productId,
        supplier: targetCityId,
        quantity: 1,
        cost: Number(modalData.cost) || 0
      });

      alert('Товар добавлен в другой город');
      setTargetCityId('');
    } catch (error) {
      console.error('Error adding to city:', error);
      alert('Ошибка: ' + error.message);
    }
  };

  // Create product modal handlers
  const openCreateModal = () => {
    setCreateData({
      name: '',
      article: '',
      cost: '',
      price: '',
      quantity: '1',
      supplier: selectedSupplier
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateData({
      name: '',
      article: '',
      cost: '',
      price: '',
      quantity: '',
      supplier: ''
    });
  };

  const handleCreateProduct = async () => {
    if (!createData.name || !createData.cost || !createData.price || !createData.quantity || !createData.supplier) {
      alert('Заполните все обязательные поля');
      return;
    }

    try {
      // Create product
      const newProduct = await pb.collection('products').create({
        name: createData.name,
        article: createData.article || '',
        cost: Number(createData.cost) || 0,
        price: Number(createData.price) || 0
      });

      // Create stock record
      await pb.collection('stocks').create({
        product: newProduct.id,
        supplier: createData.supplier,
        quantity: Number(createData.quantity) || 1,
        cost: Number(createData.cost) || 0
      });

      alert('Товар успешно создан');
      closeCreateModal();
      await loadStocks();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Ошибка создания товара: ' + error.message);
    }
  };

  // Calculate totals
  const totals = filteredStocks.reduce((acc, stock) => {
    const purchasePrice = stock?.cost ?? stock?.purchase_price ?? stock?.expand?.product?.cost ?? 0;
    const salePrice = stock?.expand?.product?.price || stock?.product?.price || 0;
    const qty = stock?.quantity || 0;
    
    return {
      totalPurchase: acc.totalPurchase + (purchasePrice * qty),
      totalSale: acc.totalSale + (salePrice * qty),
      totalQty: acc.totalQty + qty
    };
  }, { totalPurchase: 0, totalSale: 0, totalQty: 0 });

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

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded"
          title="Создать товар"
        >
          <PackagePlus size={16} />
          Создать товар
        </button>

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
                  className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Наименование <SortIcon field="name" />
                  </div>
                </th>
                <th 
                  className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Кол-во <SortIcon field="quantity" />
                  </div>
                </th>
                <th 
                  className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('purchasePrice')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Закуп/шт <SortIcon field="purchasePrice" />
                  </div>
                </th>
                <th 
                  className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Продажа/шт <SortIcon field="price" />
                  </div>
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">
                  Сумма закупа
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">
                  Сумма продажи
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Загрузка...
                    </div>
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    {searchQuery || selectedCategory ? 'Ничего не найдено' : 'Нет данных'}
                  </td>
                </tr>
              ) : (
                <>
                  {filteredStocks.map((stock) => {
                    const product = stock?.expand?.product || stock?.product || {};
                    const quantity = stock?.quantity || 0;
                    const purchasePrice = stock?.cost ?? stock?.purchase_price ?? product?.cost ?? 0;
                    const salePrice = product?.price || 0;
                    const totalPurchase = purchasePrice * quantity;
                    const totalSale = salePrice * quantity;
                    const isEditing = (field) => editingCell?.stockId === stock.id && editingCell?.field === field;
                    
                    return (
                      <tr 
                        key={stock.id} 
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => openModal(stock)}
                      >
                        {/* Наименование */}
                        <td 
                          className="px-3 py-1.5"
                          onDoubleClick={(e) => { e.stopPropagation(); startEditing(stock.id, 'name', product.name); }}
                        >
                          {isEditing('name') ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              onBlur={saveInlineEdit}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-1 py-0.5 border border-blue-400 rounded text-xs focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <span className="hover:text-blue-600">{product.name || 'Без названия'}</span>
                          )}
                        </td>
                        
                        {/* Количество */}
                        <td 
                          className={`px-3 py-1.5 text-right font-medium ${quantity <= 3 && quantity > 0 ? 'text-red-400' : ''}`}
                          onDoubleClick={(e) => { e.stopPropagation(); startEditing(stock.id, 'quantity', quantity); }}
                        >
                          {isEditing('quantity') ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              onBlur={saveInlineEdit}
                              onClick={(e) => e.stopPropagation()}
                              className="w-16 px-1 py-0.5 border border-blue-400 rounded text-xs text-right focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <span className="hover:text-blue-600">{quantity} шт</span>
                          )}
                        </td>
                        
                        {/* Закуп за штуку */}
                        <td 
                          className="px-3 py-1.5 text-right text-gray-600"
                          onDoubleClick={(e) => { e.stopPropagation(); startEditing(stock.id, 'cost', purchasePrice); }}
                        >
                          {isEditing('cost') ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              onBlur={saveInlineEdit}
                              onClick={(e) => e.stopPropagation()}
                              className="w-20 px-1 py-0.5 border border-blue-400 rounded text-xs text-right focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <span className="hover:text-blue-600">{purchasePrice.toLocaleString('ru-RU')} ₽</span>
                          )}
                        </td>
                        
                        {/* Продажа за штуку */}
                        <td 
                          className="px-3 py-1.5 text-right"
                          onDoubleClick={(e) => { e.stopPropagation(); startEditing(stock.id, 'price', salePrice); }}
                        >
                          {isEditing('price') ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              onBlur={saveInlineEdit}
                              onClick={(e) => e.stopPropagation()}
                              className="w-20 px-1 py-0.5 border border-blue-400 rounded text-xs text-right focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <span className="hover:text-blue-600">{salePrice.toLocaleString('ru-RU')} ₽</span>
                          )}
                        </td>
                        
                        {/* Сумма закупа */}
                        <td className="px-3 py-1.5 text-right text-gray-500">
                          {totalPurchase.toLocaleString('ru-RU')} ₽
                        </td>
                        
                        {/* Сумма продажи */}
                        <td className="px-3 py-1.5 text-right font-medium text-green-700">
                          {totalSale.toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Итоговая строка */}
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="px-3 py-2 font-medium text-gray-700">Итого</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">{totals.totalQty} шт</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">{totals.totalPurchase.toLocaleString('ru-RU')} ₽</td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700">{totals.totalSale.toLocaleString('ru-RU')} ₽</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно редактирования */}
      {selectedStock && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Редактировать товар</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  type="text"
                  value={modalData.name}
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Артикул</label>
                <input
                  type="text"
                  value={modalData.article}
                  onChange={(e) => setModalData({ ...modalData, article: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
                  <input
                    type="number"
                    value={modalData.quantity}
                    onChange={(e) => setModalData({ ...modalData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                  <select
                    value={modalData.supplier}
                    onChange={(e) => setModalData({ ...modalData, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена закупа (₽)</label>
                  <input
                    type="number"
                    value={modalData.cost}
                    onChange={(e) => setModalData({ ...modalData, cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена продажи (₽)</label>
                  <input
                    type="number"
                    value={modalData.price}
                    onChange={(e) => setModalData({ ...modalData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Добавить в другой город */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Добавить в другой город</label>
                <div className="flex gap-2">
                  <select
                    value={targetCityId}
                    onChange={(e) => setTargetCityId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выберите город</option>
                    {suppliers
                      .filter(s => s.id !== modalData.supplier)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))
                    }
                  </select>
                  <button
                    onClick={handleAddToCity}
                    disabled={!targetCityId}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                    Добавить
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleDeleteStock}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={16} />
                Удалить
              </button>
              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Отмена
                </button>
                <button
                  onClick={saveModal}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
                >
                  <Check size={16} />
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания товара */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeCreateModal}>
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Создать товар</h2>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                <input
                  type="text"
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите название товара"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Артикул</label>
                <input
                  type="text"
                  value={createData.article}
                  onChange={(e) => setCreateData({ ...createData, article: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Артикул товара"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена закупа (₽) *</label>
                  <input
                    type="number"
                    value={createData.cost}
                    onChange={(e) => setCreateData({ ...createData, cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена продажи (₽) *</label>
                  <input
                    type="number"
                    value={createData.price}
                    onChange={(e) => setCreateData({ ...createData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Количество *</label>
                  <input
                    type="number"
                    value={createData.quantity}
                    onChange={(e) => setCreateData({ ...createData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Город *</label>
                  <select
                    value={createData.supplier}
                    onChange={(e) => setCreateData({ ...createData, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выберите город</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateProduct}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded"
              >
                <PackagePlus size={16} />
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
