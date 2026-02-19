import React, { useState, useEffect } from 'react';
import { X, Plus, MapPin, Building } from 'lucide-react';
import { getSuppliers, getWarehouses } from '../lib/pocketbase';

export default function CreateReceptionModal({ isOpen, onClose, onContinue }) {
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [suppliersData, warehousesData] = await Promise.all([
        getSuppliers().catch(err => {
          console.error('Ошибка загрузки suppliers:', err);
          return [];
        }),
        getWarehouses().catch(err => {
          console.error('Ошибка загрузки warehouses:', err);
          return [];
        })
      ]);
      
      setSuppliers(suppliersData || []);
      setWarehouses(warehousesData || []);
      
      if (suppliersData && suppliersData.length > 0) {
        setSelectedSupplier(suppliersData[0].id);
      }
      if (warehousesData && warehousesData.length > 0) {
        setSelectedWarehouse(warehousesData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedSupplier || !selectedWarehouse) {
      setError('Выберите город и магазин');
      return;
    }
    
    onContinue({
      supplier: selectedSupplier,
      warehouse: selectedWarehouse
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end">
        <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Создать приемку</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="px-4 py-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Город */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <MapPin size={18} className="text-gray-400" />
                    Город
                  </label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  >
                    <option value="">Выберите город</option>
                    {(suppliers || []).map(supplier => (
                      <option key={supplier?.id || Math.random()} value={supplier?.id}>
                        {supplier?.name || 'Неизвестный город'}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Магазин */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <Building size={18} className="text-gray-400" />
                    Магазин
                  </label>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  >
                    <option value="">Выберите магазин</option>
                    {(warehouses || []).map(warehouse => (
                      <option key={warehouse?.id || Math.random()} value={warehouse?.id}>
                        {warehouse?.name || 'Неизвестный магазин'}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Ошибка */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer с FAB */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4">
            <button
              onClick={handleContinue}
              disabled={loading || !selectedSupplier || !selectedWarehouse}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Добавить товар
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
