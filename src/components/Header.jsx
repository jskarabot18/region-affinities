import { useData } from '../lib/dataContext.jsx';

export default function Header({ tabs, activeTab, onTabChange }) {
  const { metadata } = useData();

  return (
    <header className="border-b border-parchment-edge bg-parchment-warm">
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-3">
        <div className="flex items-baseline gap-4 mb-1">
          <p className="small-caps text-wine">A Tool of The Soul of Wine</p>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif italic mb-2">
          Region <span className="not-italic font-semibold">Affinities</span>
        </h1>
        <p className="text-ink-muted text-base md:text-lg max-w-2xl leading-relaxed">
          Kinship in identity, kinship in terroir, and where they part ways.
          {metadata?.n_regions != null && (
            <span className="text-ink-subtle">
              {' '}· {metadata.n_regions} regions across two independent classification systems.
            </span>
          )}
        </p>
      </div>

      <nav className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => onTabChange(t.id)}
            className={`nav-link ${activeTab === t.id ? 'nav-link-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
