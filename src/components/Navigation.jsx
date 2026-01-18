import React from 'react';

export default function Navigation({ activeTab, onTabChange, userRole }) {
  // Все вкладки
  const allTabs = [
    { id: 'dashboard', label: 'Главная', icon: '🏠', roles: ['admin', 'operator'] },
    { id: 'reception', label: 'Приемка', icon: '📦', roles: ['admin'] },
    { id: 'stock', label: 'Остатки', icon: '📊', roles: ['admin', 'operator'] },
    { id: 'pricelist', label: 'Прайс', icon: '📋', roles: ['admin', 'operator'] },
  ];

  // Фильтруем вкладки по роли пользователя
  // Если роль undefined, показываем все (fallback)
  const tabs = userRole 
    ? allTabs.filter(tab => tab.roles.includes(userRole))
    : allTabs;

  // Добавляем отладку
  console.log('Navigation: userRole =', userRole);
  console.log('Navigation: tabs =', tabs.map(t => t.label));

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-xl mb-1">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
