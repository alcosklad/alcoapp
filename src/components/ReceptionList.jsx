import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { getReceptions, updateReception, deleteReception } from '../lib/pocketbase';
import EditReceptionModal from './EditReceptionModal';
import pb from '../lib/pocketbase';

export default function ReceptionList({ onCreate }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReception, setSelectedReception] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await getReceptions().catch(err => {
        console.error('Error loading receptions:', err);
        return [];
      });
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReception = (reception) => {
    setSelectedReception(reception);
    setIsEditModalOpen(true);
  };

  const handleSaveReception = async (updatedReception) => {
    try {
      // Обновляем приемку
      await updateReception(updatedReception.id, updatedReception);
      
      // Перезагружаем список
      loadDocuments();
    } catch (error) {
      console.error('Error updating reception:', error);
      throw error;
    }
  };

  const handleDeleteReception = async (receptionId) => {
    try {
      // Сначала удаляем все остатки связанные с этой приемкой
      await deleteStocksForReception(receptionId);
      
      // Затем удаляем саму приемку
      await deleteReception(receptionId);
      loadDocuments();
    } catch (error) {
      console.error('Error deleting reception:', error);
      throw error;
    }
  };

  const deleteStocksForReception = async (receptionId) => {
    try {
      // Получаем информацию о приемке чтобы найти supplier и warehouse
      const reception = await pb.collection('receptions').getOne(receptionId);
      
      // Удаляем все остатки для этого поставщика и склада
      const stocks = await pb.collection('stocks').getFullList({
        filter: `supplier = "${reception.supplier}" && warehouse = "${reception.warehouse}"`
      });
      
      for (const stock of stocks) {
        await pb.collection('stocks').delete(stock.id);
      }
      
      console.log(`Удалено остатков: ${stocks.length}`);
    } catch (error) {
      console.error('Error deleting stocks:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">Приемка товаров</h1>
      </header>

      {/* Documents List */}
      <div className="px-4 py-4">
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Нет приемок</p>
            <button
              onClick={onCreate}
              className="mt-4 text-blue-600 font-medium"
            >
              Создать первую приемку
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {(documents || []).map(doc => (
              <div 
                key={doc?.id || Math.random()} 
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleEditReception(doc)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">
                      {(() => {
                        if (doc?.datetime) {
                          // Показываем дату и время из datetime
                          const dt = new Date(doc.datetime);
                          return dt.toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          });
                        } else {
                          // Если нет datetime, показываем только дату
                          return new Date(doc?.date || Date.now()).toLocaleDateString('ru-RU');
                        }
                      })()}
                    </p>
                    <p className="font-semibold text-gray-900 mt-1">
                      {doc?.expand?.supplier?.name || 'Город'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {doc?.expand?.warehouse?.name || 'Магазин'}
                    </p>
                    {/* Показываем количество товаров */}
                    {doc?.items && (
                      <p className="text-xs text-gray-400 mt-1">
                        Товаров: {Array.isArray(doc.items) ? doc.items.length : (doc.items ? JSON.parse(doc.items).length : 0)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {(() => {
                        // Сначала пробуем totalAmount, потом total_amount, потом считаем из items
                        if (doc?.totalAmount) {
                          return doc.totalAmount.toLocaleString('ru-RU');
                        } else if (doc?.total_amount) {
                          return doc.total_amount.toLocaleString('ru-RU');
                        } else if (doc?.items) {
                          // Считаем сумму из items
                          const items = Array.isArray(doc.items) ? doc.items : (doc.items ? JSON.parse(doc.items) : []);
                          const total = items.reduce((sum, item) => {
                            return sum + (item.quantity * (item.price || item.cost || 0));
                          }, 0);
                          return total.toLocaleString('ru-RU');
                        }
                        return '0';
                      })()}                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Модальное окно редактирования */}
      <EditReceptionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        reception={selectedReception}
        onSave={handleSaveReception}
        onDelete={handleDeleteReception}
      />
    </div>
  );
}
