import { useState } from 'react';
import { DataProvider } from './lib/dataContext.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import DualNetworks from './components/DualNetworks.jsx';
import BipartiteFlow from './components/BipartiteFlow.jsx';
import RegionAtlas from './components/RegionAtlas.jsx';

function Placeholder({ title, blurb }) {
  return (
    <div className="max-w-3xl mx-auto py-20 px-6 text-center">
      <p className="small-caps text-wine mb-3">Coming soon</p>
      <h2 className="text-3xl text-ink mb-4">{title}</h2>
      <p className="text-ink-muted leading-relaxed">{blurb}</p>
    </div>
  );
}

const TABS = [
  {
    id: 'networks',
    label: 'Dual Networks',
    blurb:
      'Side-by-side force-directed graphs of all 59 regions. Left: identity similarity. Right: terroir similarity. Hover any region to see how its kinship shifts between the two systems.',
  },
  {
    id: 'flow',
    label: 'Identity ↔ Terroir',
    blurb:
      'A bipartite chord linking identity clusters to terroir clusters. Sized by how many regions sit in each intersection. The tangle is the independence finding.',
  },
  {
    id: 'atlas',
    label: 'Region Atlas',
    blurb:
      'Pick any of the 59 regions to see its D-score radar, its identity kin, its terroir kin, and where the two diverge most sharply.',
  },
  {
    id: 'compare',
    label: 'Comparison',
    blurb:
      'Overlay 2 to 4 regions on a shared radar. Spot identity-twins that are terroir-strangers, and vice versa.',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('networks');
  const tab = TABS.find((t) => t.id === activeTab);

  return (
    <DataProvider>
      <div className="min-h-screen flex flex-col bg-parchment">
        <Header tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1">
          {activeTab === 'networks' && <DualNetworks />}
          {activeTab === 'flow' && <BipartiteFlow />}
          {activeTab === 'atlas' && <RegionAtlas />}
          {activeTab === 'compare' && <Placeholder title={tab.label} blurb={tab.blurb} />}
        </main>
        <Footer />
      </div>
    </DataProvider>
  );
}
