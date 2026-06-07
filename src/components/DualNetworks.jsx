import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useData } from '../lib/dataContext.jsx';
import {
  IDENTITY_COLORS,
  TERROIR_COLORS,
  WINE,
  PARCHMENT,
} from '../lib/colors.js';

// ---------------------------------------------------------------------------
// DualNetworks — the spine view of Region Affinities.
//
// Two side-by-side force-directed graphs of the same 59 regions, with
// different similarity models driving the edges:
//   Left  — identity similarity (cosine on D-scores)
//   Right — terroir similarity (cosine on terroir PCA coordinates)
//
// Edges are the union of each region's top-K nearest neighbours (default K=5).
// Hovering a region highlights it (and its top-5 kin) on BOTH graphs at once,
// AND shows the names of the active region + all 5 kin labels in each graph.
// ---------------------------------------------------------------------------

const NODE_RADIUS = 5;
const NODE_RADIUS_HOVER = 8;
const PAD = 36;

export default function DualNetworks() {
  const { regions, identityNeighbours, terroirNeighbours, selectedRegion, setSelectedRegion } = useData();
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  // Which panel (if any) is expanded to fill the screen. null = side-by-side.
  const [expandedPanel, setExpandedPanel] = useState(null);

  const activeRegion = hoveredRegion ?? selectedRegion;
  // Camera only moves on click/search — hover drives highlighting but not zoom.
  const zoomRegion = selectedRegion;

  const searchMatches = useMemo(() => {
    if (!searchValue.trim()) return [];
    const q = searchValue.toLowerCase();
    return regions
      .filter((r) => r.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchValue, regions]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <Toolbar
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        searchMatches={searchMatches}
        onPick={(name) => {
          setSelectedRegion(name);
          setSearchValue('');
        }}
        activeRegion={activeRegion}
        onResetSelection={() => setSelectedRegion(null)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <NetworkPanel
          title="Identity"
          subtitle="kinship by D-score profile"
          regions={regions}
          neighbours={identityNeighbours}
          colors={IDENTITY_COLORS}
          clusterKey="identity_cluster"
          activeRegion={activeRegion}
          zoomRegion={zoomRegion}
          selectedRegion={selectedRegion}
          onHover={setHoveredRegion}
          onClick={(name) => setSelectedRegion((prev) => (name === prev ? null : name))}
          isExpanded={expandedPanel === 'Identity'}
          onToggleExpand={() => setExpandedPanel((p) => (p === 'Identity' ? null : 'Identity'))}
        />
        <NetworkPanel
          title="Terroir"
          subtitle="kinship by terroir profile"
          regions={regions}
          neighbours={terroirNeighbours}
          colors={TERROIR_COLORS}
          clusterKey="terroir_cluster"
          activeRegion={activeRegion}
          zoomRegion={zoomRegion}
          selectedRegion={selectedRegion}
          onHover={setHoveredRegion}
          onClick={(name) => setSelectedRegion((prev) => (name === prev ? null : name))}
          isExpanded={expandedPanel === 'Terroir'}
          onToggleExpand={() => setExpandedPanel((p) => (p === 'Terroir' ? null : 'Terroir'))}
        />
      </div>

      {activeRegion && (
        <ActiveRegionPanel
          regions={regions}
          identityNeighbours={identityNeighbours}
          terroirNeighbours={terroirNeighbours}
          name={activeRegion}
        />
      )}

      <Legend />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function Toolbar({ searchValue, setSearchValue, searchMatches, onPick, activeRegion, onResetSelection }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[260px] max-w-md">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Find a region…"
          className="w-full px-3 py-2 text-sm font-sans border border-parchment-edge
                     bg-white rounded-md focus:outline-none focus:border-wine
                     placeholder:text-ink-subtle"
        />
        {searchMatches.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1 bg-white border
                         border-parchment-edge rounded-md shadow-md z-10
                         max-h-64 overflow-y-auto">
            {searchMatches.map((r) => (
              <li key={r.name}>
                <button
                  onClick={() => onPick(r.name)}
                  className="w-full text-left px-3 py-1.5 text-sm font-sans
                             hover:bg-parchment-warm flex justify-between items-center"
                >
                  <span>{r.name}</span>
                  <span className="text-xs text-ink-subtle">{r.country}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-sm text-ink-muted font-sans">
        {activeRegion ? (
          <>
            <span className="small-caps mr-2">Focused:</span>
            <span className="text-ink font-medium">{activeRegion}</span>
            <button
              onClick={onResetSelection}
              className="ml-3 text-xs text-wine hover:underline"
            >
              reset
            </button>
          </>
        ) : (
          <span className="text-ink-subtle">Hover a region — or search above — to see its kin in both systems.</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NetworkPanel — one of the two D3 force graphs
// ---------------------------------------------------------------------------

function NetworkPanel({
  title, subtitle, regions, neighbours, colors, clusterKey,
  activeRegion, zoomRegion, selectedRegion, onHover, onClick,
  isExpanded, onToggleExpand,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  // Mirror activeRegion in a ref so async handlers (like sim.on('end'),
  // which fires when the simulation cools — long after the init effect has
  // captured its closure) can read the current focused state.
  const activeRegionRef = useRef(activeRegion);
  activeRegionRef.current = activeRegion;
  // Cluster label placements, computed when the force simulation cools.
  // A separate effect handles the actual render so labels appear/disappear
  // purely based on React state (focus), not D3 simulation events.
  const clusterPlacementsRef = useRef([]);
  // De-overlapped positions for ALL region labels, computed when the sim cools.
  const labelPosRef = useRef(new Map());
  // Bumped when sim.on('end') updates placements, so the render effect can
  // depend on it and re-run.
  const [placementsTick, setPlacementsTick] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !regions || !neighbours) return;

    // Build graph (deep-cloned, scoped to this effect)
    const nodes = regions.map((r) => ({
      id: r.name,
      cluster: r[clusterKey],
      country: r.country,
      world: r.world,
    }));

    const edgeSet = new Set();
    const links = [];
    neighbours.forEach((entry) => {
      entry.neighbours.forEach((nb) => {
        const a = entry.region;
        const b = nb.name;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          links.push({ source: a, target: b, similarity: nb.similarity });
        }
      });
    });

    const rect = container.getBoundingClientRect();
    const W = rect.width;
    // When expanded to fill the screen, use the real available height so the
    // layout breathes into the space; otherwise keep the compact aspect.
    const H = isExpanded
      ? Math.max(420, rect.height)
      : Math.max(560, Math.min(680, W * 0.95));

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('data-fullviewbox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .attr('height', H);

    svg.selectAll('*').remove();

    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');
    const regionLabelGroup = svg.append('g').attr('class', 'region-labels');
    const labelGroup = svg.append('g').attr('class', 'cluster-labels');

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(64).strength(0.38))
      .force('charge', d3.forceManyBody().strength(-230))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.09))
      .force('collide', d3.forceCollide(NODE_RADIUS + 9))
      .force('cluster', clusterForce(nodes, W, H, 0.05))
      .force('bounds', boundsForce(nodes, W, H, PAD));

    const link = linkGroup
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#C8BFB1')
      .attr('stroke-opacity', 0.45)
      .attr('stroke-width', 1);

    const node = nodeGroup
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', (d) => colors[d.cluster] || '#888')
      .attr('stroke', PARCHMENT)
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => onHover(d.id))
      .on('mouseleave', () => onHover(null))
      .call(drag(sim, onClick));

    const regionLabel = regionLabelGroup
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d) => d.id)
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', 9)
      .attr('font-weight', 400)
      .attr('fill', '#5A534C')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .attr('paint-order', 'stroke')
      .attr('stroke', PARCHMENT)
      .attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round');

    sim.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      node
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y);
      regionLabel
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y - NODE_RADIUS - 5);
    });

    sim.on('end', () => {
      const cx = W / 2;
      const cy = H / 2;
      const byCluster = d3.group(nodes, (d) => d.cluster);
      const placements = Array.from(byCluster, ([cluster, ns]) => {
        const meanX = d3.mean(ns.map((d) => d.x));
        const meanY = d3.mean(ns.map((d) => d.y));
        // Push label radially outward from canvas centre by ~22px, so labels
        // sit on the OUTSIDE of each cluster — never overlapping inner nodes.
        // Falls back to "above the cluster" when the cluster sits dead-centre.
        const dx = meanX - cx;
        const dy = meanY - cy;
        const dist = Math.hypot(dx, dy);
        const offset = 22;
        const labelX = dist > 4 ? meanX + (dx / dist) * offset : meanX;
        const labelY = dist > 4 ? meanY + (dy / dist) * offset : meanY - offset;
        return {
          cluster,
          x: Math.max(PAD + 60, Math.min(W - PAD - 60, labelX)),
          y: Math.max(PAD + 8,  Math.min(H - PAD - 8,  labelY)),
        };
      });

      // Cache placements; the dedicated render effect will handle drawing
      // them with the correct opacity for the current focus state.
      clusterPlacementsRef.current = placements;

      // Compute non-overlapping positions for ALL region labels (all 59 are
      // shown at once now). Each label fans away from its neighbours while a
      // gentle spring keeps it near its own node. Computed once here, when
      // positions are final; the render effect applies them.
      const labelItems = nodes.map((d) => ({
        id: d.id,
        x: d.x,
        baseX: d.x,
        baseY: d.y - NODE_RADIUS - 6,
        y: d.y - NODE_RADIUS - 6,
        w: d.id.length * 6.6 + 8,
      }));
      resolveLabelOverlaps(labelItems, 13, W, H);
      labelPosRef.current = new Map(labelItems.map((it) => [it.id, { x: it.x, y: it.y }]));

      setPlacementsTick((t) => t + 1);
    });

    return () => sim.stop();
  }, [regions, neighbours, clusterKey, colors, isExpanded]);

  // Update visual highlighting when activeRegion changes (no re-init)
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (svg.empty()) return;

    let neighbourSet = new Set();
    if (activeRegion && neighbours) {
      const entry = neighbours.find((n) => n.region === activeRegion);
      if (entry) {
        neighbourSet = new Set(entry.neighbours.map((n) => n.name));
      }
    }

    const isActive = (d) => d.id === activeRegion;
    const isNeighbour = (d) => neighbourSet.has(d.id);
    const isSelected = (d) => d.id === selectedRegion;

    svg.select('.nodes').selectAll('circle')
      .transition().duration(200)
      .attr('r', (d) => isActive(d) ? NODE_RADIUS_HOVER : NODE_RADIUS)
      .attr('stroke', (d) => isSelected(d) ? WINE : PARCHMENT)
      .attr('stroke-width', (d) => isSelected(d) ? 2.5 : 1.5)
      .attr('opacity', (d) => {
        if (!activeRegion) return 1;
        return isActive(d) || isNeighbour(d) ? 1 : 0.25;
      });

    svg.select('.links').selectAll('line')
      .transition().duration(200)
      .attr('stroke', (d) => {
        if (!activeRegion) return '#C8BFB1';
        const sId = typeof d.source === 'object' ? d.source.id : d.source;
        const tId = typeof d.target === 'object' ? d.target.id : d.target;
        const touchesActive = sId === activeRegion || tId === activeRegion;
        return touchesActive ? WINE : '#E8E1D3';
      })
      .attr('stroke-opacity', (d) => {
        if (!activeRegion) return 0.45;
        const sId = typeof d.source === 'object' ? d.source.id : d.source;
        const tId = typeof d.target === 'object' ? d.target.id : d.target;
        const touchesActive = sId === activeRegion || tId === activeRegion;
        return touchesActive ? 0.85 : 0.15;
      })
      .attr('stroke-width', (d) => {
        if (!activeRegion) return 1;
        const sId = typeof d.source === 'object' ? d.source.id : d.source;
        const tId = typeof d.target === 'object' ? d.target.id : d.target;
        const touchesActive = sId === activeRegion || tId === activeRegion;
        return touchesActive ? 2 : 0.8;
      });

    // Region labels: ALL names are shown at all times as an ambient layer.
    // When a region is focused, it and its kin are emphasised (darker, bolder,
    // larger) and the rest dim back so the focus still reads clearly.
    svg.select('.region-labels').selectAll('text')
      .transition().duration(200)
      .attr('opacity', (d) => {
        if (!activeRegion) return 0.78;
        return isActive(d) || isNeighbour(d) ? 1 : 0.18;
      })
      .attr('fill', (d) => (activeRegion && (isActive(d) || isNeighbour(d))) ? '#1F1A17' : '#5A534C')
      .attr('font-weight', (d) => isActive(d) ? 700 : isNeighbour(d) ? 600 : 400)
      .attr('font-size', (d) => isActive(d) ? 12 : isNeighbour(d) ? 10.5 : 9);
    // Label POSITIONS (the de-overlap fan) are applied by a dedicated effect
    // keyed on placementsTick, so focus changes only restyle — they never
    // re-run the layout or race the simulation.
  }, [activeRegion, selectedRegion, neighbours]);

  // Render cluster labels. Re-runs whenever:
  //   - placements update (sim cools; setPlacementsTick fires)
  //   - activeRegion changes (we want to fade them in/out)
  // Always reads the latest activeRegion via React state, so there's no
  // possibility of a stale-closure or simulation-timing race.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (svg.empty()) return;
    const labelGroup = svg.select('.cluster-labels');
    if (labelGroup.empty()) return;

    const placements = clusterPlacementsRef.current;
    // Cluster labels are now superseded by the always-on region names (all 59
    // shown), so they stay hidden to avoid double-labelling. Cluster identity
    // still reads from node colour + the legend below. Kept here (rather than
    // deleted) so it's a one-line revert if the cluster headers are wanted back.
    const targetOpacity = 0;

    labelGroup
      .selectAll('text')
      .data(placements, (d) => d.cluster)
      .join(
        (enter) => enter.append('text')
          .text((d) => d.cluster)
          .attr('x', (d) => d.x)
          .attr('y', (d) => d.y)
          .attr('font-family', 'Inter, system-ui, sans-serif')
          .attr('font-size', 11)
          .attr('font-weight', 600)
          .attr('letter-spacing', '0.06em')
          .attr('text-anchor', 'middle')
          .attr('fill', (d) => colors[d.cluster] || '#1F1A17')
          .attr('paint-order', 'stroke')
          .attr('stroke', '#FFFFFF')
          .attr('stroke-width', 4)
          .attr('stroke-linejoin', 'round')
          .attr('opacity', 0)
          .attr('pointer-events', 'none'),
        (update) => update
          .attr('x', (d) => d.x)
          .attr('y', (d) => d.y),
      )
      .transition('cluster-label-fade').duration(300)
      .attr('opacity', targetOpacity);
  }, [activeRegion, placementsTick, colors]);

  // Apply the de-overlapped region-label positions. Re-runs when the sim
  // cools (placementsTick) — including after an expand re-layout. Focus
  // changes do NOT move labels (they only restyle, in the highlight effect),
  // so the fan is computed once per layout and stays stable under zoom.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (svg.empty()) return;
    const map = labelPosRef.current;
    if (!map || map.size === 0) return;
    svg.select('.region-labels').selectAll('text')
      .transition('label-pos').duration(450).ease(d3.easeCubicInOut)
      .attr('x', (d) => (map.get(d.id) ? map.get(d.id).x : d.x))
      .attr('y', (d) => (map.get(d.id) ? map.get(d.id).y : d.y - NODE_RADIUS - 6));
  }, [placementsTick]);

  // Zoom-to-fit: separate effect so a bug here can't break highlighting.
  // Uses zoomRegion (selection-prioritised), NOT activeRegion (hover-prioritised),
  // so that hovering nearby nodes after a click doesn't yank the camera.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (svg.empty()) return;

    const fullViewBox = svg.attr('data-fullviewbox');
    if (!fullViewBox) return;

    if (!zoomRegion) {
      svg.transition('zoom').duration(600).ease(d3.easeCubicInOut)
        .attr('viewBox', fullViewBox);
      return;
    }

    let neighbourSet = new Set();
    if (neighbours) {
      const entry = neighbours.find((n) => n.region === zoomRegion);
      if (entry) neighbourSet = new Set(entry.neighbours.map((n) => n.name));
    }
    const focusIds = new Set([zoomRegion, ...neighbourSet]);

    const focusPositions = svg.select('.nodes').selectAll('circle')
      .filter((d) => focusIds.has(d.id))
      .nodes()
      .map((c) => ({
        x: parseFloat(c.getAttribute('cx')),
        y: parseFloat(c.getAttribute('cy')),
      }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    if (focusPositions.length === 0) return;

    const xs = focusPositions.map((p) => p.x);
    const ys = focusPositions.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padX = 90, padTop = 60, padBot = 40;
    let bx = minX - padX;
    let by = minY - padTop;
    let bw = (maxX - minX) + padX * 2;
    let bh = (maxY - minY) + padTop + padBot;

    const [, , fullW, fullH] = fullViewBox.split(/[\s,]+/).map(Number);
    const targetAspect = fullW / fullH;
    const currentAspect = bw / bh;
    if (currentAspect > targetAspect) {
      const newH = bw / targetAspect;
      by -= (newH - bh) / 2;
      bh = newH;
    } else {
      const newW = bh * targetAspect;
      bx -= (newW - bw) / 2;
      bw = newW;
    }

    const minW = fullW * 0.7;
    if (bw < minW) {
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      bw = minW;
      bh = minW / targetAspect;
      bx = cx - bw / 2;
      by = cy - bh / 2;
    }

    svg.transition('zoom').duration(600).ease(d3.easeCubicInOut)
      .attr('viewBox', `${bx} ${by} ${bw} ${bh}`);
  }, [zoomRegion, neighbours]);

  const ExpandToggle = (
    <button
      type="button"
      onClick={onToggleExpand}
      className="ml-auto flex items-center gap-1 text-xs text-wine hover:underline font-sans shrink-0"
      title={isExpanded ? 'Collapse' : 'Expand to full screen'}
      aria-label={isExpanded ? 'Collapse panel' : 'Expand panel to full screen'}
    >
      {isExpanded ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
          Collapse
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
          Expand
        </>
      )}
    </button>
  );

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-parchment-edge bg-parchment-warm flex items-center gap-3">
          <div>
            <h3 className="font-serif text-lg text-ink">{title}</h3>
            <p className="small-caps text-ink-subtle mt-0.5">{subtitle}</p>
          </div>
          {ExpandToggle}
        </div>
        <div ref={containerRef} className="flex-1 min-h-0 p-3">
          <svg ref={svgRef} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-parchment-edge rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-parchment-edge bg-parchment-warm flex items-center gap-3">
        <div>
          <h3 className="font-serif text-lg text-ink">{title}</h3>
          <p className="small-caps text-ink-subtle mt-0.5">{subtitle}</p>
        </div>
        {ExpandToggle}
      </div>
      <div ref={containerRef} className="p-3">
        <svg ref={svgRef} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActiveRegionPanel
// ---------------------------------------------------------------------------

function ActiveRegionPanel({ regions, identityNeighbours, terroirNeighbours, name }) {
  const region = regions.find((r) => r.name === name);
  if (!region) return null;

  const idNb = identityNeighbours.find((n) => n.region === name)?.neighbours || [];
  const teNb = terroirNeighbours.find((n) => n.region === name)?.neighbours || [];

  const idSet = new Set(idNb.map((n) => n.name));
  const teSet = new Set(teNb.map((n) => n.name));
  const overlap = idNb.filter((n) => teSet.has(n.name)).length;

  const message =
    overlap === 0
      ? "no overlap — the two systems disagree completely about this region's kin"
      : overlap === 1
      ? '1 region appears in both kin sets'
      : `${overlap} regions appear in both kin sets`;

  return (
    <div className="mt-4 bg-white border border-parchment-edge rounded-lg p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
        <h3 className="font-serif text-2xl text-ink">{region.name}</h3>
        <span className="text-ink-muted">{region.country}</span>
        <span className="italic text-ink-muted">{region.metaphor}</span>
        <span
          className="pill ml-auto"
          style={{ backgroundColor: IDENTITY_COLORS[region.identity_cluster] + '22', color: IDENTITY_COLORS[region.identity_cluster] }}
        >
          {region.identity_cluster}
        </span>
        <span
          className="pill"
          style={{ backgroundColor: TERROIR_COLORS[region.terroir_cluster] + '22', color: TERROIR_COLORS[region.terroir_cluster] }}
        >
          {region.terroir_cluster}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KinList
          title="Identity kin"
          subtitle="closest in D-score profile"
          neighbours={idNb}
          regions={regions}
          colors={IDENTITY_COLORS}
          clusterKey="identity_cluster"
          highlight={(n) => teSet.has(n.name)}
        />
        <KinList
          title="Terroir kin"
          subtitle="closest in terroir profile"
          neighbours={teNb}
          regions={regions}
          colors={TERROIR_COLORS}
          clusterKey="terroir_cluster"
          highlight={(n) => idSet.has(n.name)}
        />
      </div>

      <p className="mt-4 text-sm text-ink-muted italic">
        {message}. <span className="text-ink-subtle not-italic">Names highlighted appear in both kin lists.</span>
      </p>
    </div>
  );
}

function KinList({ title, subtitle, neighbours, regions, colors, clusterKey, highlight }) {
  return (
    <div>
      <h4 className="font-serif text-base text-ink">{title}</h4>
      <p className="small-caps text-ink-subtle mb-2">{subtitle}</p>
      <ul className="space-y-1.5">
        {neighbours.map((n) => {
          const r = regions.find((x) => x.name === n.name);
          const isShared = highlight(n);
          return (
            <li key={n.name} className="flex items-center gap-2 text-sm">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: r ? colors[r[clusterKey]] : '#888' }}
              />
              <span className={isShared ? 'font-medium text-wine' : 'text-ink'}>{n.name}</span>
              <span className="text-ink-subtle text-xs">{r?.country}</span>
              <span className="ml-auto text-xs text-ink-subtle font-sans">{n.similarity.toFixed(2)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
      <ClusterLegend title="Identity clusters" colors={IDENTITY_COLORS} />
      <ClusterLegend title="Terroir clusters" colors={TERROIR_COLORS} />
    </div>
  );
}

function ClusterLegend({ title, colors }) {
  return (
    <div className="bg-parchment-warm border border-parchment-edge rounded-md p-3">
      <p className="small-caps mb-2">{title}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {Object.entries(colors).map(([name, color]) => (
          <li key={name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-ink-muted">{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forces
// ---------------------------------------------------------------------------

// Fan apart a set of visible labels so their text doesn't overlap. Each item
// is { id, x, y, baseX, baseY, w }; y is nudged (vertical priority, the least
// disruptive direction) until no two boxes collide, with a gentle pull back
// toward each label's anchor so it stays near its own node. Now runs over all
// region labels at once (all 59 are shown), so the iteration budget is higher;
// 59 labels keep this well under a millisecond and it runs only when the
// simulation cools, not every frame.
function resolveLabelOverlaps(items, lineHeight, W, H) {
  if (!items || items.length < 2) return;
  for (let iter = 0; iter < 160; iter++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const overlapX = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
        const dy = a.y - b.y;
        const overlapY = lineHeight - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          const push = overlapY / 2 + 0.3;
          const dir = dy === 0 ? (a.baseY <= b.baseY ? -1 : 1) : Math.sign(dy);
          a.y += dir * push;
          b.y -= dir * push;
          moved = true;
        }
      }
    }
    // gentle spring back toward the node anchor (keeps labels near their dots)
    for (const it of items) it.y += ((it.baseY ?? it.y) - it.y) * 0.06;
    if (!moved) break;
  }
  // keep inside the canvas
  for (const it of items) {
    if (H) it.y = Math.max(12, Math.min(H - 8, it.y));
    if (W) it.x = Math.max(it.w / 2 + 4, Math.min(W - it.w / 2 - 4, it.x));
  }
}

function clusterForce(nodes, W, H, strength = 0.05) {
  // Arrange cluster anchors evenly around a circle inside the canvas.
  // Compared to a grid, this distributes clusters symmetrically and avoids
  // empty cells when the cluster count doesn't fit a nice rectangle (e.g. 7).
  // Anchors sit on a ring at ~70% of the canvas half-min, leaving room for
  // both the cluster spread and the label gutter at the edge.
  const clusters = Array.from(new Set(nodes.map((n) => n.cluster)));
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.32;
  const anchors = {};
  clusters.forEach((c, i) => {
    // Start at top (-π/2) and walk clockwise so the first cluster sits
    // near the top of the canvas — visually consistent with reading order.
    const theta = -Math.PI / 2 + (i / clusters.length) * 2 * Math.PI;
    anchors[c] = {
      x: cx + radius * Math.cos(theta),
      y: cy + radius * Math.sin(theta),
    };
  });

  return (alpha) => {
    nodes.forEach((d) => {
      const a = anchors[d.cluster];
      if (!a) return;
      d.vx += (a.x - d.x) * strength * alpha;
      d.vy += (a.y - d.y) * strength * alpha;
    });
  };
}

function boundsForce(nodes, W, H, pad) {
  return () => {
    for (const d of nodes) {
      if (d.x < pad) { d.x = pad; if (d.vx < 0) d.vx = 0; }
      if (d.x > W - pad) { d.x = W - pad; if (d.vx > 0) d.vx = 0; }
      if (d.y < pad) { d.y = pad; if (d.vy < 0) d.vy = 0; }
      if (d.y > H - pad) { d.y = H - pad; if (d.vy > 0) d.vy = 0; }
    }
  };
}

function drag(sim, onClick) {
  let startX = 0, startY = 0, moved = false;
  const CLICK_THRESHOLD_PX = 4; // total movement under this = treat as click

  function dragstart(event, d) {
    if (!event.active) sim.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
    startX = event.x; startY = event.y;
    moved = false;
  }
  function dragmove(event, d) {
    if (Math.hypot(event.x - startX, event.y - startY) > CLICK_THRESHOLD_PX) {
      moved = true;
    }
    d.fx = event.x; d.fy = event.y;
  }
  function dragend(event, d) {
    if (!event.active) sim.alphaTarget(0);
    d.fx = null; d.fy = null;
    if (!moved && onClick) onClick(d.id);
  }
  return d3.drag().on('start', dragstart).on('drag', dragmove).on('end', dragend);
}
