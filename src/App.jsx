import React, { useState } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Reception from './components/Reception';
import Stock from './components/Stock';
import PriceList from './components/PriceList';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'reception':
        return <Reception onNavigate={setActiveTab} />;
      case 'stock':
        return <Stock />;
      case 'pricelist':
        return <PriceList />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="relative">
      {renderContent()}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
