import React, { useState, useEffect } from 'react';
import { ArrowLeft, Minus, Plus, Trash2, Percent, RussianRuble, CheckCircle } from 'lucide-react';

export default function WorkerCart({ cart, setCart, onBack, onComplete }) {
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Lock body scroll when cart is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > item.maxQuantity) return item;
      return { ...item, quantity: newQty };
    }).filter(Boolean));
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountAmount = (() => {
    if (!discountValue) return 0;
    const val = parseFloat(discountValue) || 0;
    return discountType === 'percentage' ? (subtotal * val) / 100 : val;
  })();

  const total = Math.max(0, subtotal - discountAmount);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const orderData = {
        items: cart,
        subtotal,
        discount: discountAmount,
        total,
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
          minute: '2-digit',
        }),
      };
      await onComplete(orderData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 1500);
    } catch (err) {
      alert('Ошибка: ' + (err?.message || 'Неизвестная ошибка'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <p className="text-xl font-bold text-gray-900">Заказ оформлен!</p>
        <p className="text-sm text-gray-400 mt-1">{total.toLocaleString('ru-RU')} ₽</p>
      </div>
    );
  }

  const payments = [
    { id: 'cash', label: 'Наличные' },
    { id: 'transfer', label: 'Перевод' },
    { id: 'prepaid', label: 'Предоплата' },
  ];

  return (
    <div className="fixed inset-0 bg-[#F7F8FA] z-50 flex flex-col">
      {/* Header */}
      <header className="bg-white px-5 pt-3 pb-3 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={22} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Корзина</h1>
        <span className="text-sm text-gray-400 ml-auto">{cart.length} {cart.length === 1 ? 'товар' : 'товаров'}</span>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">Корзина пуста</p>
          </div>
        ) : (
          <>
            {/* Items */}
            {cart.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.price.toLocaleString('ru-RU')} ₽ за шт</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-gray-50 rounded-xl">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-xl active:bg-gray-200 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-xl active:bg-gray-200 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <p className="text-base font-bold text-gray-900">
                    {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
            ))}

            {/* Discount */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3">Скидка</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setDiscountType(discountType === 'percentage' ? 'fixed' : 'percentage')}
                  className={`px-4 py-3 rounded-xl flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    discountType === 'percentage'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {discountType === 'percentage' ? <Percent size={16} /> : <RussianRuble size={16} />}
                  {discountType === 'percentage' ? '%' : '₽'}
                </button>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-3">Способ оплаты</p>
              <div className="grid grid-cols-3 gap-2">
                {payments.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPaymentMethod(p.id)}
                    className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all ${
                      paymentMethod === p.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 active:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {cart.length > 0 && (
        <div className="bg-white border-t border-gray-100 px-5 pt-3 pb-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>Подитог: {subtotal.toLocaleString('ru-RU')} ₽</span>
              {discountAmount > 0 && (
                <span className="text-green-500">−{discountAmount.toLocaleString('ru-RU')} ₽</span>
              )}
            </div>
            <div className="text-base font-bold text-gray-900">
              {total.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || cart.length === 0}
            className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-lg tracking-wide shadow-lg shadow-green-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {submitting ? 'Оформление...' : 'ПРОДАТЬ'}
          </button>
        </div>
      )}
    </div>
  );
}
