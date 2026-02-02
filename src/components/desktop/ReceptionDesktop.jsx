import React, { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, Plus, Eye } from 'lucide-react';
import { getReceptions, getSuppliers } from '../../lib/pocketbase';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function ReceptionDesktop() {
  const [receptions, setReceptions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedReception, setSelectedReception] = useState(null);

  useEffect(() => {
    loadSuppliers();
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

      {/* Модалка с деталями приёмки */}
      {selectedReception && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedReception(null)}>
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Приёмка от {format(new Date(selectedReception.created), 'd MMMM yyyy', { locale: ru })}
                </h3>
                <p className="text-sm text-gray-500">
                  Город: {selectedReception?.expand?.supplier?.name || '—'}
                </p>
              </div>
              <button onClick={() => setSelectedReception(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {/* Общая информация */}
            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded">
              <div>
                <p className="text-xs text-gray-500">Товаров</p>
                <p className="text-base font-semibold">{selectedReception.items?.length || 0} шт</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Сумма закупа</p>
                <p className="text-base font-semibold">{(selectedReception.total_amount || 0).toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>

            {/* Список товаров */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Товары в приёмке:</h4>
              {selectedReception.items && selectedReception.items.length > 0 ? (
                <div className="border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Товар</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Кол-во</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Цена</th>
                        <th className="text-right px-3 py-2 font-medium text-gray-600">Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReception.items.map((item, idx) => {
                        const price = item.cost || item.purchase_price || item.price || 0;
                        const quantity = item.quantity || 0;
                        const total = price * quantity;
                        
                        return (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="px-3 py-2">{item.name || 'Товар'}</td>
                            <td className="px-3 py-2 text-right">{quantity} шт</td>
                            <td className="px-3 py-2 text-right">{price.toLocaleString('ru-RU')} ₽</td>
                            <td className="px-3 py-2 text-right font-medium">{total.toLocaleString('ru-RU')} ₽</td>
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
        </div>
      )}
    </div>
  );
}
