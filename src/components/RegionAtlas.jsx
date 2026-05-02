import { useMemo, useState, useEffect } from 'react';
import { useData } from '../lib/dataContext.jsx';
import { IDENTITY_COLORS, TERROIR_COLORS, WINE } from '../lib/colors.js';
import { DIMENSIONS, dscoreVector } from '../lib/dimensions.js';
import RadarChart from './RadarChart.jsx';

// ---------------------------------------------------------------------------
// RegionAtlas — per-region detail view.
//
// Three columns:
//   Left   — searchable region picker, grouped Old World / New World
//   Middle — selected region card with D-score radar
//   Right  — identity kin and terroir kin lists, with shared-kin highlighting
//
// Selecting here updates the global `selectedRegion`, so when the user
// switches to Dual Networks (Tab 1) the same region stays focused.
// ---------------------------------------------------------------------------

export default function RegionAtlas() {
  const { regions, identityNeighbours, terroirNeighbours, selectedRegion, setSelectedRegion } = useData();

  // If nothing selected on first visit, default to a region with strong
  // identity ↔ terroir divergence (Bordeaux is canonical from the narrative).
  useEffect(() => {
    if (!selectedRegion) {
      setSelectedRegion('Bordeaux');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const region = useMemo(
    () => regions.find((r) => r.name === selectedRegion) || null,
    [regions, selectedRegion]
  );

  const identityKin = useMemo(() => {
    if (!region) return [];
    const e = identityNeighbours.find((n) => n.region === region.name);
    return e ? e.neighbours : [];
  }, [identityNeighbours, region]);

  const terroirKin = useMemo(() => {
    if (!region) return [];
    const e = terroirNeighbours.find((n) => n.region === region.name);
    return e ? e.neighbours : [];
  }, [terroirNeighbours, region]);

  const idSet = useMemo(() => new Set(identityKin.map((n) => n.name)), [identityKin]);
  const teSet = useMemo(() => new Set(terroirKin.map((n) => n.name)), [terroirKin]);
  const overlap = useMemo(
    () => identityKin.filter((n) => teSet.has(n.name)).length,
    [identityKin, teSet]
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3">
          <RegionPicker
            regions={regions}
            selected={selectedRegion}
            onPick={setSelectedRegion}
          />
        </div>

        <div className="lg:col-span-5">
          {region ? (
            <RegionCard region={region} />
          ) : (
            <EmptyCard />
          )}
        </div>

        <div className="lg:col-span-4">
          {region && (
            <KinPanels
              region={region}
              regions={regions}
              identityKin={identityKin}
              terroirKin={terroirKin}
              idSet={idSet}
              teSet={teSet}
              overlap={overlap}
              onPickRegion={setSelectedRegion}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------

function RegionPicker({ regions, selected, onPick }) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const filtered = query.trim()
      ? regions.filter((r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.country.toLowerCase().includes(query.toLowerCase())
        )
      : regions;

    const old = filtered.filter((r) => r.world === 'Old World').sort((a, b) => a.name.localeCompare(b.name));
    const nw  = filtered.filter((r) => r.world === 'New World').sort((a, b) => a.name.localeCompare(b.name));
    return { old, nw };
  }, [regions, query]);

  return (
    <div className="bg-white border border-parchment-edge rounded-lg overflow-hidden">
      <div className="p-3 border-b border-parchment-edge">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 59 regions…"
          className="w-full px-3 py-1.5 text-sm font-sans border border-parchment-edge
                     bg-white rounded-md focus:outline-none focus:border-wine
                     placeholder:text-ink-subtle"
        />
      </div>
      <div className="max-h-[700px] overflow-y-auto">
        <RegionGroup label="Old World" regions={grouped.old} selected={selected} onPick={onPick} />
        <RegionGroup label="New World" regions={grouped.nw} selected={selected} onPick={onPick} />
        {grouped.old.length === 0 && grouped.nw.length === 0 && (
          <div className="p-4 text-sm text-ink-subtle text-center">No matches.</div>
        )}
      </div>
    </div>
  );
}

function RegionGroup({ label, regions, selected, onPick }) {
  if (regions.length === 0) return null;
  return (
    <div>
      <div className="px-3 py-1.5 small-caps bg-parchment-warm border-y border-parchment-edge sticky top-0">
        {label} <span className="text-ink-subtle ml-1">· {regions.length}</span>
      </div>
      <ul>
        {regions.map((r) => {
          const isSelected = r.name === selected;
          return (
            <li key={r.name}>
              <button
                onClick={() => onPick(r.name)}
                className={`w-full text-left px-3 py-2 flex items-baseline gap-2 transition-colors
                  ${isSelected
                    ? 'bg-wine/10 border-l-2 border-wine'
                    : 'hover:bg-parchment-warm border-l-2 border-transparent'}`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ backgroundColor: IDENTITY_COLORS[r.identity_cluster] }}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${isSelected ? 'font-medium text-wine' : 'text-ink'}`}>
                    {r.name}
                  </div>
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
// Region card with radar
// ---------------------------------------------------------------------------

function RegionCard({ region }) {
  const idColor = IDENTITY_COLORS[region.identity_cluster];
  const teColor = TERROIR_COLORS[region.terroir_cluster];

  const datasets = useMemo(
    () => [{
      label: region.name,
      values: dscoreVector(region),
      color: idColor,
      fillOpacity: 0.22,
    }],
    [region, idColor]
  );

  return (
    <div className="bg-white border border-parchment-edge rounded-lg p-5">
      <div className="mb-1">
        <p className="small-caps text-ink-subtle">{region.world} · {region.country}</p>
      </div>
      <h2 className="font-serif text-3xl text-ink leading-tight">{region.name}</h2>
      <p className="font-serif italic text-xl text-wine mt-1">{region.metaphor}</p>

      <div className="flex flex-wrap gap-2 mt-3">
        <span className="pill" style={{ backgroundColor: idColor + '22', color: idColor }}>
          {region.identity_cluster}
        </span>
        <span className="pill" style={{ backgroundColor: teColor + '22', color: teColor }}>
          {region.terroir_cluster}
        </span>
      </div>

      <div className="mt-4 flex justify-center">
        <RadarChart datasets={datasets} dimensions={DIMENSIONS} size={420} />
      </div>

      <DScoreReadout region={region} />
    </div>
  );
}

function DScoreReadout({ region }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
      {DIMENSIONS.map((dim) => {
        const v = region[dim.key];
        const sign = v > 0 ? '+' : '';
        const isZero = v === 0;
        return (
          <div key={dim.key} className="flex items-baseline gap-2 text-xs font-sans">
            <span className="text-ink-subtle uppercase tracking-wide flex-shrink-0">{dim.key}</span>
            <span className="text-ink-muted truncate">{dim.label.split(' ↔ ')[0]} ↔ {dim.label.split(' ↔ ')[1]}</span>
            <span
              className={`ml-auto font-medium tabular-nums ${
                isZero ? 'text-ink-subtle' : v > 0 ? 'text-wine' : 'text-ink'
              }`}
            >
              {sign}{v}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyCard() {
  return (
    <div className="bg-white border border-parchment-edge rounded-lg p-12 text-center">
      <p className="text-ink-muted">Select a region from the list to begin.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kin panels
// ---------------------------------------------------------------------------

function KinPanels({ region, regions, identityKin, terroirKin, idSet, teSet, overlap, onPickRegion }) {
  const message =
    overlap === 0
      ? "No kin in common — the two systems disagree completely about this region's neighbourhood."
      : overlap === 1
      ? '1 kin appears in both lists.'
      : `${overlap} kin appear in both lists.`;

  return (
    <div className="space-y-3">
      <KinList
        title="Identity kin"
        subtitle="closest in D-score profile"
        kin={identityKin}
        regions={regions}
        colors={IDENTITY_COLORS}
        clusterKey="identity_cluster"
        sharedSet={teSet}
        onPickRegion={onPickRegion}
      />
      <KinList
        title="Terroir kin"
        subtitle="closest in terroir profile"
        kin={terroirKin}
        regions={regions}
        colors={TERROIR_COLORS}
        clusterKey="terroir_cluster"
        sharedSet={idSet}
        onPickRegion={onPickRegion}
      />
      <div className="bg-parchment-warm border border-parchment-edge rounded-lg p-3 text-xs text-ink-muted italic">
        {message} <span className="not-italic text-ink-subtle">Wine-red names appear in both lists.</span>
      </div>
    </div>
  );
}

function KinList({ title, subtitle, kin, regions, colors, clusterKey, sharedSet, onPickRegion }) {
  return (
    <div className="bg-white border border-parchment-edge rounded-lg p-3">
      <h4 className="font-serif text-base text-ink">{title}</h4>
      <p className="small-caps text-ink-subtle mb-2">{subtitle}</p>
      <ul className="space-y-1">
        {kin.map((n) => {
          const r = regions.find((x) => x.name === n.name);
          if (!r) return null;
          const isShared = sharedSet.has(n.name);
          return (
            <li key={n.name}>
              <button
                onClick={() => onPickRegion(n.name)}
                className="w-full flex items-center gap-2 text-sm text-left p-1.5 rounded
                           hover:bg-parchment-warm transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors[r[clusterKey]] }}
                />
                <span className={isShared ? 'font-medium text-wine' : 'text-ink'}>{n.name}</span>
                <span className="text-ink-subtle text-xs">{r.country}</span>
                <span className="ml-auto text-xs text-ink-subtle font-sans tabular-nums">
                  {n.similarity.toFixed(2)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
