import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Reception from './components/Reception';
import Stock from './components/Stock';
import PriceList from './components/PriceList';
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
    }
    setLoading(false);
  }, []);

  const handleAuth = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
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
      default:
        return <Dashboard user={user} onLogout={handleLogout} />;
    }
  };

  // Показываем экран авторизации если пользователь не вошел
  if (!loading && !user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  return (
    <div className="relative">
      {renderContent()}
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

export default App;
