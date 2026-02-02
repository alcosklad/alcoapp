import React, { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, RefreshCw, Edit2, Check, X } from 'lucide-react';
import { getProducts, updateProduct, getSuppliers } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';

export default function PriceListDesktop() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const userRole = pb.authStore.model?.role;
  const canEdit = userRole === 'admin';

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedSupplier]);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers().catch(() => []);
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts(selectedSupplier || null).catch(() => []);
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

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditValues({
      purchasePrice: product.purchasePrice || 0,
      price: product.price || 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (productId) => {
    try {
      await updateProduct(productId, {
        purchasePrice: Number(editValues.purchasePrice),
        price: Number(editValues.price),
      });
      setEditingId(null);
      loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Ошибка сохранения');
    }
  };

  const filteredProducts = products
    .filter(product => {
      const name = product?.name || '';
      const article = product?.article || '';
      const query = searchQuery.toLowerCase();
      return name.toLowerCase().includes(query) || article.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'name':
          aVal = a?.name || '';
          bVal = b?.name || '';
          break;
        case 'article':
          aVal = a?.article || '';
          bVal = b?.article || '';
          break;
        case 'category':
          aVal = a?.category || '';
          bVal = b?.category || '';
          break;
        case 'purchasePrice':
          aVal = a?.purchasePrice || 0;
          bVal = b?.purchasePrice || 0;
          break;
        case 'price':
          aVal = a?.price || 0;
          bVal = b?.price || 0;
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
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
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
          onClick={loadProducts}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          title="Обновить"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>

        <span className="text-sm text-gray-500 ml-auto">
          Найдено: {filteredProducts.length}
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
                {canEdit && (
                  <th className="w-16 px-3 py-2"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin" />
                      Загрузка...
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'Ничего не найдено' : 'Нет данных'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isEditing = editingId === product.id;
                  
                  return (
                    <tr 
                      key={product.id} 
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-1.5 font-mono text-xs text-gray-600">
                        {product.article || '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        {product.name || 'Без названия'}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">
                        {product.category || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.purchasePrice}
                            onChange={(e) => setEditValues({...editValues, purchasePrice: e.target.value})}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                          />
                        ) : (
                          <span className="text-gray-600">
                            {(product.purchasePrice || 0).toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.price}
                            onChange={(e) => setEditValues({...editValues, price: e.target.value})}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                          />
                        ) : (
                          <span className="font-medium">
                            {(product.price || 0).toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-1.5">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveEdit(product.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(product)}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
