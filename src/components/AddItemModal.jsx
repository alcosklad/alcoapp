import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { getProducts } from '../lib/pocketbase';

export default function AddItemModal({ isOpen, onClose, onAdd }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [cost, setCost] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 0) {
      searchProducts();
    } else {
      setProducts([]);
    }
  }, [searchQuery]);

  const searchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts(searchQuery);
      setProducts(data);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setCost(product.cost || '');
    setSearchQuery('');
    setProducts([]);
  };

  const handleAdd = () => {
    if (!selectedProduct || !quantity || !cost) return;
    
    onAdd({
      product: selectedProduct,
      quantity: parseInt(quantity),
      cost: parseFloat(cost)
    });
    
    // Reset form
    setSelectedProduct(null);
    setQuantity('1');
    setCost('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Добавить товар</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedProduct ? (
            // Search
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию или артикулу"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              {loading && (
                <div className="mt-4 text-center text-gray-500">
                  Поиск...
                </div>
              )}

              {!loading && products.length > 0 && (
                <div className="mt-4 space-y-2">
                  {products.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{product.name}</div>
                      {product.article && (
                        <div className="text-sm text-gray-500">Арт. {product.article}</div>
                      )}
                      {product.price && (
                        <div className="text-sm text-blue-600">Цена: {product.price}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Selected Product
            <div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                    {selectedProduct.article && (
                      <p className="text-sm text-gray-500 mt-1">Арт. {selectedProduct.article}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Цена закупа (₽)
                  </label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    Сумма: {(quantity * cost).toLocaleString('ru-RU')}                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedProduct && (
          <div className="p-4 border-t">
            <button
              onClick={handleAdd}
              disabled={!quantity || !cost}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Добавить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
