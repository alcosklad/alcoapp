import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, Save, Calendar, MapPin, Store, Search } from 'lucide-react';
import { getProducts, updateStock } from '../lib/pocketbase';
import pb from '../lib/pocketbase';

export default function EditReceptionModal({ isOpen, onClose, reception, onSave, onDelete }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newQuantity, setNewQuantity] = useState(1);

  useEffect(() => {
    if (isOpen && reception) {
      loadReceptionItems();
    }
  }, [isOpen, reception]);

  const loadReceptionItems = async () => {
    try {
      setLoading(true);
      
      // Получаем все товары
      const products = await getProducts();
      setAllProducts(products);
      
      // Обогащаем товары приемки названиями и ценами
      const enrichedItems = reception.items.map(item => {
        // Если item.product уже содержит данные товара
        if (item.product && item.product.id) {
          return {
            ...item,
            price: item.product.cost || 0  // Используем cost для приемки!
          };
        }
        
        // Если item.product это только ID
        const product = products.find(p => p.id === item.product);
        return {
          ...item,
          product: product || { id: item.product, name: 'Товар не найден' },
          price: product?.cost || 0  // Используем cost для приемки!
        };
      });
      
      setItems(enrichedItems);
    } catch (error) {
      console.error('Error loading reception items:', error);
      setItems(reception.items.map(item => ({
        ...item,
        product: { id: item.product, name: 'Товар' },
        price: 0
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Автоматический пересчет суммы
    const total = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    setTotalAmount(total);
  }, [items]);

  const handleQuantityChange = (index, delta) => {
    const newItems = [...items];
    const newQuantity = newItems[index].quantity + delta;
    if (newQuantity >= 0) {
      newItems[index].quantity = newQuantity;
      setItems(newItems);
    }
  };

  const handlePriceChange = (index, newPrice) => {
    const newItems = [...items];
    newItems[index].price = parseFloat(newPrice) || 0;
    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    if (window.confirm('Удалить товар из приемки?')) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const handleSave = async () => {
    if (items.length === 0) {
      alert('Добавьте хотя бы один товар!');
      return;
    }

    setLoading(true);
    try {
      // Форматируем items для сохранения в PocketBase
      const formattedItems = items.map(item => ({
        product: item.product.id || item.product,  // ID товара
        quantity: item.quantity,
        cost: item.price  // Сохраняем cost как цену закупки
      }));

      const updatedReception = {
        ...reception,
        items: formattedItems,
        total_amount: totalAmount,
        status: reception.status || 'draft'
      };

      console.log('Сохраняем приемку:', updatedReception);

      // Сохраняем приемку
      await onSave(updatedReception, true); // Всегда обновляем остатки
      
      // Обновляем остатки
      await updateStocksFromReception();
      
      onClose();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStocksFromReception = async () => {
    try {
      // Получаем текущие остатки для этой приемки
      const currentStocks = await pb.collection('stocks').getFullList({
        filter: `supplier = "${reception.supplier}" && warehouse = "${reception.warehouse}"`
      });

      // Обновляем или создаем остатки для каждого товара
      for (const item of items) {
        const productId = item.product.id || item.product;  // Получаем ID товара
        const existingStock = currentStocks.find(s => s.product === productId);
        
        if (existingStock) {
          // Обновляем существующий остаток
          await pb.collection('stocks').update(existingStock.id, {
            quantity: item.quantity
          });
        } else {
          // Создаем новый остаток
          await pb.collection('stocks').create({
            product: productId,
            warehouse: reception.warehouse,
            supplier: reception.supplier,
            quantity: item.quantity
          });
        }
      }

      // Удаляем остатки для удаленных товаров
      for (const stock of currentStocks) {
        const stillExists = items.find(item => {
          const productId = item.product.id || item.product;
          return productId === stock.product;
        });
        if (!stillExists) {
          await pb.collection('stocks').delete(stock.id);
        }
      }

    } catch (error) {
      console.error('Error updating stocks:', error);
      throw error;
    }
  };

  const handleAddProduct = () => {
    if (selectedProduct && newQuantity > 0) {
      // Проверяем нет ли уже такого товара
      const exists = items.find(item => item.product === selectedProduct.id);
      if (exists) {
        alert('Этот товар уже добавлен!');
        return;
      }

      const newItem = {
        product: selectedProduct.id,
        quantity: newQuantity,
        price: selectedProduct.price || 0
      };

      setItems([...items, newItem]);
      setSelectedProduct(null);
      setNewQuantity(1);
      setSearchTerm('');
      setShowAddProduct(false);
    }
  };

  const filteredProducts = allProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.article?.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(product => !items.find(item => item.product === product.id));

  const handleDelete = async () => {
    if (window.confirm('Удалить приемку полностью?\n\nВсе связанные остатки будут удалены!')) {
      setLoading(true);
      try {
        // Удаляем остатки перед удалением приемки
        await deleteStocksForReception();
        
        // Удаляем саму приемку
        await onDelete(reception.id);
        onClose();
      } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка при удалении: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteStocksForReception = async () => {
    try {
      const stocks = await pb.collection('stocks').getFullList({
        filter: `supplier = "${reception.supplier}" && warehouse = "${reception.warehouse}"`
      });
      
      for (const stock of stocks) {
        await pb.collection('stocks').delete(stock.id);
      }
    } catch (error) {
      console.error('Error deleting stocks:', error);
      throw error;
    }
  };

  if (!isOpen || !reception) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Редактирование приемки</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date((reception.created||'').replace(' ','T')).toLocaleString('ru-RU')}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {reception.expand?.warehouse?.name || 'Склад'}
                </div>
                <div className="flex items-center gap-1">
                  <Store className="w-4 h-4" />
                  {reception.expand?.supplier?.name || 'Поставщик'}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Загрузка товаров...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.product?.name || `Товар ${index + 1}`}
                      </h4>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                
                <div className="flex items-center gap-4 mt-3">
                  {/* Количество */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(index, -1)}
                      className="p-1 rounded border hover:bg-gray-100"
                      disabled={item.quantity <= 0}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(index, 1)}
                      className="p-1 rounded border hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">шт</span>
                  </div>

                  {/* Цена */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handlePriceChange(index, e.target.value)}
                      className="w-24 px-2 py-1 border rounded text-right"
                      min="0"
                      step="0.01"
                    />
                    <span className="text-sm text-gray-600">₽</span>
                  </div>

                  {/* Сумма */}
                  <div className="flex-1 text-right">
                    <span className="font-medium text-gray-900">
                      {(item.price * item.quantity).toLocaleString('ru-RU')}                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Кнопка добавления товара */}
            <button
              onClick={() => setShowAddProduct(true)}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Добавить товар
            </button>
            </div>
          )}

          {/* Форма добавления товара */}
          {showAddProduct && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Добавить товар</h4>
              
              {/* Поиск товара */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Поиск по названию или артикулу..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Список найденных товаров */}
              {searchTerm && (
                <div className="max-h-40 overflow-y-auto mb-3">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className={`p-2 cursor-pointer rounded hover:bg-gray-100 ${
                          selectedProduct?.id === product.id ? 'bg-blue-100' : ''
                        }`}
                      >
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-gray-600">{product.price}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-2">Товары не найдены</div>
                  )}
                </div>
              )}

              {/* Количество и кнопка добавления */}
              {selectedProduct && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Количество:</label>
                    <input
                      type="number"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 border rounded text-center"
                      min="1"
                    />
                    <span className="text-sm text-gray-600">шт</span>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => {
                        setShowAddProduct(false);
                        setSelectedProduct(null);
                        setSearchTerm('');
                        setNewQuantity(1);
                      }}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleAddProduct}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Итого */}
          {!loading && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Итого:</span>
                <span className="text-xl font-bold text-gray-900">
                  {totalAmount.toLocaleString('ru-RU')}                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-4">
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Удалить
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
