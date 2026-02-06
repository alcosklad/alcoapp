import React, { useState, useEffect } from 'react';
// Mobile components
import Navigation from './components/Navigation';
import WorkerSidebar from './components/WorkerSidebar';
import Dashboard from './components/Dashboard';
import Reception from './components/Reception';
import Stock from './components/Stock';
import PriceList from './components/PriceList';
import ShiftScreen from './components/ShiftScreen';
import WorkerHistory from './components/WorkerHistory';
import AuthScreen from './components/AuthScreen';
// Desktop components
import DesktopLayout from './layouts/DesktopLayout';
import DashboardDesktop from './components/desktop/DashboardDesktop';
import StockDesktop from './components/desktop/StockDesktop';
import PriceListDesktop from './components/desktop/PriceListDesktop';
import ReceptionDesktop from './components/desktop/ReceptionDesktop';
import pb from './lib/pocketbase';
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
      if (pb.authStore.model?.role === 'worker') {
        setActiveTab('stock');
      }
    }
    setLoading(false);
  }, []);

  const handleAuth = (userData) => {
    setUser(userData);
    // Если воркер, показываем остатки
    if (userData?.role === 'worker') {
      setActiveTab('stock');
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
    setActiveTab('dashboard');
  };

  // Показываем экран авторизации если пользователь не вошел
  if (!loading && !user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  const isWorker = user?.role === 'worker';
  const isDesktopUser = user?.role === 'admin' || user?.role === 'operator';

  // Desktop версия для админа и оператора
  if (isDesktopUser) {
    const renderDesktopContent = () => {
      switch (activeTab) {
        case 'dashboard':
          return <DashboardDesktop user={user} />;
        case 'reception':
          return <ReceptionDesktop />;
        case 'stock':
          return <StockDesktop />;
        case 'pricelist':
          return <PriceListDesktop />;
        default:
          return <DashboardDesktop user={user} />;
      }
    };

    return (
      <DesktopLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
      >
        {renderDesktopContent()}
      </DesktopLayout>
    );
  }

  // Mobile версия для воркера (курьера)
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
      case 'shift':
        return <ShiftScreen />;
      case 'history':
        return <WorkerHistory />;
      default:
        return <Dashboard user={user} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="relative">
      {renderMobileContent()}
      {!loading && user && !isWorker && (
        <Navigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          userRole={user?.role}
        />
      )}
      {!loading && user && isWorker && (
        <WorkerSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
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
