import React, { useState } from 'react';
import { X, Plus, Minus, Percent, DollarSign, ShoppingCart, Check } from 'lucide-react';

export default function CartModal({ isOpen, onClose, stocks, onCompleteOrder }) {
  const [cartItems, setCartItems] = useState([]);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'transfer', 'prepaid'
  const [isSelecting, setIsSelecting] = useState(true);

  // Добавить товар в корзину
  const addToCart = (stock) => {
    const existing = cartItems.find(item => item.id === stock.id);
    if (existing) {
      // Если товар уже в корзине, увеличиваем количество
      setCartItems(cartItems.map(item => 
        item.id === stock.id 
          ? { ...item, quantity: Math.min(item.quantity + 1, stock.quantity) }
          : item
      ));
    } else {
      // Добавляем новый товар
      setCartItems([...cartItems, {
        id: stock.id,
        name: stock.expand?.product?.name || 'Товар',
        price: stock.expand?.product?.price || 0,
        quantity: 1,
        maxQuantity: stock.quantity
      }]);
    }
  };

  // Удалить товар из корзины
  const removeFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  // Изменить количество товара
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCartItems(cartItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity: Math.min(newQuantity, item.maxQuantity) }
          : item
      ));
    }
  };

  // Расчет итоговой суммы
  const calculateTotal = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (!discountValue) return subtotal;
    
    const discount = discountType === 'percentage' 
      ? (subtotal * parseFloat(discountValue)) / 100
      : parseFloat(discountValue);
    
    return Math.max(0, subtotal - discount);
  };

  // Расчет суммы скидки
  const calculateDiscount = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (!discountValue) return 0;
    
    return discountType === 'percentage' 
      ? (subtotal * parseFloat(discountValue)) / 100
      : parseFloat(discountValue);
  };

  // Завершить заказ
  const handleComplete = () => {
    if (cartItems.length === 0) {
      alert('Корзина пуста!');
      return;
    }

    const orderData = {
      items: cartItems,
      subtotal: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      discount: calculateDiscount(),
      total: calculateTotal(),
      discountType,
      discountValue,
      paymentMethod,
      timestamp: new Date().toISOString(),
      localTime: new Date().toLocaleString('ru-RU', {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    onCompleteOrder(orderData);
    onClose();
    setCartItems([]);
    setDiscountValue('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {isSelecting ? 'Выберите товары' : 'Состав заказа'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={24} />
            </button>
          </div>
          
          {/* Кнопка переключения режима */}
          {cartItems.length > 0 && (
            <button
              onClick={() => setIsSelecting(!isSelecting)}
              className="mt-3 w-full py-2 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
            >
              {isSelecting ? (
                <>
                  <Check size={20} />
                  Составить заказ ({cartItems.length})
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Добавить товар
                </>
              )}
            </button>
          )}
        </div>

        <div className="p-4">
          {isSelecting ? (
            /* Режим выбора товаров */
            <div className="space-y-2">
              {stocks.map(stock => (
                <button
                  key={stock.id}
                  onClick={() => addToCart(stock)}
                  className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                  disabled={stock.quantity === 0}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{stock.expand?.product?.name || 'Товар'}</p>
                      <p className="text-sm text-gray-500">
                        {(stock.expand?.product?.price || 0).toLocaleString('ru-RU')} ₽ • {stock.quantity} шт
                      </p>
                    </div>
                    <Plus size={20} className="text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Режим редактирования заказа */
            <div className="space-y-4">
              {/* Товары в корзине */}
              <div className="space-y-2">
                {cartItems.map(item => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          {item.price.toLocaleString('ru-RU')} ₽ за шт
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    
                    {/* Изменение количества */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        <Plus size={16} />
                      </button>
                      <span className="ml-auto text-sm font-medium">
                        {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Скидка */}
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="font-medium mb-2">Скидка</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                  <button
                    onClick={() => setDiscountType(discountType === 'percentage' ? 'fixed' : 'percentage')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-1 ${
                      discountType === 'percentage' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {discountType === 'percentage' ? <Percent size={16} /> : <DollarSign size={16} />}
                    {discountType === 'percentage' ? 'Проценты' : 'Сумма'}
                  </button>
                </div>
                {discountValue && (
                  <p className="text-sm text-gray-600 mt-1">
                    Скидка: {calculateDiscount().toLocaleString('ru-RU')} ₽
                  </p>
                )}
              </div>

              {/* Способ оплаты */}
              <div className="bg-green-50 rounded-lg p-3">
                <p className="font-medium mb-2">Способ оплаты</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-lg text-sm border-2 ${
                      paymentMethod === 'cash' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Наличные
                  </button>
                  <button
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-2 px-3 rounded-lg text-sm border-2 ${
                      paymentMethod === 'transfer' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Перевод
                  </button>
                  <button
                    onClick={() => setPaymentMethod('prepaid')}
                    className={`py-2 px-3 rounded-lg text-sm border-2 ${
                      paymentMethod === 'prepaid' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Предоплата
                  </button>
                </div>
              </div>

              {/* Итог */}
              <div className="border-t pt-3">
                {discountValue && (
                  <div className="flex justify-between text-sm mb-1 text-green-600">
                    <span>Скидка:</span>
                    <span>-{calculateDiscount().toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Итого:</span>
                  <span>{calculateTotal().toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>

              {/* Кнопка завершения */}
              <button
                onClick={handleComplete}
                className="w-full py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 font-medium"
              >
                Завершить заказ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
