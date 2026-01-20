import React, { useState } from 'react';
import { X, Menu, Clock, History } from 'lucide-react';
import pb from '../lib/pocketbase';

export default function WorkerSidebar({ activeTab, onTabChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const user = pb.authStore.model;
  
  const menuItems = [
    {
      id: 'shift',
      label: 'Смена',
      icon: Clock,
      description: 'Информация о текущей смене'
    },
    {
      id: 'history',
      label: 'История',
      icon: History,
      description: 'История продаж'
    }
  ];

  const handleTabClick = (tabId) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Кнопка бургер */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-200"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Затемнение фона */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Боковое меню */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Хедер меню */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Меню</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Информация о пользователе */}
          <div className="text-sm">
            <p className="font-semibold">{user?.name || 'Worker'}</p>
            <p className="text-blue-100">{user?.email}</p>
            <p className="text-blue-200 text-xs mt-1">WORKER ROLE</p>
          </div>
        </div>

        {/* Пункты меню */}
        <div className="p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                  <div className="text-left">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Футер меню */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={() => {
              pb.authStore.clear();
              window.location.reload();
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </>
  );
}
