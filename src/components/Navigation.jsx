import React from 'react';
import { LayoutDashboard, Package, Warehouse, FileText } from 'lucide-react';

export default function Navigation({ activeTab, onTabChange, userRole }) {
  // Все вкладки
  const allTabs = [
    { id: 'dashboard', label: 'Главная', Icon: LayoutDashboard, roles: ['admin', 'operator', 'worker'] },
    { id: 'reception', label: 'Приемка', Icon: Package, roles: ['admin'] },
    { id: 'stock', label: 'Остатки', Icon: Warehouse, roles: ['admin', 'operator', 'worker'] },
    { id: 'pricelist', label: 'Прайс', Icon: FileText, roles: ['admin', 'operator'] },
  ];

  // Фильтруем вкладки по роли пользователя
  // Если роль undefined, показываем базовые разделы (без Приемки)
  const tabs = userRole 
    ? allTabs.filter(tab => tab.roles.includes(userRole))
    : allTabs.filter(tab => tab.id !== 'reception');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {tabs.map(tab => {
          const TabIcon = tab.Icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TabIcon size={22} className="mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
