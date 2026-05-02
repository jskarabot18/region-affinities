import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { WINE } from '../lib/colors.js';

// ---------------------------------------------------------------------------
// RadarChart — six-axis radar for D-score profiles.
//
// The viewBox is intentionally WIDER than tall to leave horizontal gutters
// for long axis labels like "INTERIORITY ↔ EXTERIORITY" and "TRADITION ↔
// REINVENTION", which need ~80–110px of label width on the left and right
// without compromising the radar's drawn radius.
// ---------------------------------------------------------------------------

const SCORE_MIN = -2;
const SCORE_MAX = 2;
const RINGS = [-2, -1, 0, 1, 2];

// Horizontal label gutter on each side of the chart.
// Long words like "EXTERIORITY" (11 chars * ~6.5px @ 10pt) need ~75px;
// pad to 90 for safety.
const LABEL_GUTTER = 90;

export default function RadarChart({
  datasets = [],
  dimensions,
  size = 420,
  showAxisLabels = true,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Drawing area uses `size` as both width and height.
    // viewBox is wider than tall: -GUTTER to size+GUTTER on x.
    const drawW = size;
    const drawH = size;
    const totalW = drawW + 2 * LABEL_GUTTER;
    const totalH = drawH + 20; // small vertical pad for top/bottom labels

    const cx = LABEL_GUTTER + drawW / 2;
    const cy = drawH / 2 + 10;
    const radius = drawW * 0.36; // larger radius now that we have label room

    svg
      .attr('viewBox', [0, 0, totalW, totalH])
      // Keep aspect natural so SVG scales to its parent's width
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto')
      .style('max-width', `${totalW}px`);

    const n = dimensions.length;
    const angleFor = (i) => (i / n) * 2 * Math.PI - Math.PI / 2;

    const radiusFor = (score) => {
      const norm = (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
      return norm * radius;
    };

    // ---- Background rings ----
    const ringGroup = svg.append('g').attr('class', 'rings');
    RINGS.forEach((ring) => {
      const r = radiusFor(ring);
      const points = d3.range(n).map((i) => {
        const a = angleFor(i);
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      });
      const closed = [...points, points[0]];
      const isEquator = ring === 0;
      ringGroup
        .append('polygon')
        .attr('points', closed.map((p) => p.join(',')).join(' '))
        .attr('fill', 'none')
        .attr('stroke', isEquator ? '#9A9089' : '#E8E1D3')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', isEquator ? '4 3' : '0');
    });

    // ---- Axes ----
    const axisGroup = svg.append('g').attr('class', 'axes');
    dimensions.forEach((dim, i) => {
      const a = angleFor(i);
      const x = cx + radius * Math.cos(a);
      const y = cy + radius * Math.sin(a);
      axisGroup
        .append('line')
        .attr('x1', cx)
        .attr('y1', cy)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#D6CDC1')
        .attr('stroke-width', 1);
    });

    // ---- Axis labels (two-line, no polarity hints) ----
    if (showAxisLabels) {
      const labelGroup = svg.append('g').attr('class', 'axis-labels');
      dimensions.forEach((dim, i) => {
        const a = angleFor(i);
        const labelRadius = radius + 18;
        const x = cx + labelRadius * Math.cos(a);
        const y = cy + labelRadius * Math.sin(a);

        let anchor = 'middle';
        const ax = Math.cos(a);
        if (ax > 0.3) anchor = 'start';
        else if (ax < -0.3) anchor = 'end';

        const parts = dim.label.split(' ↔ ');

        // baseline shift: above-axis labels need to lift, below need to drop
        const ay = Math.sin(a);
        const lineHeight = 12;
        const baselineShift = ay < -0.5 ? -lineHeight - 2 : ay > 0.5 ? 4 : -lineHeight / 2;

        const text = labelGroup.append('text')
          .attr('x', x)
          .attr('y', y + baselineShift)
          .attr('text-anchor', anchor)
          .attr('font-family', 'Inter, system-ui, sans-serif')
          .attr('font-size', 10)
          .attr('font-weight', 600)
          .attr('letter-spacing', '0.04em')
          .attr('fill', '#5C534D');

        text.append('tspan')
          .attr('x', x)
          .attr('dy', '0em')
          .text(parts[0].toUpperCase());
        text.append('tspan')
          .attr('x', x)
          .attr('dy', '1.15em')
          .attr('fill', '#9A9089')
          .text(`↔ ${parts[1] ? parts[1].toUpperCase() : ''}`);
      });
    }

    // ---- Score scale labels (on top axis, just to right of centre) ----
    const scaleGroup = svg.append('g').attr('class', 'scale-labels');
    RINGS.forEach((ring) => {
      const r = radiusFor(ring);
      scaleGroup
        .append('text')
        .attr('x', cx + 5)
        .attr('y', cy - r)
        .attr('dy', '0.35em')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('font-size', 9)
        .attr('fill', '#9A9089')
        .text(ring > 0 ? `+${ring}` : `${ring}`);
    });

    // ---- Datasets ----
    const dataGroup = svg.append('g').attr('class', 'data');
    datasets.forEach((ds) => {
      const points = ds.values.map((v, i) => {
        const a = angleFor(i);
        const r = radiusFor(v);
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      });
      const closed = [...points, points[0]];
      const color = ds.color || WINE;
      const fillOpacity = ds.fillOpacity ?? 0.18;

      dataGroup
        .append('polygon')
        .attr('points', closed.map((p) => p.join(',')).join(' '))
        .attr('fill', color)
        .attr('fill-opacity', fillOpacity)
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-linejoin', 'round');

      points.forEach(([x, y]) => {
        dataGroup
          .append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 3.5)
          .attr('fill', color)
          .attr('stroke', '#FAF7F2')
          .attr('stroke-width', 1.5);
      });
    });
  }, [datasets, dimensions, size, showAxisLabels]);

  return <svg ref={svgRef} />;
}
