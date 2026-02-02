import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  FileText, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import pb from '../lib/pocketbase';

export default function DesktopLayout({ children, activeTab, onTabChange, user, onLogout }) {
  const [collapsed, setCollapsed] = React.useState(false);
  
  const userRole = user?.role;

  // Меню для админа
  const adminMenu = [
    { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
    { id: 'reception', label: 'Приёмки', icon: Package },
    { id: 'stock', label: 'Остатки', icon: Warehouse },
    { id: 'pricelist', label: 'Прайс-лист', icon: FileText },
  ];

  // Меню для оператора (без приёмок)
  const operatorMenu = [
    { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
    { id: 'stock', label: 'Остатки', icon: Warehouse },
    { id: 'pricelist', label: 'Прайс-лист', icon: FileText },
  ];

  const menu = userRole === 'admin' ? adminMenu : operatorMenu;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside 
        className={`${collapsed ? 'w-16' : 'w-56'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
          {!collapsed && (
            <span className="font-semibold text-gray-800 text-lg">Наш Склад</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 py-2">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-gray-200 p-3">
          {!collapsed && (
            <div className="mb-2 px-1">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'Пользователь'}</p>
              <p className="text-xs text-gray-500">
                {userRole === 'admin' ? 'Администратор' : 'Оператор'}
              </p>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} />
            {!collapsed && <span>Выйти</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-lg font-medium text-gray-800">
            {menu.find(m => m.id === activeTab)?.label || 'Главная'}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('ru-RU', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {children}
        </div>
      </main>
    </div>
  );
}
