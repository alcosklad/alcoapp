import React, { useState } from 'react';
import ReceptionList from './ReceptionList';
import ReceptionCreate from './ReceptionCreate';
import CreateReceptionScreen from './CreateReceptionScreen';
import ProductSelectorModal from './ProductSelectorModal';
import { Plus } from 'lucide-react';

export default function Reception({ onNavigate }) {
  const [view, setView] = useState('list'); // 'list', 'create', 'createScreen', 'select'
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [tempItems, setTempItems] = useState([]);
  const [receptionData, setReceptionData] = useState({});

  const handleCreateSuccess = () => {
    console.log('🎯 handleCreateSuccess вызван - переход на список приемок');
    setView('list');
    setReceptionData({});
    // Переключаем navigation bar на раздел Приемка
    if (onNavigate) {
      console.log('🚀 Вызываем onNavigate("reception")');
      onNavigate('reception');
    } else {
      console.log('❌ onNavigate не передан!');
    }
  };

  const handleQuickAdd = (items) => {
    setTempItems(items);
    setView('create');
  };

  const handleCreateContinue = (data) => {
    console.log('handleCreateContinue получен:', data);
    setReceptionData(data);
    setView('create');
    setTempItems(data.items || []);
    console.log('Установлены tempItems:', data.items);
  };

  const handleAddItem = (item) => {
    setTempItems(prev => [...prev, item]);
  };

  if (view === 'create') {
    return (
      <ReceptionCreate
        onBack={() => {
          setView('list');
          setReceptionData({});
        }}
        onSuccess={handleCreateSuccess}
        initialItems={tempItems}
        initialData={receptionData}
      />
    );
  }

  if (view === 'createScreen') {
    return (
      <CreateReceptionScreen
        onBack={() => setView('list')}
        onContinue={handleCreateContinue}
      />
    );
  }

  return (
    <>
      <ReceptionList
        onCreate={() => setView('createScreen')}
      />
      
      {/* Модал выбора товаров */}
      <ProductSelectorModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        onAdd={handleAddItem}
      />

      {/* FAB для быстрого создания приемки */}
      <button
        onClick={() => setView('createScreen')}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
      >
        <Plus size={24} />
      </button>
    </>
  );
}
