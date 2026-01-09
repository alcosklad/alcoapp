import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, User } from 'lucide-react';
import { getSuppliers, getWarehouses, getUsers, createReception } from '../lib/pocketbase';
import ProductSelectorModal from './ProductSelectorModal';

export default function ReceptionCreate({ onBack, onSuccess, initialItems = [], initialData = {} }) {
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(initialData.supplier || '');
  const [selectedWarehouse, setSelectedWarehouse] = useState(initialData.warehouse || '');
  const [selectedUser, setSelectedUser] = useState(initialData.user || '');
  const [date, setDate] = useState(initialData.date || new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState(initialItems);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('ReceptionCreate: Загрузка данных...');
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setInitialLoading(true);
      setError(null);
      
      const [suppliersData, warehousesData, usersData] = await Promise.all([
        getSuppliers().catch(err => {
          console.error('Ошибка загрузки suppliers:', err);
          return [];
        }),
        getWarehouses().catch(err => {
          console.error('Ошибка загрузки warehouses:', err);
          return [];
        }),
        getUsers().catch(err => {
          console.error('Ошибка загрузки users:', err);
          return [];
        })
      ]);
      
      console.log('Suppliers получены:', suppliersData?.length || 0, 'шт');
      console.log('Warehouses получены:', warehousesData?.length || 0, 'шт');
      console.log('Users получены:', usersData?.length || 0, 'шт');
      
      // Защита от null/undefined
      const safeSuppliers = suppliersData || [];
      const safeWarehouses = warehousesData || [];
      const safeUsers = usersData || [];
      
      setSuppliers(safeSuppliers);
      setWarehouses(safeWarehouses);
      setUsers(safeUsers);
      
      // Set defaults с защитой - Ждем установки массивов
      if (safeSuppliers.length > 0 && !selectedSupplier) {
        setSelectedSupplier(safeSuppliers[0].id);
        console.log('Выбран город по умолчанию:', safeSuppliers[0].name);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAddItem = (newItem) => {
    console.log('Добавляем товар:', newItem);
    setItems(prevItems => [...(prevItems || []), newItem]);
    setIsSearchOpen(false);
  };

  const handleRemoveItem = (index) => {
    setItems(prevItems => (prevItems || []).filter((_, i) => i !== index));
  };

  const getTotal = () => {
    return (items || []).reduce((sum, item) => {
      const quantity = item?.quantity || 0;
      const cost = item?.cost || 0;
      return sum + (quantity * cost);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔥 Нажата кнопка Готово!');
    console.log('Данные для проверки:');
    console.log('- selectedSupplier:', selectedSupplier);
    console.log('- selectedWarehouse:', selectedWarehouse);
    console.log('- selectedUser:', selectedUser);
    console.log('- items.length:', items.length);
    
    if (!selectedSupplier || !selectedWarehouse || items.length === 0) {
      console.log('❌ Валидация не пройдена');
      setError('Заполните все поля и добавьте товары');
      return;
    }
    
    // Если пользователь не выбран, используем значение по умолчанию
    const userValue = selectedUser || 'admin';
    
    try {
      setLoading(true);
      setError(null);
      console.log('🚀 Начинаем сохранение...');
      
      // Рассчитываем общую сумму
      const totalAmount = items.reduce((sum, item) => {
        return sum + (item.quantity * item.cost);
      }, 0);
      
      const receptionData = {
        supplier: selectedSupplier,
        warehouse: selectedWarehouse,
        date: date,
        status: 'draft',  // Правильное значение - draft
        items: items.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          cost: item.cost
        })),
        total_amount: totalAmount
      };
      
      console.log('📦 Данные для сохранения:', receptionData);
      const result = await createReception(receptionData);
      console.log('✅ Результат сохранения:', result);
      
      setSuccess(true);
      console.log('🎉 Вызываем onSuccess для перехода');
      
      // Небольшая задержка для показа успеха, затем переход
      setTimeout(() => {
        onSuccess();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      setError(error.message || 'Ошибка при создании приемки');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Сохранено!</h2>
          <p className="text-gray-500 mt-2">Приемка успешно создана</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Ошибка</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Создать приемку</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || items.length === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Сохранение...</span>
              </>
            ) : success ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Сохранено!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Готово</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Form */}
      <div className="px-4 py-4 space-y-4">
        {/* Supplier and Warehouse */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Город
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите город</option>
                {(suppliers || []).map(supplier => (
                  <option key={supplier?.id || Math.random()} value={supplier?.id}>
                    {supplier?.name || 'Неизвестный город'}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Магазин
              </label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите магазин</option>
                {(warehouses || []).map(warehouse => (
                  <option key={warehouse?.id || Math.random()} value={warehouse?.id}>
                    {warehouse?.name || 'Неизвестный магазин'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пользователь
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите пользователя</option>
                {(users || []).map(user => (
                  <option key={user?.id || Math.random()} value={user?.id}>
                    {user?.name || user?.email || 'Неизвестный пользователь'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900">Товары</h3>
              <span className="text-sm text-gray-500">{(items || []).length} шт</span>
            </div>

            {(!items || items.length === 0) ? (
              <p className="text-gray-500 text-center py-8">Нет товаров</p>
            ) : (
              <div className="space-y-2">
                {(items || []).map((item, index) => (
                  <div key={item?.id || index} className="flex items-center justify-between py-2 border-t">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item?.product?.name || 'Товар'}</p>
                      <p className="text-sm text-gray-500">
                        {item?.quantity || 0} шт × {item?.cost || 0} ₽
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-gray-900">
                        {((item?.quantity || 0) * (item?.cost || 0)).toLocaleString('ru-RU')} ₽
                      </p>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          {items && items.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">ИТОГО</span>
                <span className="text-xl font-bold text-blue-600">
                  {getTotal().toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Product Selector - модальное окно */}
        {isSearchOpen && (
          <ProductSelectorModal
            isOpen={isSearchOpen}
            onClose={() => {
              console.log('Закрытие модалки поиска');
              setIsSearchOpen(false);
            }}
            onAdd={handleAddItem}
          />
        )}
      </div>
    </div>
  );
}
