import React, { useState, useEffect } from 'react';
import { getStocks, getWarehouses } from '../lib/pocketbase';

export default function Price() {
  const [stocks, setStocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadStocks();
  }, [selectedWarehouse]);

  const loadWarehouses = async () => {
    try {
      const data = await getWarehouses();
      setWarehouses(data);
      if (data.length > 0) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const loadStocks = async () => {
    try {
      setLoading(true);
      const data = await getStocks(selectedWarehouse || null);
      setStocks(data);
    } catch (error) {
      console.error('Error loading stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h1 className="text-xl font-semibold">Прайс-лист</h1>
      </div>

      <div className="screen-content">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-500">Загрузка...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Warehouse Filter */}
            <div className="p-4 pb-0">
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="select-field"
              >
                <option value="">Все склады</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price List */}
            <div className="p-4">
              {stocks.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Товары не найдены</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stocks.map(stock => (
                    <div key={stock.id} className="list-item">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {stock.product?.name || 'Товар не найден'}
                          </h3>
                          {stock.product?.article && (
                            <p className="text-sm text-gray-500 mt-1">Арт. {stock.product.article}</p>
                          )}
                          {stock.product?.barcode && (
                            <p className="text-xs text-gray-400 mt-1">ШК {stock.product.barcode}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {stock.product?.price ? `${stock.product.price.toLocaleString('ru-RU')} ₽` : '—'}
                          </p>
                          {stock.product?.cost && stock.product.cost !== stock.product.price && (
                            <p className="text-sm text-gray-500">
                              Закупка: {stock.product.cost.toLocaleString('ru-RU')} ₽
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            Остаток: {stock.quantity || 0} шт
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {stocks.length > 0 && (
              <div className="px-4 pb-4">
                <div className="card p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Всего товаров: {stocks.length}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      Общая сумма: {stocks.reduce((sum, stock) => 
                      sum + ((stock.product?.price || 0) * stock.quantity), 0
                      ).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
