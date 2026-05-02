import { useMemo, useState, useEffect } from 'react';
import { useData } from '../lib/dataContext.jsx';
import { IDENTITY_COLORS, TERROIR_COLORS, WINE } from '../lib/colors.js';
import { DIMENSIONS, dscoreVector } from '../lib/dimensions.js';
import RadarChart from './RadarChart.jsx';

// ---------------------------------------------------------------------------
// Comparison — overlay 2 to 4 regions on a single D-score radar.
//
// A multi-select picker on the left, the overlay radar on the right, and a
// readout table below. A "Surprise me" button cycles through curated
// identity-twin / terroir-stranger pairs that surface the project's most
// rhetorically interesting cross-system findings.
// ---------------------------------------------------------------------------

const MAX_SELECTIONS = 4;

// Hand-picked comparison sets that tell distinct stories.
// Each entry: { regions, story }
const SURPRISE_SETS = [
  {
    regions: ['Sicily', 'Central Otago'],
    story: 'Identity twins, terroir strangers: same D-score profile across hemispheres.',
  },
  {
    regions: ['Bordeaux', 'Burgundy'],
    story: 'Two French canons, near-mirror identity profiles. Tradition and exteriority diverge.',
  },
  {
    regions: ['Mosel', 'Northern Rhône'],
    story: 'Two Old World Interior icons. Different country, different grape — overlapping shape.',
  },
  {
    regions: ['Goriška Brda', 'Santa Barbara'],
    story: "Slovenia and California — share the project's most balanced D-score profile.",
  },
  {
    regions: ['Napa Valley', 'Bordeaux', 'Mendoza'],
    story: 'Three classical Cabernet regions. Identity says they are not the same wine.',
  },
  {
    regions: ['Santorini', 'Etna', 'Mosel'],
    story: 'Three radically different terroirs that all rate high on Earthly and Tradition.',
  },
  {
    regions: ['Loire', 'Friuli-Venezia Giulia'],
    story: 'Identical identity profiles. Similar role, different national context.',
  },
  {
    regions: ['Burgundy', 'Mosel', 'Piedmont', 'Tokaj'],
    story: 'Four Old World Interior pillars. The cluster centre, made visible.',
  },
];

export default function Comparison() {
  const { regions } = useData();
  const [selected, setSelected] = useState([]);
  const [surpriseIndex, setSurpriseIndex] = useState(-1);
  const [currentStory, setCurrentStory] = useState(null);

  const selectedRegions = useMemo(
    () => selected.map((name) => regions.find((r) => r.name === name)).filter(Boolean),
    [selected, regions]
  );

  // Toggle a region in/out of the comparison set
  const toggle = (name) => {
    setCurrentStory(null);
    setSelected((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      }
      if (prev.length >= MAX_SELECTIONS) {
        return prev;
      }
      return [...prev, name];
    });
  };

  const clear = () => {
    setSelected([]);
    setCurrentStory(null);
  };

  const surprise = () => {
    const next = (surpriseIndex + 1) % SURPRISE_SETS.length;
    const set = SURPRISE_SETS[next];
    setSelected(set.regions);
    setCurrentStory(set.story);
    setSurpriseIndex(next);
  };

  // Bootstrap on first mount with a default surprise so the view isn't empty
  useEffect(() => {
    if (selected.length === 0 && surpriseIndex === -1) {
      const set = SURPRISE_SETS[0];
      setSelected(set.regions);
      setCurrentStory(set.story);
      setSurpriseIndex(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <Picker
            regions={regions}
            selected={selected}
            onToggle={toggle}
            onClear={clear}
            onSurprise={surprise}
          />
        </div>
        <div className="lg:col-span-8">
          <ComparisonView
            selectedRegions={selectedRegions}
            story={currentStory}
            onRemove={toggle}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------

function Picker({ regions, selected, onToggle, onClear, onSurprise }) {
  const [query, setQuery] = useState('');
  const isFull = selected.length >= MAX_SELECTIONS;

  const grouped = useMemo(() => {
    const filtered = query.trim()
      ? regions.filter((r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.country.toLowerCase().includes(query.toLowerCase())
        )
      : regions;
    return {
      old: filtered.filter((r) => r.world === 'Old World').sort((a, b) => a.name.localeCompare(b.name)),
      nw:  filtered.filter((r) => r.world === 'New World').sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [regions, query]);

  return (
    <div className="bg-white border border-parchment-edge rounded-lg overflow-hidden">
      <div className="p-3 border-b border-parchment-edge space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="small-caps">{selected.length} of {MAX_SELECTIONS} selected</span>
          <div className="flex gap-3 text-xs font-sans">
            <button
              onClick={onSurprise}
              className="text-wine hover:underline"
            >
              Surprise me ↻
            </button>
            {selected.length > 0 && (
              <button
                onClick={onClear}
                className="text-ink-muted hover:text-wine"
              >
                reset
              </button>
            )}
          </div>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 59 regions…"
          className="w-full px-3 py-1.5 text-sm font-sans border border-parchment-edge
                     bg-white rounded-md focus:outline-none focus:border-wine
                     placeholder:text-ink-subtle"
        />
        {isFull && (
          <p className="text-xs text-ink-subtle italic">
            Maximum reached. Remove a region to add another.
          </p>
        )}
      </div>

      <div className="max-h-[640px] overflow-y-auto">
        <Group label="Old World" regions={grouped.old} selected={selected} onToggle={onToggle} disabled={isFull} />
        <Group label="New World" regions={grouped.nw} selected={selected} onToggle={onToggle} disabled={isFull} />
        {grouped.old.length === 0 && grouped.nw.length === 0 && (
          <div className="p-4 text-sm text-ink-subtle text-center">No matches.</div>
        )}
      </div>
    </div>
  );
}

function Group({ label, regions, selected, onToggle, disabled }) {
  if (regions.length === 0) return null;
  return (
    <div>
      <div className="px-3 py-1.5 small-caps bg-parchment-warm border-y border-parchment-edge sticky top-0 z-10">
        {label} <span className="text-ink-subtle ml-1">· {regions.length}</span>
      </div>
      <ul>
        {regions.map((r) => {
          const isSelected = selected.includes(r.name);
          const isDisabled = disabled && !isSelected;
          return (
            <li key={r.name}>
              <button
                onClick={() => !isDisabled && onToggle(r.name)}
                disabled={isDisabled}
                className={`w-full text-left px-3 py-2 flex items-baseline gap-2 transition-colors
                  ${isSelected
                    ? 'bg-wine/10 border-l-2 border-wine'
                    : isDisabled
                      ? 'opacity-40 cursor-not-allowed border-l-2 border-transparent'
                      : 'hover:bg-parchment-warm border-l-2 border-transparent'}`}
              >
                <span className="flex-shrink-0 w-4 h-4 rounded border border-parchment-edge mt-0.5
                  flex items-center justify-center"
                  style={{
                    backgroundColor: isSelected ? IDENTITY_COLORS[r.identity_cluster] : 'transparent',
                    borderColor: isSelected ? IDENTITY_COLORS[r.identity_cluster] : '#E8E1D3',
                  }}
                >
                  {isSelected && (
                    <svg viewBox="0 0 12 12" className="w-3 h-3" stroke="white" strokeWidth="2" fill="none">
                      <path d="M2 6 L5 9 L10 3" />
                    </svg>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${isSelected ? 'font-medium text-wine' : 'text-ink'}`}>{r.name}</div>
                  <div className="text-xs text-ink-subtle truncate">
                    {r.country} · <span className="italic">{r.metaphor}</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison view (right column)
// ---------------------------------------------------------------------------

function ComparisonView({ selectedRegions, story, onRemove }) {
  const datasets = useMemo(() => {
    return selectedRegions.map((r, i) => ({
      label: r.name,
      values: dscoreVector(r),
      color: IDENTITY_COLORS[r.identity_cluster],
      // Slightly less fill opacity when more regions overlap, so layered
      // shapes remain readable
      fillOpacity: Math.max(0.10, 0.30 - selectedRegions.length * 0.04),
    }));
  }, [selectedRegions]);

  return (
    <div className="space-y-3">
      <div className="bg-white border border-parchment-edge rounded-lg p-5">
        <Caption count={selectedRegions.length} story={story} />

        {selectedRegions.length > 0 && (
          <SelectedTray regions={selectedRegions} onRemove={onRemove} />
        )}

        <div className="mt-4 flex justify-center">
          {selectedRegions.length === 0 ? (
            <div className="py-12 text-center text-ink-subtle">
              <p className="small-caps mb-1">No regions selected</p>
              <p className="text-sm">Pick 2 or more regions to begin.</p>
            </div>
          ) : (
            <RadarChart datasets={datasets} dimensions={DIMENSIONS} size={460} />
          )}
        </div>
      </div>

      {selectedRegions.length >= 2 && (
        <ScoreTable regions={selectedRegions} />
      )}
    </div>
  );
}

function Caption({ count, story }) {
  if (count === 0) {
    return (
      <p className="text-ink-muted leading-relaxed">
        Pick <span className="font-medium text-ink">2 to 4 regions</span> to compare their D-score profiles.
        Where shapes overlap, the regions share an identity profile — even if their terroirs differ.
      </p>
    );
  }
  if (count === 1) {
    return (
      <p className="text-ink-muted leading-relaxed">
        One region selected. Pick at least one more to compare.
      </p>
    );
  }
  if (story) {
    return (
      <p className="text-ink-muted leading-relaxed italic">
        {story}
      </p>
    );
  }
  return (
    <p className="text-ink-muted leading-relaxed">
      <span className="font-medium text-ink">{count} regions</span> overlaid.
      Where the shapes overlap, the regions share an identity profile.
    </p>
  );
}

function SelectedTray({ regions, onRemove }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {regions.map((r) => {
        const idColor = IDENTITY_COLORS[r.identity_cluster];
        return (
          <button
            key={r.name}
            onClick={() => onRemove(r.name)}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-sans
                       border transition-colors hover:bg-parchment-warm group"
            style={{ borderColor: idColor + '55', backgroundColor: idColor + '11' }}
            title="Remove from comparison"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: idColor }}
            />
            <span className="font-medium text-ink">{r.name}</span>
            <span className="text-ink-subtle italic">{r.metaphor}</span>
            <span className="text-ink-subtle group-hover:text-wine ml-0.5">×</span>
          </button>
        );
      })}
    </div>
  );
}

function ScoreTable({ regions }) {
  return (
    <div className="bg-white border border-parchment-edge rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-parchment-warm border-b border-parchment-edge">
            <th className="px-4 py-2 text-left small-caps font-normal">Dimension</th>
            {regions.map((r) => (
              <th
                key={r.name}
                className="px-3 py-2 text-center small-caps font-normal"
                style={{ color: IDENTITY_COLORS[r.identity_cluster] }}
              >
                {r.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((dim, di) => (
            <tr
              key={dim.key}
              className={di % 2 === 0 ? '' : 'bg-parchment/50'}
            >
              <td className="px-4 py-1.5 text-ink-muted text-xs">
                <span className="font-sans uppercase tracking-wide text-ink-subtle mr-1">{dim.key}</span>
                {dim.label}
              </td>
              {regions.map((r) => {
                const v = r[dim.key];
                const sign = v > 0 ? '+' : '';
                const isZero = v === 0;
                return (
                  <td key={r.name} className="px-3 py-1.5 text-center font-sans tabular-nums">
                    <span
                      className={`font-medium ${
                        isZero ? 'text-ink-subtle' : ''
                      }`}
                      style={!isZero ? { color: IDENTITY_COLORS[r.identity_cluster] } : {}}
                    >
                      {sign}{v}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-parchment-warm border-t border-parchment-edge">
            <td className="px-4 py-2 small-caps text-ink-subtle">Identity cluster</td>
            {regions.map((r) => (
              <td key={r.name} className="px-3 py-2 text-center text-xs">
                <span
                  className="pill"
                  style={{
                    backgroundColor: IDENTITY_COLORS[r.identity_cluster] + '22',
                    color: IDENTITY_COLORS[r.identity_cluster],
                  }}
                >
                  {r.identity_cluster}
                </span>
              </td>
            ))}
          </tr>
          <tr className="bg-parchment-warm">
            <td className="px-4 py-2 small-caps text-ink-subtle">Terroir cluster</td>
            {regions.map((r) => (
              <td key={r.name} className="px-3 py-2 text-center text-xs">
                <span
                  className="pill"
                  style={{
                    backgroundColor: TERROIR_COLORS[r.terroir_cluster] + '22',
                    color: TERROIR_COLORS[r.terroir_cluster],
                  }}
                >
                  {r.terroir_cluster}
                </span>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
