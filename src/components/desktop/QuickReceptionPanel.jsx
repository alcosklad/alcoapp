import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Star, ChevronRight, ChevronDown, Search } from 'lucide-react';
import { getProducts, getFavorites, addToFavorites, removeFromFavorites } from '../../lib/pocketbase';
import { getOrFetch } from '../../lib/cache';

export default function QuickReceptionPanel({ onItemsSelected, selectedSupplier }) {
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({ 'Избранное': true });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, favoritesData] = await Promise.all([
        getOrFetch('products:all', () => getProducts(), 120000),
        getOrFetch('favorites:all', () => getFavorites(), 60000)
      ]);
      setProducts(productsData || []);
      setFavorites(favoritesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Группировка товаров по категориям
  const categorizedProducts = useMemo(() => {
    const categories = {};
    
    products.forEach(product => {
      const category = Array.isArray(product.category) ? product.category[0] : product.category || 'Без категории';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(product);
    });

    // Сортируем товары в каждой категории
    Object.keys(categories).forEach(cat => {
      categories[cat].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });

    return categories;
  }, [products]);

  // Избранные товары
  const favoriteProducts = useMemo(() => {
    const favoriteIds = new Set(favorites.map(f => f.product));
    return products.filter(p => favoriteIds.has(p.id));
  }, [products, favorites]);

  // Фильтрация по поиску
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return categorizedProducts;
    
    const query = searchQuery.toLowerCase();
    const filtered = {};
    
    Object.entries(categorizedProducts).forEach(([category, items]) => {
      const matchingItems = items.filter(item => 
        (item.name || '').toLowerCase().includes(query)
      );
      if (matchingItems.length > 0) {
        filtered[category] = matchingItems;
      }
    });
    
    return filtered;
  }, [categorizedProducts, searchQuery]);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleQuantityChange = (productId, delta) => {
    setSelectedItems(prev => {
      const current = prev[productId] || { quantity: 0, cost: 0 };
      const newQuantity = Math.max(0, current.quantity + delta);
      
      if (newQuantity === 0) {
        const { [productId]: removed, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [productId]: { ...current, quantity: newQuantity }
      };
    });
  };

  const handleCostChange = (productId, cost) => {
    setSelectedItems(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { quantity: 1 }),
        cost: parseFloat(cost) || 0
      }
    }));
  };

  const toggleFavorite = async (productId) => {
    try {
      const isFav = favorites.some(f => f.product === productId);
      
      if (isFav) {
        await removeFromFavorites(productId);
        setFavorites(prev => prev.filter(f => f.product !== productId));
      } else {
        await addToFavorites(productId);
        const newFav = await getFavorites();
        setFavorites(newFav);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleCreateReception = () => {
    const items = Object.entries(selectedItems).map(([productId, data]) => {
      const product = products.find(p => p.id === productId);
      return {
        product: productId,
        name: product?.name || '',
        quantity: data.quantity,
        cost: data.cost || product?.cost || 0,
        sale_price: product?.price || 0
      };
    });
    
    onItemsSelected(items);
    setSelectedItems({});
  };

  const selectedCount = Object.keys(selectedItems).length;
  const totalQuantity = Object.values(selectedItems).reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Поиск */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск товара..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Основная панель */}
      <div className="grid grid-cols-[250px_1fr] divide-x max-h-[500px]">
        {/* Категории слева */}
        <div className="overflow-y-auto">
          {/* Избранное */}
          <div
            className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b"
            onClick={() => toggleCategory('Избранное')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium">Избранное</span>
              </div>
              {expandedCategories['Избранное'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          </div>

          {/* Остальные категории */}
          {Object.keys(filteredProducts).sort().map(category => (
            <div
              key={category}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{category}</span>
                {expandedCategories[category] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>
          ))}
        </div>

        {/* Товары справа */}
        <div className="overflow-y-auto">
          {/* Избранное */}
          {expandedCategories['Избранное'] && (
            <div className="p-4 space-y-2">
              {favoriteProducts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Нет избранных товаров. Добавьте товары в избранное, нажав на звездочку.
                </p>
              ) : (
                favoriteProducts.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    selectedItem={selectedItems[product.id]}
                    onQuantityChange={handleQuantityChange}
                    onCostChange={handleCostChange}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={true}
                    selectedSupplier={selectedSupplier}
                  />
                ))
              )}
            </div>
          )}

          {/* Остальные категории */}
          {Object.entries(filteredProducts).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
            expandedCategories[category] && (
              <div key={category} className="p-4 space-y-2">
                {items.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    selectedItem={selectedItems[product.id]}
                    onQuantityChange={handleQuantityChange}
                    onCostChange={handleCostChange}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favorites.some(f => f.product === product.id)}
                    selectedSupplier={selectedSupplier}
                  />
                ))}
              </div>
            )
          ))}
        </div>
      </div>

      {/* Выбранные товары внизу */}
      {selectedCount > 0 && (
        <div className="border-t p-4 bg-gray-50">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Выбрано товаров: {selectedCount} ({totalQuantity} шт)
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {Object.entries(selectedItems).map(([productId, data]) => {
                const product = products.find(p => p.id === productId);
                return (
                  <div key={productId} className="flex items-center gap-3 bg-white p-2 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product?.name || 'Товар'}</p>
                      <p className="text-xs text-gray-500">{data.quantity} шт</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={data.cost || ''}
                        onChange={(e) => handleCostChange(productId, e.target.value)}
                        placeholder="Цена закупа"
                        className="w-24 px-2 py-1 text-sm border rounded"
                      />
                      <span className="text-xs text-gray-400">₽</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleCreateReception}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Создать приемку
          </button>
        </div>
      )}
    </div>
  );
}

function ProductRow({ product, selectedItem, onQuantityChange, onCostChange, onToggleFavorite, isFavorite, selectedSupplier }) {
  const quantity = selectedItem?.quantity || 0;
  
  // Получаем текущий остаток товара в выбранном городе
  const currentStock = useMemo(() => {
    if (!selectedSupplier || !product.expand?.stocks) return 0;
    const stock = product.expand.stocks.find(s => s.supplier === selectedSupplier);
    return stock?.quantity || 0;
  }, [product, selectedSupplier]);

  return (
    <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group">
      {/* Избранное */}
      <button
        onClick={() => onToggleFavorite(product.id)}
        className="p-1 hover:bg-gray-100 rounded"
        title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      >
        <Star
          size={16}
          className={isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
        />
      </button>

      {/* Название */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
        <p className="text-xs text-gray-500">Остаток: {currentStock} шт</p>
      </div>

      {/* Количество */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onQuantityChange(product.id, -1)}
          disabled={quantity === 0}
          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus size={14} />
        </button>
        <span className="w-8 text-center text-sm font-medium">{quantity}</span>
        <button
          onClick={() => onQuantityChange(product.id, 1)}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
