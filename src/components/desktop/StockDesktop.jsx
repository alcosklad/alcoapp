import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, MapPin, X } from 'lucide-react';
import { getStocksAggregated, getSuppliers } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';

export default function StockDesktop() {
  const [stocks, setStocks] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortField, setSortField] = useState('category');
  const [sortDir, setSortDir] = useState('asc');
  const [cityModal, setCityModal] = useState(null);

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
          aVal = a?.expand?.product?.cost || a?.product?.cost || 0;
          bVal = b?.expand?.product?.cost || b?.product?.cost || 0;
          break;
        case 'price':
          aVal = a?.expand?.product?.price || a?.product?.price || 0;
          bVal = b?.expand?.product?.price || b?.product?.price || 0;
          break;
        case 'category':
          aVal = a?.expand?.product?.category || a?.product?.category || '';
          bVal = b?.expand?.product?.category || b?.product?.category || '';
          break;
        case 'volume':
          aVal = a?.expand?.product?.volume || a?.product?.volume || '';
          bVal = b?.expand?.product?.volume || b?.product?.volume || '';
          break;
        case 'margin':
          aVal = (a?.expand?.product?.price || a?.product?.price || 0) - (a?.expand?.product?.cost || a?.product?.cost || 0);
          bVal = (b?.expand?.product?.price || b?.product?.price || 0) - (b?.expand?.product?.cost || b?.product?.cost || 0);
          break;
        case 'stockValue':
          aVal = (a?.quantity || 0) * (a?.expand?.product?.price || a?.product?.price || 0);
          bVal = (b?.quantity || 0) * (b?.expand?.product?.price || b?.product?.price || 0);
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

  // Итоги
  const totalQuantity = filteredStocks.reduce((sum, s) => sum + (s?.quantity || 0), 0);
  const totalCostValue = filteredStocks.reduce((sum, s) => {
    const product = s?.expand?.product || s?.product || {};
    return sum + ((product.cost || 0) * (s?.quantity || 0));
  }, 0);
  const totalSaleValue = filteredStocks.reduce((sum, s) => {
    const product = s?.expand?.product || s?.product || {};
    return sum + ((product.price || 0) * (s?.quantity || 0));
  }, 0);
  const totalMargin = totalSaleValue - totalCostValue;

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
                  onClick={() => handleSort('article')}
                >
                  <div className="flex items-center gap-1">
                    Артикул <SortIcon field="article" />
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
                  className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
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
                <th 
                  className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('margin')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Маржа <SortIcon field="margin" />
                  </div>
                </th>
                <th 
                  className="text-right px-3 py-2 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('stockValue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Сумма <SortIcon field="stockValue" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Загрузка...
                    </div>
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                    {searchQuery || selectedCategory ? 'Ничего не найдено' : 'Нет данных'}
                  </td>
                </tr>
              ) : (
                <>
                  {(() => {
                    let lastCategory = null;
                    return filteredStocks.map((stock) => {
                      const product = stock?.expand?.product || stock?.product || {};
                      const quantity = stock?.quantity || 0;
                      const cost = product.cost || 0;
                      const price = product.price || 0;
                      const margin = price - cost;
                      const stockValue = quantity * price;
                      const category = Array.isArray(product.category) ? product.category[0] : (product.category || '');
                      const isGlobal = !selectedSupplier;
                      const hasCityBreakdown = isGlobal && stock._cityBreakdown && stock._cityBreakdown.length > 1;

                      const showCategoryHeader = category !== lastCategory;
                      lastCategory = category;

                      return (
                        <React.Fragment key={stock.id}>
                          {showCategoryHeader && category && (
                            <tr className="bg-blue-50 border-y border-blue-200">
                              <td colSpan={9} className="px-3 py-1.5 font-semibold text-blue-800 text-xs sticky top-0">
                                {category}
                              </td>
                            </tr>
                          )}
                          <tr className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-1.5 font-mono text-xs text-gray-600">
                              {product.article || '—'}
                            </td>
                            <td className="px-3 py-1.5">
                              {product.name || 'Без названия'}
                            </td>
                            <td className="px-3 py-1.5 text-gray-600">
                              {category || '—'}
                            </td>
                            <td className="px-3 py-1.5 text-gray-600">
                              {product.volume || '—'}
                            </td>
                            <td className={`px-3 py-1.5 text-right font-medium ${quantity < 3 ? 'text-red-600' : ''}`}>
                              <span className="inline-flex items-center gap-1">
                                {quantity} шт
                                {hasCityBreakdown && (
                                  <button
                                    onClick={() => setCityModal({ product, breakdown: stock._cityBreakdown, totalQty: quantity })}
                                    className="text-blue-400 hover:text-blue-600"
                                    title="Разбивка по городам"
                                  >
                                    <MapPin size={12} />
                                  </button>
                                )}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right text-gray-600">
                              {cost.toLocaleString('ru-RU')} ₽
                            </td>
                            <td className="px-3 py-1.5 text-right font-medium">
                              {price.toLocaleString('ru-RU')} ₽
                            </td>
                            <td className={`px-3 py-1.5 text-right font-medium ${margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {margin.toLocaleString('ru-RU')} ₽
                            </td>
                            <td className="px-3 py-1.5 text-right font-medium">
                              {stockValue.toLocaleString('ru-RU')} ₽
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()}
                  {/* Строка итогов */}
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold text-xs">
                    <td colSpan={4} className="px-3 py-2 text-right text-gray-700">Итого:</td>
                    <td className="px-3 py-2 text-right text-gray-900">{totalQuantity} шт</td>
                    <td className="px-3 py-2 text-right text-gray-600">{totalCostValue.toLocaleString('ru-RU')} ₽</td>
                    <td className="px-3 py-2 text-right text-gray-900">{totalSaleValue.toLocaleString('ru-RU')} ₽</td>
                    <td className={`px-3 py-2 text-right ${totalMargin > 0 ? 'text-green-700' : 'text-red-700'}`}>{totalMargin.toLocaleString('ru-RU')} ₽</td>
                    <td className="px-3 py-2 text-right text-gray-900">{totalSaleValue.toLocaleString('ru-RU')} ₽</td>
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
    </div>
  );
}
