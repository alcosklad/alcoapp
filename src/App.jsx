import React, { useState, useEffect } from 'react';
// Mobile components
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Reception from './components/Reception';
import Stock from './components/Stock';
import PriceList from './components/PriceList';
import AuthScreen from './components/AuthScreen';
// Worker mobile (new)
import WorkerApp from './components/worker/WorkerApp';
import WorkerLogin from './components/worker/WorkerLogin';
// Desktop components
import DesktopLayout from './layouts/DesktopLayout';
import DashboardDesktop from './components/desktop/DashboardDesktop';
import StockDesktop from './components/desktop/StockDesktop';
import PriceListDesktop from './components/desktop/PriceListDesktop';
import ReceptionDesktop from './components/desktop/ReceptionDesktop';
import SalesDesktop from './components/desktop/SalesDesktop';
import ShiftsDesktop from './components/desktop/ShiftsDesktop';
import SettingsDesktop from './components/desktop/SettingsDesktop';
import pb from './lib/pocketbase';
import { clearAll as clearCache } from './lib/cache';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем авторизацию при загрузке
    if (pb.authStore.isValid) {
      setUser(pb.authStore.model);
      // Если воркер, показываем остатки по умолчанию
      if (pb.authStore.model?.role === 'worker' || pb.authStore.model?.role === 'operator') {
        setActiveTab('stock');
      }
    }
    setLoading(false);
  }, []);

  const handleAuth = (userData) => {
    setUser(userData);
    // Если воркер или оператор, показываем остатки
    if (userData?.role === 'worker' || userData?.role === 'operator') {
      setActiveTab('stock');
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    clearCache();
    try { localStorage.removeItem('ns_worker_cart'); } catch {}
    setUser(null);
    setActiveTab('dashboard');
  };

  // While checking auth, return null — the HTML splash screen is still visible
  if (loading) return null;

  // Показываем экран авторизации если пользователь не вошел
  if (!user) {
    return <WorkerLogin onAuth={handleAuth} />;
  }

  const isWorker = user?.role === 'worker';
  const isDesktopUser = user?.role === 'admin' || user?.role === 'operator';

  // Desktop версия для админа и оператора
  if (isDesktopUser) {
    return (
      <DesktopLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
      >
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
          <DashboardDesktop user={user} />
        </div>
        <div style={{ display: activeTab === 'reception' ? 'block' : 'none' }}>
          <ReceptionDesktop />
        </div>
        <div style={{ display: activeTab === 'stock' ? 'block' : 'none' }}>
          <StockDesktop />
        </div>
        <div style={{ display: activeTab === 'pricelist' ? 'block' : 'none' }}>
          <PriceListDesktop />
        </div>
        <div style={{ display: activeTab === 'sales' ? 'block' : 'none' }}>
          <SalesDesktop />
        </div>
        <div style={{ display: activeTab === 'shifts' ? 'block' : 'none' }}>
          <ShiftsDesktop />
        </div>
        <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>
          <SettingsDesktop onLogout={handleLogout} />
        </div>
      </DesktopLayout>
    );
  }

  // Worker — полностью новый мобильный UI
  if (isWorker) {
    return <WorkerApp user={user} onLogout={handleLogout} />;
  }

  // Mobile версия для остальных ролей (admin/operator на мобиле — fallback)
  const renderMobileContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} onLogout={handleLogout} />;
      case 'reception':
        return <Reception onNavigate={setActiveTab} />;
      case 'stock':
        return <Stock />;
      case 'pricelist':
        return <PriceList />;
      default:
        return <Dashboard user={user} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="relative">
      {renderMobileContent()}
      {!loading && user && (
        <Navigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          userRole={user?.role}
        />
      )}
    </div>
  );
}

function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
