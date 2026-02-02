import React, { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, Plus, Eye, X, Trash2, Edit } from 'lucide-react';
import { getReceptions, getSuppliers, getStores, getProducts, createReception, updateReception, deleteReception } from '../../lib/pocketbase';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import pb from '../../lib/pocketbase';
import CreateReceptionModal from './CreateReceptionModal';

export default function ReceptionDesktop() {
  const [receptions, setReceptions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedReception, setSelectedReception] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedReception, setEditedReception] = useState(null);
  
  const userRole = pb.authStore.model?.role;
  const isAdmin = userRole === 'admin';

  // Статичный список магазинов
  const defaultStores = [
    { id: 'kb', name: 'КБ' },
    { id: 'bristol', name: 'Бристоль' },
    { id: 'lenta', name: 'Лента' },
    { id: 'magnit', name: 'Магнит' },
    { id: 'perekrestok', name: 'Перекрёсток' },
    { id: 'pyaterochka', name: 'Пятёрочка' },
    { id: 'diksi', name: 'Дикси' }
  ];

  const storesList = stores && stores.length > 0 ? stores : defaultStores;

  useEffect(() => {
    loadSuppliers();
    loadStores();
    loadProducts();
    loadReceptions();
  }, []);

  useEffect(() => {
    loadReceptions();
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers().catch(() => []);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadStores = async () => {
    try {
      const data = await getStores().catch(() => []);
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts().catch(() => []);
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadReceptions = async () => {
    try {
      setLoading(true);
      const data = await getReceptions().catch(() => []);
      
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
    if (!window.confirm('Вы уверены, что хотите удалить эту приёмку? Остатки будут пересчитаны.')) {
      return;
    }

    try {
      setLoading(true);
      await deleteReception(receptionId);
      setSelectedReception(null);
      await loadReceptions();
      alert('Приёмка удалена');
    } catch (error) {
      console.error('Error deleting reception:', error);
      alert('Ошибка при удалении приёмки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditMode(true);
    setEditedReception({
      ...selectedReception,
      items: [...selectedReception.items]
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedReception(null);
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const totalAmount = editedReception.items.reduce((sum, item) => 
        sum + (item.cost * item.quantity), 0
      );

      await updateReception(editedReception.id, {
        items: editedReception.items,
        total_amount: totalAmount,
        stores: editedReception.stores
      });

      setIsEditMode(false);
      setSelectedReception(null);
      await loadReceptions();
      alert('Приёмка обновлена! Остатки пересчитаны.');
    } catch (error) {
      console.error('Error updating reception:', error);
      alert('Ошибка при обновлении приёмки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuantityChange = (itemIndex, delta) => {
    setEditedReception(prev => ({
      ...prev,
      items: prev.items.map((item, idx) => 
        idx === itemIndex 
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    }));
  };

  const handleEditCostChange = (itemIndex, value) => {
    setEditedReception(prev => ({
      ...prev,
      items: prev.items.map((item, idx) => 
        idx === itemIndex 
          ? { ...item, cost: parseFloat(value) || 0 }
          : item
      )
    }));
  };

  const handleRemoveEditItem = (itemIndex) => {
    if (editedReception.items.length <= 1) {
      alert('Нельзя удалить последний товар из приёмки');
      return;
    }
    setEditedReception(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== itemIndex)
    }));
  };

  const filteredReceptions = receptions
    .filter(reception => {
      const supplierName = reception?.expand?.supplier?.name || '';
      const query = searchQuery.toLowerCase();
      return supplierName.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'created':
          aVal = new Date(a.created);
          bVal = new Date(b.created);
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

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по городу..."
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
                <th 
                  className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('supplier')}
                >
                  <div className="flex items-center gap-1">
                    Город <SortIcon field="supplier" />
                  </div>
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
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Загрузка...
                    </div>
                  </td>
                </tr>
              ) : filteredReceptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    {searchQuery ? 'Ничего не найдено' : 'Нет приёмок'}
                  </td>
                </tr>
              ) : (
                filteredReceptions.map((reception) => {
                  const itemsCount = reception.items?.length || 0;
                  const totalAmount = reception.total_amount || 0;
                  
                  return (
                    <tr 
                      key={reception.id} 
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-1.5 text-gray-600">
                        {format(new Date(reception.created), 'd MMMM yyyy, HH:mm', { locale: ru })}
                      </td>
                      <td className="px-3 py-1.5">
                        {reception?.expand?.supplier?.name || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">
                        {itemsCount} шт
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        {totalAmount.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => setSelectedReception(reception)}
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
        onClose={() => setShowCreateModal(false)}
        suppliers={suppliers}
        stores={stores}
        products={products}
        onSave={handleCreateReception}
      />

      {/* Модалка с деталями приёмки */}
      {selectedReception && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedReception(null); setIsEditMode(false); }}>
          <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Приёмка от {format(new Date(selectedReception.created), 'd MMMM yyyy', { locale: ru })}
                </h3>
                <p className="text-sm text-gray-500">
                  Город: {selectedReception?.expand?.supplier?.name || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && !isEditMode && (
                  <>
                    <button
                      onClick={handleStartEdit}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Редактировать приёмку"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteReception(selectedReception.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Удалить приёмку"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button onClick={() => { setSelectedReception(null); setIsEditMode(false); }} className="text-gray-400 hover:text-gray-600">
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
                  <p className="text-base font-semibold">
                    {(isEditMode ? editedReception.items : selectedReception.items)?.length || 0} шт
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Сумма закупа</p>
                  <p className="text-base font-semibold">
                    {isEditMode 
                      ? editedReception.items.reduce((sum, item) => sum + (item.cost * item.quantity), 0).toLocaleString('ru-RU')
                      : (selectedReception.total_amount || 0).toLocaleString('ru-RU')
                    } ₽
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Сумма продажи</p>
                  <p className="text-base font-semibold text-green-600">
                    {isEditMode
                      ? editedReception.items.reduce((sum, item) => {
                          const product = products.find(p => p.id === item.product);
                          return sum + ((product?.price || 0) * item.quantity);
                        }, 0).toLocaleString('ru-RU')
                      : selectedReception.items.reduce((sum, item) => {
                          const product = products.find(p => p.id === item.product);
                          return sum + ((product?.price || 0) * item.quantity);
                        }, 0).toLocaleString('ru-RU')
                    } ₽
                  </p>
                </div>
              </div>

              {/* Список товаров */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Товары в приёмке:</h4>
                {(isEditMode ? editedReception.items : selectedReception.items) && (isEditMode ? editedReception.items : selectedReception.items).length > 0 ? (
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Товар</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Артикул</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-600">Количество</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Цена закупа</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Сумма закупа</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Цена продажи</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Сумма продажи</th>
                          {isEditMode && <th className="w-10 px-3 py-2"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {(isEditMode ? editedReception.items : selectedReception.items).map((item, idx) => {
                          const cost = item.cost || 0;
                          const quantity = item.quantity || 0;
                          const totalCost = cost * quantity;
                          const product = products.find(p => p.id === item.product);
                          const salePrice = product?.price || 0;
                          const totalSale = salePrice * quantity;
                          
                          return (
                            <tr key={idx} className="border-t border-gray-100">
                              <td className="px-3 py-2">{item.name || 'Товар'}</td>
                              <td className="px-3 py-2 text-gray-600">{item.article || '—'}</td>
                              <td className="px-3 py-2">
                                {isEditMode ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleEditQuantityChange(idx, -1)}
                                      className="p-1 hover:bg-gray-100 rounded"
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center">{quantity}</span>
                                    <button
                                      onClick={() => handleEditQuantityChange(idx, 1)}
                                      className="p-1 hover:bg-gray-100 rounded"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center">{quantity} шт</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    value={cost}
                                    onChange={(e) => handleEditCostChange(idx, e.target.value)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                                    min="0"
                                    step="0.01"
                                  />
                                ) : (
                                  <span>{cost.toLocaleString('ru-RU')} ₽</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {totalCost.toLocaleString('ru-RU')} ₽
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {salePrice.toLocaleString('ru-RU')} ₽
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-green-600">
                                {totalSale.toLocaleString('ru-RU')} ₽
                              </td>
                              {isEditMode && (
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => handleRemoveEditItem(idx)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 size={14} />
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

            {/* Футер с кнопками */}
            {isEditMode && (
              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
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
