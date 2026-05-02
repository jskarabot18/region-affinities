import { useState } from 'react';
import { DataProvider } from './lib/dataContext.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import DualNetworks from './components/DualNetworks.jsx';
import BipartiteFlow from './components/BipartiteFlow.jsx';
import RegionAtlas from './components/RegionAtlas.jsx';
import Comparison from './components/Comparison.jsx';

const TABS = [
  {
    id: 'networks',
    label: 'Dual Networks',
  },
  {
    id: 'flow',
    label: 'Identity ↔ Terroir',
  },
  {
    id: 'atlas',
    label: 'Region Atlas',
  },
  {
    id: 'compare',
    label: 'Comparison',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('networks');

  return (
    <DataProvider>
      <div className="min-h-screen flex flex-col bg-parchment">
        <Header tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1">
          {activeTab === 'networks' && <DualNetworks />}
          {activeTab === 'flow' && <BipartiteFlow />}
          {activeTab === 'atlas' && <RegionAtlas />}
          {activeTab === 'compare' && <Comparison />}
        </main>
        <Footer />
      </div>
    </DataProvider>
  );
}
