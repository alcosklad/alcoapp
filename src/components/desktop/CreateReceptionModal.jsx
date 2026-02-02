import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, Search } from 'lucide-react';

export default function CreateReceptionModal({ 
  isOpen, 
  onClose, 
  suppliers, 
  stores, 
  products,
  onSave 
}) {
  // Статичный список магазинов (пока коллекция stores не создана в PocketBase)
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

  const [formData, setFormData] = useState({
    supplier: '',
    selectedStores: [],
    items: []
  });
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (productSearch.length > 0) {
      const query = productSearch.toLowerCase();
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.article.toLowerCase().includes(query)
      );
      setSearchResults(filtered.slice(0, 10));
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  }, [productSearch, products]);

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

  const handleAddProduct = (product) => {
    const existingItem = formData.items.find(item => item.product === product.id);
    
    if (existingItem) {
      // Увеличиваем количество если товар уже добавлен
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.product === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }));
    } else {
      // Добавляем новый товар с ценой закупа из поля cost
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          product: product.id,
          productData: product,
          name: product.name,
          article: product.article,
          quantity: 1,
          cost: product.cost || 0
        }]
      }));
    }
    
    setProductSearch('');
    setShowSearch(false);
  };

  const handleQuantityChange = (productId, delta) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.product === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    }));
  };

  const handleCostChange = (productId, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.product === productId 
          ? { ...item, cost: parseFloat(value) || 0 }
          : item
      )
    }));
  };

  const handleRemoveItem = (productId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.product !== productId)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.supplier) {
      newErrors.supplier = 'Выберите город';
    }
    
    if (formData.selectedStores.length === 0) {
      newErrors.stores = 'Выберите хотя бы один магазин';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'Добавьте хотя бы один товар';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const totalAmount = formData.items.reduce((sum, item) => 
      sum + (item.cost * item.quantity), 0
    );

    const receptionData = {
      supplier: formData.supplier,
      stores: formData.selectedStores,
      items: formData.items.map(item => ({
        product: item.product,
        name: item.name,
        article: item.article,
        quantity: item.quantity,
        cost: item.cost
      })),
      total_amount: totalAmount
    };

    onSave(receptionData);
  };

  const totalAmount = formData.items.reduce((sum, item) => 
    sum + (item.cost * item.quantity), 0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-6xl h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Создать новую приёмку</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Выбор города */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Город <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.supplier ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Выберите город</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {errors.supplier && <p className="text-xs text-red-500 mt-1">{errors.supplier}</p>}
          </div>

          {/* Выбор магазинов */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Магазины <span className="text-red-500">*</span>
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddStore(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            >
              <option value="">Выберите магазин для добавления</option>
              {storesList.filter(store => !formData.selectedStores.includes(store.id)).map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            
            {/* Выбранные магазины */}
            {formData.selectedStores.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.selectedStores.map(storeId => {
                  const store = storesList.find(s => s.id === storeId);
                  return (
                    <div
                      key={storeId}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      <span>{store?.name || storeId}</span>
                      <button
                        onClick={() => handleRemoveStore(storeId)}
                        className="hover:bg-blue-200 rounded p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {errors.stores && <p className="text-xs text-red-500 mt-1">{errors.stores}</p>}
          </div>

          {/* Поиск товаров */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Добавить товары <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию или артикулу..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {/* Результаты поиска */}
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">Артикул: {product.article}</p>
                      </div>
                      <Plus size={16} className="text-blue-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.items && <p className="text-xs text-red-500 mt-1">{errors.items}</p>}
          </div>

          {/* Список добавленных товаров */}
          {formData.items.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Выбранные товары:</h3>
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Товар</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Артикул</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Количество</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Цена закупа</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Сумма</th>
                      <th className="w-10 px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map(item => (
                      <tr key={item.product} className="border-t border-gray-100">
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-gray-600">{item.article}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleQuantityChange(item.product, -1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item.product, 1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={item.cost}
                            onChange={(e) => handleCostChange(item.product, e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-xs"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {(item.cost * item.quantity).toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleRemoveItem(item.product)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan="4" className="px-3 py-2 text-right font-medium text-gray-700">
                        Итого:
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">
                        {totalAmount.toLocaleString('ru-RU')} ₽
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Создать приёмку
          </button>
        </div>
      </div>
    </div>
  );
}
