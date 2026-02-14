import React, { useState, useEffect, useCallback } from 'react';
import { Package, Clock, History, LogOut } from 'lucide-react';
import pb from '../../lib/pocketbase';
import WorkerStock from './WorkerStock';
import WorkerShift from './WorkerShift';
import WorkerOrders from './WorkerOrders';

export default function WorkerApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('stock');
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('ns_worker_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist cart to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('ns_worker_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);
  const [historyCloseTrigger, setHistoryCloseTrigger] = useState(0);

  const handleTabClick = (tabId) => {
    if (tabId === activeTab && tabId === 'history') {
      setHistoryCloseTrigger(prev => prev + 1);
    }
    // Always reset body scroll when switching tabs
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    setActiveTab(tabId);
  };

  const tabs = [
    { id: 'stock', label: 'Остатки', icon: Package },
    { id: 'shift', label: 'Смена', icon: Clock },
    { id: 'history', label: 'История', icon: History },
  ];


  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Header */}
      {!cartOpen && <header className="bg-white px-5 pt-3 pb-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {tabs.find(t => t.id === activeTab)?.label || 'Остатки'}
          </h1>
          <p className="text-xs text-gray-400">{user?.name || 'Курьер'}</p>
        </div>
        <button
          onClick={onLogout}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          title="Выйти"
        >
          <LogOut size={20} />
        </button>
      </header>}

      {/* Content — all tabs stay mounted, hidden via CSS to avoid remounts */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div style={{ display: activeTab === 'stock' ? 'block' : 'none' }}>
          <WorkerStock user={user} onCartOpen={setCartOpen} cart={cart} setCart={setCart} />
        </div>
        <div style={{ display: activeTab === 'shift' ? 'block' : 'none' }}>
          <WorkerShift user={user} />
        </div>
        <div style={{ display: activeTab === 'history' ? 'block' : 'none' }}>
          <WorkerOrders user={user} closeTrigger={historyCloseTrigger} />
        </div>
      </main>

      {/* Bottom Tab Bar */}
      {!cartOpen && <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around py-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-400 active:text-gray-600'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>}
    </div>
  );
}
