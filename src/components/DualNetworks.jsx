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
// Hovering a region highlights it (and its neighbours) on BOTH graphs at once,
// so the user can see how kinship shifts between the two systems.
// ---------------------------------------------------------------------------

const K = 5;
const NODE_RADIUS = 5;
const NODE_RADIUS_HOVER = 8;

export default function DualNetworks() {
  const { regions, identityNeighbours, terroirNeighbours, selectedRegion, setSelectedRegion } = useData();
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [searchValue, setSearchValue] = useState('');

  // The "active" region is hover (transient) or selection (persistent).
  const activeRegion = hoveredRegion ?? selectedRegion;

  // Search filter
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
        onClearSelection={() => setSelectedRegion(null)}
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
          selectedRegion={selectedRegion}
          onHover={setHoveredRegion}
          onClick={(name) => setSelectedRegion(name === selectedRegion ? null : name)}
        />
        <NetworkPanel
          title="Terroir"
          subtitle="kinship by terroir profile"
          regions={regions}
          neighbours={terroirNeighbours}
          colors={TERROIR_COLORS}
          clusterKey="terroir_cluster"
          activeRegion={activeRegion}
          selectedRegion={selectedRegion}
          onHover={setHoveredRegion}
          onClick={(name) => setSelectedRegion(name === selectedRegion ? null : name)}
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
// Toolbar — search, current selection, clear
// ---------------------------------------------------------------------------

function Toolbar({ searchValue, setSearchValue, searchMatches, onPick, activeRegion, onClearSelection }) {
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
              onClick={onClearSelection}
              className="ml-3 text-xs text-wine hover:underline"
            >
              clear
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
  activeRegion, selectedRegion, onHover, onClick,
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);

  // Build graph data once per (regions, neighbours) pair.
  const graph = useMemo(() => {
    const nodes = regions.map((r) => ({
      id: r.name,
      cluster: r[clusterKey],
      country: r.country,
      world: r.world,
      ...r,
    }));
    const edgeSet = new Set();
    const links = [];
    neighbours.forEach((entry) => {
      entry.neighbours.forEach((nb) => {
        const a = entry.region, b = nb.name;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          links.push({ source: a, target: b, similarity: nb.similarity });
        }
      });
    });
    return { nodes, links };
  }, [regions, neighbours, clusterKey]);

  // Initialize simulation + render once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    const W = width;
    const H = Math.max(480, Math.min(560, width * 0.85));

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, W, H])
      .attr('width', '100%')
      .attr('height', H);

    svg.selectAll('*').remove();

    const linkGroup = svg.append('g').attr('class', 'links');
    const labelGroup = svg.append('g').attr('class', 'cluster-labels');
    const nodeGroup = svg.append('g').attr('class', 'nodes');
    const regionLabelGroup = svg.append('g').attr('class', 'region-labels');

    // Force simulation
    const sim = d3.forceSimulation(graph.nodes)
      .force('link', d3.forceLink(graph.links).id((d) => d.id).distance(50).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-130))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(NODE_RADIUS + 4))
      // Mild cluster cohesion: pull each node gently toward its cluster centroid
      .force('cluster', clusterForce(graph.nodes, clusterKey === 'identity_cluster' ? 'cluster' : 'cluster', W, H));

    simulationRef.current = sim;

    const link = linkGroup
      .selectAll('line')
      .data(graph.links)
      .join('line')
      .attr('stroke', '#C8BFB1')
      .attr('stroke-opacity', 0.45)
      .attr('stroke-width', 1);

    const node = nodeGroup
      .selectAll('circle')
      .data(graph.nodes)
      .join('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', (d) => colors[d.cluster] || '#888')
      .attr('stroke', PARCHMENT)
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => onHover(d.id))
      .on('mouseleave', () => onHover(null))
      .on('click', (_, d) => onClick(d.id))
      .call(drag(sim));

    const regionLabel = regionLabelGroup
      .selectAll('text')
      .data(graph.nodes)
      .join('text')
      .text((d) => d.id)
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('fill', '#1F1A17')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('opacity', 0);

    // Cluster centroid labels appear after layout settles.
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
        .attr('y', (d) => d.y - NODE_RADIUS - 4);
    });

    sim.on('end', () => {
      // Compute centroids of each cluster from the settled layout
      const byCluster = d3.group(graph.nodes, (d) => d.cluster);
      const centroids = Array.from(byCluster, ([cluster, nodes]) => ({
        cluster,
        x: d3.mean(nodes, (d) => d.x),
        y: d3.mean(nodes, (d) => d.y),
      }));
      labelGroup
        .selectAll('text')
        .data(centroids, (d) => d.cluster)
        .join('text')
        .text((d) => d.cluster)
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y - 18)
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .attr('letter-spacing', '0.06em')
        .attr('text-transform', 'uppercase')
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => colors[d.cluster] || '#1F1A17')
        .attr('opacity', 0)
        .attr('pointer-events', 'none')
        .transition()
        .duration(400)
        .attr('opacity', 0.85);
    });

    return () => sim.stop();
    // We only re-initialize when graph topology changes, not on hover/select.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // Update visual highlighting when activeRegion changes (no re-init)
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (svg.empty()) return;

    // Compute neighbour set of active region, if any
    let neighbourSet = new Set();
    if (activeRegion) {
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
        const touchesActive = d.source.id === activeRegion || d.target.id === activeRegion;
        return touchesActive ? WINE : '#E8E1D3';
      })
      .attr('stroke-opacity', (d) => {
        if (!activeRegion) return 0.45;
        const touchesActive = d.source.id === activeRegion || d.target.id === activeRegion;
        return touchesActive ? 0.85 : 0.15;
      })
      .attr('stroke-width', (d) => {
        if (!activeRegion) return 1;
        const touchesActive = d.source.id === activeRegion || d.target.id === activeRegion;
        return touchesActive ? 2 : 0.8;
      });

    svg.select('.region-labels').selectAll('text')
      .transition().duration(200)
      .attr('opacity', (d) => {
        if (!activeRegion) return 0;
        return isActive(d) || isNeighbour(d) ? 1 : 0;
      })
      .attr('font-weight', (d) => isActive(d) ? 600 : 500);

    svg.select('.cluster-labels').selectAll('text')
      .transition().duration(200)
      .attr('opacity', activeRegion ? 0.25 : 0.85);
  }, [activeRegion, selectedRegion, neighbours]);

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
// ActiveRegionPanel — the comparative kin readout below the two graphs
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
// Legend — cluster keys for both networks
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
// Helpers
// ---------------------------------------------------------------------------

function clusterForce(nodes, clusterField, W, H) {
  // Compute initial cluster anchors arranged on a grid for stable layout
  const clusters = Array.from(new Set(nodes.map((n) => n[clusterField])));
  const cols = Math.ceil(Math.sqrt(clusters.length));
  const rows = Math.ceil(clusters.length / cols);
  const anchors = {};
  clusters.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    anchors[c] = {
      x: ((col + 0.5) / cols) * W,
      y: ((row + 0.5) / rows) * H,
    };
  });

  const strength = 0.06;
  return (alpha) => {
    nodes.forEach((d) => {
      const a = anchors[d[clusterField]];
      if (!a) return;
      d.vx += (a.x - d.x) * strength * alpha;
      d.vy += (a.y - d.y) * strength * alpha;
    });
  };
}

function drag(sim) {
  function dragstart(event, d) {
    if (!event.active) sim.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragmove(event, d) {
    d.fx = event.x; d.fy = event.y;
  }
  function dragend(event, d) {
    if (!event.active) sim.alphaTarget(0);
    d.fx = null; d.fy = null;
  }
  return d3.drag().on('start', dragstart).on('drag', dragmove).on('end', dragend);
}
