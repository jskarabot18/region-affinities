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
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

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

    const { width } = container.getBoundingClientRect();
    const W = width;
    const H = Math.max(560, Math.min(680, width * 0.95));

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
      .force('link', d3.forceLink(links).id((d) => d.id).distance(48).strength(0.45))
      .force('charge', d3.forceManyBody().strength(-130))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.12))
      .force('collide', d3.forceCollide(NODE_RADIUS + 5))
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
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('fill', '#1F1A17')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .attr('paint-order', 'stroke')
      .attr('stroke', PARCHMENT)
      .attr('stroke-width', 3)
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

      labelGroup
        .selectAll('text')
        .data(placements, (d) => d.cluster)
        .join('text')
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
        .attr('pointer-events', 'none')
        .transition()
        .duration(400)
        .attr('opacity', 0.92);
    });

    return () => sim.stop();
  }, [regions, neighbours, clusterKey, colors]);

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

    // Region labels: now show for the active region AND all 5 kin (was just the active region)
    // Active region gets bolder weight + slightly larger size; kin get standard weight
    svg.select('.region-labels').selectAll('text')
      .transition().duration(200)
      .attr('opacity', (d) => {
        if (!activeRegion) return 0;
        return isActive(d) || isNeighbour(d) ? 1 : 0;
      })
      .attr('font-weight', (d) => isActive(d) ? 700 : 500)
      .attr('font-size', (d) => isActive(d) ? 12 : 10.5);

    svg.select('.cluster-labels').selectAll('text')
      .transition().duration(200)
      .attr('opacity', activeRegion ? 0.18 : 0.92);
  }, [activeRegion, selectedRegion, neighbours]);

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

  return (
    <div className="bg-white border border-parchment-edge rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-parchment-edge bg-parchment-warm">
        <h3 className="font-serif text-lg text-ink">{title}</h3>
        <p className="small-caps text-ink-subtle mt-0.5">{subtitle}</p>
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
