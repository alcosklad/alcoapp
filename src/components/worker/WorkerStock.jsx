import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Package, AlertTriangle, ShoppingCart, Plus, Check, Clock, RefreshCw } from 'lucide-react';
import { getStocksWithDetails, getSuppliers, updateStock, createOrder, getActiveShift, startShift } from '../../lib/pocketbase';
import pb from '../../lib/pocketbase';
import { getOrFetch, invalidate } from '../../lib/cache';
import WorkerCart from './WorkerCart';
import { sellProductFIFO } from '../../lib/fifo';
import { generateOrderNumber } from '../../lib/orderNumbers';

export default function WorkerStock({ user, onCartOpen, cart, setCart }) {
  const [stocks, setStocks] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [addedId, setAddedId] = useState(null); // for animation
  const [shiftToast, setShiftToast] = useState(false);

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
      const data = await getOrFetch('suppliers', () => getSuppliers().catch(() => []), 300000);
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

  const loadStocks = async (forceRefresh = false) => {
    if (!selectedSupplier) return;
    try {
      if (forceRefresh) invalidate('stocks');
      const cacheKey = 'stocks:' + selectedSupplier;
      const data = await getOrFetch(
        cacheKey,
        () => getStocksWithDetails(selectedSupplier).catch(() => []),
        60000,
        (freshData) => { setStocks(freshData || []); setLoading(false); }
      );
      setStocks(data || []);
    } catch (e) {
      console.error('Error loading stocks:', e);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate batches by product (FIFO creates multiple stock records per product)
  const aggregatedStocks = useMemo(() => {
    const grouped = {};
    stocks.forEach(stock => {
      const productId = stock.product || stock?.expand?.product?.id;
      if (!productId) return;
      if (!grouped[productId]) {
        grouped[productId] = {
          ...stock,
          quantity: 0,
          _batchIds: []
        };
      }
      grouped[productId].quantity += stock.quantity || 0;
      grouped[productId]._batchIds.push(stock.id);
      // Keep the expand with product data
      if (stock.expand?.product && !grouped[productId].expand?.product) {
        grouped[productId].expand = { ...grouped[productId].expand, product: stock.expand.product };
      }
    });
    return Object.values(grouped);
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return aggregatedStocks;
    const q = searchQuery.toLowerCase();
    return aggregatedStocks.filter(s => {
      const name = s?.expand?.product?.name || s?.product?.name || '';
      const article = s?.expand?.product?.article || s?.product?.article || '';
      return name.toLowerCase().includes(q) || article.toLowerCase().includes(q);
    });
  }, [aggregatedStocks, searchQuery]);

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
        setShiftToast(true);
        setTimeout(() => setShiftToast(false), 3000);
      }

      // Get user's city for order number generation
      // Normalize supplier ID — relation field may be string ID or expanded object
      const _rawSupplier = pb.authStore.model?.supplier;
      const userSupplierId = (typeof _rawSupplier === 'string' ? _rawSupplier : _rawSupplier?.id) || selectedSupplier;
      let userCityObj = suppliers.find(s => s.id === userSupplierId);
      if (!userCityObj && userSupplierId) {
        // Fallback: fetch directly from PocketBase
        userCityObj = await pb.collection('suppliers').getOne(userSupplierId).catch(() => null);
      }
      const userCity = userCityObj?.name || pb.authStore.model?.city || '';
      
      // Generate order number
      const orderNumber = await generateOrderNumber(userCity);
      
      // Process each item with FIFO logic
      const itemsWithCost = [];
      let totalCost = 0;
      
      for (const item of orderData.items) {
        const stock = stocks.find(s => s.id === item.id);
        if (!stock) continue;
        
        const supplierId = stock.supplier?.id || stock.supplier || stock.expand?.supplier?.id;
        const productId = item.productId;
        
        // Use FIFO to sell product and get cost
        const result = await sellProductFIFO(productId, supplierId, item.quantity);
        
        if (!result.success) {
          throw new Error(result.error || 'Ошибка продажи товара');
        }
        
        // Calculate cost from FIFO result
        const itemCost = result.soldItems.reduce((sum, sold) => sum + (sold.cost * sold.quantity), 0) / item.quantity;
        const itemCostTotal = itemCost * item.quantity;
        totalCost += itemCostTotal;
        
        itemsWithCost.push({
          ...item,
          cost: itemCost,
          cost_subtotal: itemCostTotal,
          subtotal: item.price * item.quantity,
          profit: (item.price * item.quantity) - itemCostTotal,
          batch_number: result.soldItems.map(s => s.batchNumber).join(', ')
        });
      }
      
      // Create order with FIFO cost data
      const enrichedOrderData = {
        ...orderData,
        items: itemsWithCost,
        order_number: orderNumber,
        city: userCity,
        supplier: userSupplierId,
        city_code: orderNumber.charAt(0),
        cost_total: totalCost,
        profit: orderData.total - totalCost
      };
      
      await createOrder(enrichedOrderData);

      setCart([]);
      try { localStorage.removeItem('ns_worker_cart'); } catch {}
      invalidate('stocks');
      invalidate('orders');
      invalidate('shifts');
      invalidate('dashboard');
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
      {/* Stats line */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span className="font-medium">Всего: <span className="text-gray-700 font-bold">{totalQuantity} шт</span></span>
          <span>·</span>
          <span className="font-medium">Наименований: <span className="text-gray-700 font-bold">{filteredStocks.length}</span></span>
        </div>
        <button
          onClick={() => loadStocks(true)}
          disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 rounded-xl text-gray-500 active:bg-blue-50 active:text-blue-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span className="text-[11px] font-medium">Обновить</span>
        </button>
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

            const remaining = inCart ? qty - inCart.quantity : qty;

            return (
              <div
                key={stock.id}
                onClick={() => !isOut && addToCart(stock)}
                className={`bg-white rounded-2xl p-4 shadow-sm transition-all ${
                  isOut ? 'opacity-40' : 'active:scale-[0.98] cursor-pointer'
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
                        isOut || remaining <= 0
                          ? 'bg-gray-100 text-gray-400'
                          : remaining <= 3
                          ? 'bg-red-50 text-red-500'
                          : 'bg-green-50 text-green-600'
                      }`}>
                        {remaining} шт
                      </span>
                    </div>
                  </div>
                  {!isOut && (
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(stock); }}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all font-bold text-sm ${
                          inCart
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 text-blue-600 active:bg-blue-100 active:scale-95'
                        }`}
                      >
                        {inCart ? inCart.quantity : <Plus size={20} />}
                      </button>
                      {inCart && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCart(prev => {
                              const existing = prev.find(c => c.id === stock.id);
                              if (!existing) return prev;
                              if (existing.quantity <= 1) return prev.filter(c => c.id !== stock.id);
                              return prev.map(c => c.id === stock.id ? { ...c, quantity: c.quantity - 1 } : c);
                            });
                          }}
                          className="w-7 h-5 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center active:bg-red-50 active:text-red-500 transition-colors text-xs font-bold"
                        >
                          −
                        </button>
                      )}
                    </div>
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

      {/* Shift auto-start toast */}
      {shiftToast && (
        <div className="fixed bottom-24 left-4 right-4 z-[999] animate-slide-up">
          <div className="bg-green-500/80 backdrop-blur-sm text-white rounded-2xl px-4 py-2.5 shadow-md flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Check size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold">Смена открыта</p>
              <p className="text-[11px] text-green-100">Автоматически при первой продаже</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.35s ease-out; }
      `}</style>
    </div>
  );
}
