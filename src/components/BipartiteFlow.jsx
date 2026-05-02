import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useData } from '../lib/dataContext.jsx';
import {
  IDENTITY_COLORS,
  TERROIR_COLORS,
  IDENTITY_CLUSTERS,
  TERROIR_CLUSTERS,
  WINE,
} from '../lib/colors.js';

// ---------------------------------------------------------------------------
// BipartiteFlow — Identity ↔ Terroir
//
// A bipartite Sankey-style diagram. Each region is one unit of flow from its
// identity cluster (left) to its terroir cluster (right). Bands are sized by
// region count; ribbons sized by intersection count.
//
// The view exposes the independence finding at the structural level —
// 28 of 42 possible (identity, terroir) cells are non-empty, with no single
// intersection holding more than 5 regions. The visual tangle IS the finding.
// ---------------------------------------------------------------------------

const PADDING = { top: 60, right: 220, bottom: 40, left: 220 };
const BAND_WIDTH = 22;
const BAND_GAP = 8;     // vertical gap between bands in a column
const HEIGHT = 620;

export default function BipartiteFlow() {
  const { regions, selectedRegion, setSelectedRegion } = useData();
  const [hoveredCell, setHoveredCell] = useState(null);   // {identity, terroir}
  const [hoveredBand, setHoveredBand] = useState(null);   // {side, name}
  const [selectedCell, setSelectedCell] = useState(null); // {identity, terroir}

  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // ---- Build the contingency model ----
  const model = useMemo(() => {
    const idCounts = Object.fromEntries(IDENTITY_CLUSTERS.map((c) => [c, 0]));
    const teCounts = Object.fromEntries(TERROIR_CLUSTERS.map((c) => [c, 0]));
    const cellRegions = new Map(); // key: "identity||terroir" -> [regions]

    regions.forEach((r) => {
      idCounts[r.identity_cluster]++;
      teCounts[r.terroir_cluster]++;
      const key = `${r.identity_cluster}||${r.terroir_cluster}`;
      if (!cellRegions.has(key)) cellRegions.set(key, []);
      cellRegions.get(key).push(r);
    });

    // Order identity clusters by canonical narrative order;
    // order terroir clusters by region count descending (puts the
    // promiscuous Mediterranean & Volcanic in a visually prominent slot).
    const idOrdered = [...IDENTITY_CLUSTERS];
    const teOrdered = [...TERROIR_CLUSTERS].sort((a, b) => teCounts[b] - teCounts[a]);

    // Cells as flat list, used for ribbon rendering
    const cells = [];
    idOrdered.forEach((id) => {
      teOrdered.forEach((te) => {
        const rs = cellRegions.get(`${id}||${te}`) || [];
        if (rs.length > 0) cells.push({ identity: id, terroir: te, count: rs.length, regions: rs });
      });
    });

    return { idOrdered, teOrdered, idCounts, teCounts, cells, cellRegions };
  }, [regions]);

  // ---- Compute geometry ----
  const geom = useMemo(() => {
    const total = regions.length;

    // Available vertical space for bands (each column)
    const usableH = HEIGHT - PADDING.top - PADDING.bottom;
    const idTotalGap = (model.idOrdered.length - 1) * BAND_GAP;
    const teTotalGap = (model.teOrdered.length - 1) * BAND_GAP;
    const idScale = (usableH - idTotalGap) / total;
    const teScale = (usableH - teTotalGap) / total;

    // Identity bands (left)
    const idBands = {};
    let y = PADDING.top;
    model.idOrdered.forEach((id) => {
      const h = model.idCounts[id] * idScale;
      idBands[id] = { y0: y, y1: y + h, h };
      y += h + BAND_GAP;
    });

    // Terroir bands (right)
    const teBands = {};
    y = PADDING.top;
    model.teOrdered.forEach((te) => {
      const h = model.teCounts[te] * teScale;
      teBands[te] = { y0: y, y1: y + h, h };
      y += h + BAND_GAP;
    });

    return { idBands, teBands, idScale, teScale };
  }, [model, regions.length]);

  // ---- Layout cells: each cell gets a vertical slice of its parent bands ----
  // Cells inherit a y-offset within both source and target band.
  const cellLayout = useMemo(() => {
    // Track running y-offset within each band as we lay cells out in order
    const idCursor = Object.fromEntries(model.idOrdered.map((id) => [id, geom.idBands[id].y0]));
    const teCursor = Object.fromEntries(model.teOrdered.map((te) => [te, geom.teBands[te].y0]));

    return model.cells.map((cell) => {
      const sH = cell.count * geom.idScale;
      const tH = cell.count * geom.teScale;
      const sY0 = idCursor[cell.identity];
      const tY0 = teCursor[cell.terroir];
      idCursor[cell.identity] += sH;
      teCursor[cell.terroir] += tH;
      return {
        ...cell,
        sY0, sY1: sY0 + sH,
        tY0, tY1: tY0 + tH,
      };
    });
  }, [model, geom]);

  // ---- Render ----
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { width } = container.getBoundingClientRect();
    const W = width;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, W, HEIGHT])
      .attr('width', '100%')
      .attr('height', HEIGHT);

    svg.selectAll('*').remove();

    const xL = PADDING.left;
    const xR = W - PADDING.right;

    // --- Ribbons ---
    const ribbonGroup = svg.append('g').attr('class', 'ribbons');
    cellLayout.forEach((cell, i) => {
      const path = ribbonPath(xL + BAND_WIDTH, xR, cell.sY0, cell.sY1, cell.tY0, cell.tY1);
      ribbonGroup
        .append('path')
        .attr('class', 'ribbon')
        .attr('d', path)
        .attr('fill', IDENTITY_COLORS[cell.identity])
        .attr('fill-opacity', 0.18)
        .attr('stroke', 'none')
        .style('cursor', 'pointer')
        .datum(cell)
        .on('mouseenter', () => setHoveredCell({ identity: cell.identity, terroir: cell.terroir }))
        .on('mouseleave', () => setHoveredCell(null))
        .on('click', () => {
          setSelectedCell((prev) =>
            prev && prev.identity === cell.identity && prev.terroir === cell.terroir
              ? null
              : { identity: cell.identity, terroir: cell.terroir }
          );
        });
    });

    // --- Identity bands (left) ---
    const idBandGroup = svg.append('g').attr('class', 'id-bands');
    model.idOrdered.forEach((id) => {
      const band = geom.idBands[id];
      idBandGroup
        .append('rect')
        .attr('x', xL)
        .attr('y', band.y0)
        .attr('width', BAND_WIDTH)
        .attr('height', band.h)
        .attr('fill', IDENTITY_COLORS[id])
        .attr('rx', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredBand({ side: 'identity', name: id }))
        .on('mouseleave', () => setHoveredBand(null));

      // Label to the left
      idBandGroup
        .append('text')
        .attr('x', xL - 10)
        .attr('y', (band.y0 + band.y1) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .attr('fill', IDENTITY_COLORS[id])
        .text(id);

      idBandGroup
        .append('text')
        .attr('x', xL - 10)
        .attr('y', (band.y0 + band.y1) / 2 + 14)
        .attr('text-anchor', 'end')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('font-size', 10)
        .attr('fill', '#9A9089')
        .text(`${model.idCounts[id]} regions`);
    });

    // --- Terroir bands (right) ---
    const teBandGroup = svg.append('g').attr('class', 'te-bands');
    model.teOrdered.forEach((te) => {
      const band = geom.teBands[te];
      teBandGroup
        .append('rect')
        .attr('x', xR)
        .attr('y', band.y0)
        .attr('width', BAND_WIDTH)
        .attr('height', band.h)
        .attr('fill', TERROIR_COLORS[te])
        .attr('rx', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredBand({ side: 'terroir', name: te }))
        .on('mouseleave', () => setHoveredBand(null));

      teBandGroup
        .append('text')
        .attr('x', xR + BAND_WIDTH + 10)
        .attr('y', (band.y0 + band.y1) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .attr('fill', TERROIR_COLORS[te])
        .text(te);

      teBandGroup
        .append('text')
        .attr('x', xR + BAND_WIDTH + 10)
        .attr('y', (band.y0 + band.y1) / 2 + 14)
        .attr('text-anchor', 'start')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('font-size', 10)
        .attr('fill', '#9A9089')
        .text(`${model.teCounts[te]} regions`);
    });

    // --- Column headers ---
    svg.append('text')
      .attr('x', xL + BAND_WIDTH / 2)
      .attr('y', PADDING.top - 24)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('letter-spacing', '0.12em')
      .attr('fill', '#5C534D')
      .text('IDENTITY');

    svg.append('text')
      .attr('x', xR + BAND_WIDTH / 2)
      .attr('y', PADDING.top - 24)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('letter-spacing', '0.12em')
      .attr('fill', '#5C534D')
      .text('TERROIR');
  }, [cellLayout, geom, model]);

  // ---- Highlight effect ----
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (svg.empty()) return;

    const ribbons = svg.selectAll('.ribbon');

    // What should be highlighted?
    const isMatch = (cell) => {
      if (selectedCell) {
        return cell.identity === selectedCell.identity && cell.terroir === selectedCell.terroir;
      }
      if (hoveredCell) {
        return cell.identity === hoveredCell.identity && cell.terroir === hoveredCell.terroir;
      }
      if (hoveredBand) {
        if (hoveredBand.side === 'identity') return cell.identity === hoveredBand.name;
        if (hoveredBand.side === 'terroir') return cell.terroir === hoveredBand.name;
      }
      return null; // no highlight active
    };

    ribbons
      .transition().duration(150)
      .attr('fill-opacity', function () {
        const cell = d3.select(this).datum();
        const m = isMatch(cell);
        if (m === null) return 0.18;
        return m ? 0.62 : 0.06;
      })
      .attr('stroke', function () {
        const cell = d3.select(this).datum();
        return isMatch(cell) ? IDENTITY_COLORS[cell.identity] : 'none';
      })
      .attr('stroke-opacity', function () {
        const cell = d3.select(this).datum();
        return isMatch(cell) ? 0.4 : 0;
      })
      .attr('stroke-width', 1);
  }, [hoveredCell, hoveredBand, selectedCell]);

  // ---- Active region list (selected cell takes precedence over hovered) ----
  const activeCell = selectedCell || hoveredCell;
  const activeRegionList = useMemo(() => {
    if (!activeCell) return null;
    const key = `${activeCell.identity}||${activeCell.terroir}`;
    return model.cellRegions.get(key) || [];
  }, [activeCell, model]);

  const activeBandSummary = useMemo(() => {
    if (selectedCell || hoveredCell || !hoveredBand) return null;
    const { side, name } = hoveredBand;
    const matching = regions.filter((r) =>
      side === 'identity' ? r.identity_cluster === name : r.terroir_cluster === name
    );
    return { side, name, regions: matching };
  }, [hoveredBand, hoveredCell, selectedCell, regions]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="mb-4">
        <p className="text-ink-muted leading-relaxed max-w-3xl">
          Each region flows from its identity cluster (left) to its terroir cluster (right).
          Bands are sized by region count; ribbons by intersection count.
          The two systems agree where ribbons run flat — and disagree where they cross.
        </p>
      </div>

      <div className="bg-white border border-parchment-edge rounded-lg overflow-hidden">
        <div ref={containerRef} className="px-3 py-2">
          <svg ref={svgRef} />
        </div>
      </div>

      {/* Detail panel */}
      <div className="mt-4 min-h-[120px]">
        {activeCell && activeRegionList && (
          <CellDetail
            identity={activeCell.identity}
            terroir={activeCell.terroir}
            regions={activeRegionList}
            isPersistent={!!selectedCell}
            onClear={() => setSelectedCell(null)}
            onRegionClick={(name) => setSelectedRegion(name)}
            selectedRegion={selectedRegion}
          />
        )}
        {!activeCell && activeBandSummary && (
          <BandSummary {...activeBandSummary} />
        )}
        {!activeCell && !activeBandSummary && (
          <DefaultCaption stats={computeStats(model)} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panels
// ---------------------------------------------------------------------------

function CellDetail({ identity, terroir, regions, isPersistent, onClear, onRegionClick, selectedRegion }) {
  return (
    <div className="bg-white border border-parchment-edge rounded-lg p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
        <span
          className="pill"
          style={{ backgroundColor: IDENTITY_COLORS[identity] + '22', color: IDENTITY_COLORS[identity] }}
        >
          {identity}
        </span>
        <span className="text-ink-subtle">×</span>
        <span
          className="pill"
          style={{ backgroundColor: TERROIR_COLORS[terroir] + '22', color: TERROIR_COLORS[terroir] }}
        >
          {terroir}
        </span>
        <span className="text-sm text-ink-muted ml-2">
          {regions.length} {regions.length === 1 ? 'region' : 'regions'}
        </span>
        {isPersistent && (
          <button onClick={onClear} className="ml-auto text-xs text-wine hover:underline">
            clear selection
          </button>
        )}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {regions.map((r) => (
          <li key={r.name}>
            <button
              onClick={() => onRegionClick(r.name)}
              className={`w-full text-left p-2 rounded border transition-colors
                ${selectedRegion === r.name
                  ? 'border-wine bg-wine/5'
                  : 'border-parchment-edge hover:border-wine/40 hover:bg-parchment-warm'}`}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-base text-ink">{r.name}</span>
                <span className="text-xs text-ink-subtle">{r.country}</span>
              </div>
              <div className="text-sm text-ink-muted italic mt-0.5">{r.metaphor}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BandSummary({ side, name, regions }) {
  const colors = side === 'identity' ? IDENTITY_COLORS : TERROIR_COLORS;
  const otherKey = side === 'identity' ? 'terroir_cluster' : 'identity_cluster';
  const otherColors = side === 'identity' ? TERROIR_COLORS : IDENTITY_COLORS;

  // Distribution across the OTHER classification
  const dist = {};
  regions.forEach((r) => {
    dist[r[otherKey]] = (dist[r[otherKey]] || 0) + 1;
  });
  const distEntries = Object.entries(dist).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white border border-parchment-edge rounded-lg p-5">
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="pill"
          style={{ backgroundColor: colors[name] + '22', color: colors[name] }}
        >
          {name}
        </span>
        <span className="text-sm text-ink-muted">
          {regions.length} regions · spans {distEntries.length} {side === 'identity' ? 'terroir' : 'identity'} clusters
        </span>
      </div>
      <ul className="flex flex-wrap gap-2 mt-2">
        {distEntries.map(([key, count]) => (
          <li
            key={key}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded font-sans"
            style={{ backgroundColor: otherColors[key] + '18', color: otherColors[key] }}
          >
            <span className="font-medium">{key}</span>
            <span className="opacity-70">· {count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DefaultCaption({ stats }) {
  return (
    <div className="bg-parchment-warm border border-parchment-edge rounded-lg p-5">
      <p className="text-ink-muted leading-relaxed">
        <span className="font-medium text-ink">{stats.nonZero} of {stats.possible}</span> possible
        identity-terroir pairs contain at least one region.
        The largest single intersection holds <span className="font-medium text-ink">{stats.maxCell}</span> regions.
        Hover any band or ribbon to explore. Click a ribbon to pin its detail.
      </p>
    </div>
  );
}

function computeStats(model) {
  return {
    nonZero: model.cells.length,
    possible: IDENTITY_CLUSTERS.length * TERROIR_CLUSTERS.length,
    maxCell: Math.max(...model.cells.map((c) => c.count)),
  };
}

// ---------------------------------------------------------------------------
// Ribbon path — a smooth horizontal-S curve between two trapezoidal slices.
// Uses cubic Beziers in both directions so the ribbon edges meet the bands
// flat (vertical normals).
// ---------------------------------------------------------------------------

function ribbonPath(x1, x2, sY0, sY1, tY0, tY1) {
  const xc1 = x1 + (x2 - x1) * 0.45;
  const xc2 = x2 - (x2 - x1) * 0.45;

  return [
    `M ${x1} ${sY0}`,
    `C ${xc1} ${sY0}, ${xc2} ${tY0}, ${x2} ${tY0}`,
    `L ${x2} ${tY1}`,
    `C ${xc2} ${tY1}, ${xc1} ${sY1}, ${x1} ${sY1}`,
    'Z',
  ].join(' ');
}
