import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import WorkerSidebar from './components/WorkerSidebar';
import Dashboard from './components/Dashboard';
import Reception from './components/Reception';
import Stock from './components/Stock';
import PriceList from './components/PriceList';
import WorkerShift from './components/WorkerShift';
import WorkerHistory from './components/WorkerHistory';
import AuthScreen from './components/AuthScreen';
import pb from './lib/pocketbase';

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

  const renderContent = () => {
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
        return <WorkerShift />;
      case 'history':
        return <WorkerHistory />;
      default:
        return <Dashboard user={user} onLogout={handleLogout} />;
    }
  };

  // Показываем экран авторизации если пользователь не вошел
  if (!loading && !user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  const isWorker = user?.role === 'worker';

  return (
    <div className="relative">
      {renderContent()}
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

export default App;
