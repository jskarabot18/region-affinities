import { useState, useRef, useEffect } from 'react';
import { useData } from '../lib/dataContext.jsx';

// ---------------------------------------------------------------------------
// Header — Vinotheca-family banner.
//
// Top strip mirrors TasteRank Explorer:
//   left:  product wordmark in wine-red serif
//   right: VINOTHECA · DOCUMENTATION ▼ (dropdown of 6 PDFs)
//
// Below the strip, the Region Affinities title block + tab nav are preserved.
//
// Documentation menu: six documents, organised in two groups.
//   1. Summary — plain-language overview (replaces "The Map and the Soul")
//   2. Technical Appendix — mathematical framework, algorithms, implementation
//   3. Methods Primer — guide to the statistical and network methods
//   4. Data Appendix — D-score matrix, cluster membership, SME change log,
//      pipeline parameters
//   5. Region Reference — Identity (Layer 1)  [shared with Region Resonances]
//   6. Region Reference — Terroir (Layer 2)
//
// PDF link convention: always append #page=1 so the browser forces page 1
// instead of remembering the user's last scroll position from a prior visit.
// Local PDFs live in public/docs/ and are served at <BASE>docs/* by Vite.
// We prefix with import.meta.env.BASE_URL so the same code works both in
// local dev (BASE_URL = '/') and on GitHub Pages (BASE_URL = '/region-affinities/').
// ---------------------------------------------------------------------------

const SOUL_OF_WINE_BASE = 'https://jskarabot18.github.io/soul-of-wine';
const BASE = import.meta.env.BASE_URL;

// Region Affinities ships its own 4-document set, plus the two shared Region
// Reference PDFs (Identity, Terroir) hosted in the soul-of-wine repo.
const DOCS = [
  { label: 'Summary',                       href: `${BASE}docs/RegionAffinities_Summary.pdf#page=1` },
  { label: 'Technical Appendix',            href: `${BASE}docs/RegionAffinities_Technical_Appendix.pdf#page=1` },
  { label: 'Methods Primer',                href: `${BASE}docs/RegionAffinities_Methods_Primer.pdf#page=1` },
  { label: 'Data Appendix',                 href: `${BASE}docs/RegionAffinities_Data_Appendix.pdf#page=1` },
  { label: 'Region Reference — Identity',   href: `${SOUL_OF_WINE_BASE}/docs/layer1-descriptions.pdf#page=1` },
  { label: 'Region Reference — Terroir',    href: `${SOUL_OF_WINE_BASE}/docs/layer2-descriptions.pdf#page=1` },
];

export default function Header({ tabs, activeTab, onTabChange }) {
  const { metadata } = useData();

  return (
    <header>
      <TopStrip />

      <div className="bg-parchment-warm border-b border-parchment-edge">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-3">
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
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// TopStrip — wordmark + Vinotheca link + Documentation dropdown
// ---------------------------------------------------------------------------

function TopStrip() {
  return (
    <div className="bg-parchment border-b border-parchment-edge">
      <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
        <span className="font-serif italic text-lg text-wine tracking-tight">
          Region Affinities
        </span>

        <div className="flex items-center gap-1 text-xs font-sans">
          {/* Vinotheca is parent navigation — use same tab, not a new one */}
          <a
            href="https://jskarabot18.github.io/vinotheca/"
            className="px-3 py-2 uppercase tracking-widest text-ink-muted hover:text-wine transition-colors"
          >
            Vinotheca
          </a>
          <span className="text-ink-subtle">·</span>
          <DocumentationDropdown />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentationDropdown — opens on click, closes on outside click / Escape
// ---------------------------------------------------------------------------

function DocumentationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="px-3 py-2 uppercase tracking-widest text-ink-muted hover:text-wine
                   transition-colors flex items-center gap-1.5"
      >
        Documentation
        <svg viewBox="0 0 10 6" className="w-2.5 h-1.5" fill="currentColor" aria-hidden="true">
          <path d="M0 0 L5 6 L10 0 Z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-72 bg-parchment border border-parchment-edge
                     rounded-md shadow-lg z-50 overflow-hidden"
        >
          {DOCS.map((doc) => (
            <a
              key={doc.label}
              href={doc.href}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-serif text-ink hover:bg-parchment-warm
                         hover:text-wine border-b border-parchment-edge last:border-b-0
                         normal-case tracking-normal"
            >
              {doc.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
