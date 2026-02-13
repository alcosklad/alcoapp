import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Package, AlertTriangle, ShoppingCart, Plus, Check } from 'lucide-react';
import { getStocksWithDetails, getSuppliers, updateStock, createOrder, getActiveShift, startShift } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';
import WorkerCart from './WorkerCart';

export default function WorkerStock({ user, onCartOpen }) {
  const [stocks, setStocks] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [addedId, setAddedId] = useState(null); // for animation

  const userSupplier = user?.supplier;
  const [noSupplier, setNoSupplier] = useState(false);

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
      if (userSupplier) {
        setSelectedSupplier(userSupplier);
      } else {
        // Пробуем получить supplier из актуальных данных юзера в PocketBase
        try {
          const freshUser = await pb.collection('users').getOne(pb.authStore.model?.id);
          if (freshUser?.supplier) {
            setSelectedSupplier(freshUser.supplier);
          } else if (data && data.length > 0) {
            // Нет привязки к городу — показать первый город, но предупредить
            setSelectedSupplier(data[0].id);
            setNoSupplier(true);
          } else {
            setLoading(false);
            setNoSupplier(true);
          }
        } catch (e) {
          if (data && data.length > 0) {
            setSelectedSupplier(data[0].id);
            setNoSupplier(true);
          } else {
            setLoading(false);
            setNoSupplier(true);
          }
        }
      }
    } catch (e) {
      console.error('Error loading suppliers:', e);
      setLoading(false);
    }
  };

  const loadStocks = async () => {
    if (!selectedSupplier) return;
    try {
      setLoading(true);
      const data = await getStocksWithDetails(selectedSupplier).catch(() => []);
      setStocks(data || []);
    } catch (e) {
      console.error('Error loading stocks:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stocks;
    const q = searchQuery.toLowerCase();
    return stocks.filter(s => {
      const name = s?.expand?.product?.name || s?.product?.name || '';
      const article = s?.expand?.product?.article || s?.product?.article || '';
      return name.toLowerCase().includes(q) || article.toLowerCase().includes(q);
    });
  }, [stocks, searchQuery]);

  const totalQuantity = filteredStocks.reduce((sum, s) => sum + (s?.quantity || 0), 0);
  const lowStockCount = filteredStocks.filter(s => (s?.quantity || 0) > 0 && (s?.quantity || 0) <= 3).length;

  // Cart logic
  const addToCart = useCallback((stock) => {
    const product = stock?.expand?.product || stock?.product || {};
    const qty = stock?.quantity || 0;
    if (qty <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === stock.id);
      if (existing) {
        if (existing.quantity >= qty) return prev;
        return prev.map(item =>
          item.id === stock.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        id: stock.id,
        productId: stock.product || product.id,
        name: product.name || 'Товар',
        price: product.price || 0,
        quantity: 1,
        maxQuantity: qty,
      }];
    });

    // Show check animation
    setAddedId(stock.id);
    setTimeout(() => setAddedId(null), 800);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCompleteOrder = async (orderData) => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;

      // Ensure shift
      const activeShift = await getActiveShift(userId);
      if (!activeShift) {
        await startShift(userId, new Date().toISOString());
      }

      await createOrder(orderData);

      // Update stock for each item
      for (const item of orderData.items) {
        const stock = stocks.find(s => s.id === item.id);
        if (stock) {
          const supplierId = stock.supplier?.id || stock.supplier || stock.expand?.supplier?.id;
          await updateStock(item.productId, null, -item.quantity, supplierId);
        }
      }

      setCart([]);
      setShowCart(false);
      onCartOpen?.(false);
      loadStocks();
    } catch (error) {
      console.error('Order error:', error);
      throw error;
    }
  };

  if (showCart) {
    return (
      <WorkerCart
        cart={cart}
        setCart={setCart}
        onBack={() => { setShowCart(false); onCartOpen?.(false); }}
        onComplete={handleCompleteOrder}
      />
    );
  }

  const currentCityName = suppliers.find(s => s.id === selectedSupplier)?.name || '';

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* City indicator */}
      {currentCityName && (
        <div className="bg-blue-50 rounded-2xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700">{currentCityName}</span>
          {noSupplier && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">Город не привязан</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">{totalQuantity}</p>
              <p className="text-xs text-gray-400 mt-0.5">Штук всего</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-red-500">{lowStockCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">Мало остаток</p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по названию..."
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm placeholder:text-gray-300"
        />
      </div>

      {/* Stock List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredStocks.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">Товары не найдены</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStocks.map(stock => {
            const product = stock?.expand?.product || stock?.product || {};
            const qty = stock?.quantity || 0;
            const price = product.price || 0;
            const isLow = qty > 0 && qty <= 3;
            const isOut = qty === 0;
            const isAdded = addedId === stock.id;
            const inCart = cart.find(c => c.id === stock.id);

            return (
              <div
                key={stock.id}
                className={`bg-white rounded-2xl p-4 shadow-sm transition-all ${
                  isOut ? 'opacity-40' : 'active:scale-[0.98]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                      {product.name || 'Товар'}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-sm font-medium text-gray-700">
                        {price.toLocaleString('ru-RU')} ₽
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                        isOut
                          ? 'bg-gray-100 text-gray-400'
                          : isLow
                          ? 'bg-red-50 text-red-500'
                          : 'bg-green-50 text-green-600'
                      }`}>
                        {qty} шт
                      </span>
                      {inCart && (
                        <span className="text-xs font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg">
                          в корзине: {inCart.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isOut && (
                    <button
                      onClick={() => addToCart(stock)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                        isAdded
                          ? 'bg-green-500 text-white scale-110'
                          : 'bg-blue-50 text-blue-600 active:bg-blue-100 active:scale-95'
                      }`}
                    >
                      {isAdded ? <Check size={20} strokeWidth={3} /> : <Plus size={20} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <button
            onClick={() => { setShowCart(true); onCartOpen?.(true); }}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 px-6 shadow-lg shadow-blue-600/30 flex items-center justify-between active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart size={18} />
              </div>
              <span className="font-semibold">Корзина</span>
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                {cartCount}
              </span>
            </div>
            <span className="font-bold text-lg">
              {cartTotal.toLocaleString('ru-RU')} ₽
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
