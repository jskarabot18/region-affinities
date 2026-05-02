import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { WINE } from '../lib/colors.js';

// ---------------------------------------------------------------------------
// RadarChart — six-axis radar for D-score profiles.
//
// Inputs:
//   datasets: array of { values: [D1..D6], label, color, fillOpacity }
//   dimensions: array of { key, label, pos, neg } in order D1..D6
//   size: square SVG side length in px (default 420)
//
// Score range hard-coded to [-2, +2]. Concentric polygons at integer values,
// equator (0) emphasized with a dashed stroke. Axes radiate from centre at
// 60° intervals starting from top.
// ---------------------------------------------------------------------------

const SCORE_MIN = -2;
const SCORE_MAX = 2;
const RINGS = [-2, -1, 0, 1, 2];

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

    const cx = size / 2;
    const cy = size / 2;
    // Reserve 30% of half-size for the label margin around the chart.
    // Radius is 32% of size — leaves comfortable label gutter on all sides.
    const radius = size * 0.32;

    svg
      .attr('viewBox', [0, 0, size, size])
      .attr('width', size)
      .attr('height', size);

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

    // ---- Axis labels ----
    // Two-line labels: positive pole on top, ↔, negative pole on bottom.
    // We position the label group at radius+18, then handle multi-line text
    // explicitly so we can control wrapping and avoid clipping.
    if (showAxisLabels) {
      const labelGroup = svg.append('g').attr('class', 'axis-labels');
      dimensions.forEach((dim, i) => {
        const a = angleFor(i);
        const labelRadius = radius + 22;
        const x = cx + labelRadius * Math.cos(a);
        const y = cy + labelRadius * Math.sin(a);

        // Anchor based on horizontal position of the label
        let anchor = 'middle';
        const ax = Math.cos(a);
        if (ax > 0.3) anchor = 'start';
        else if (ax < -0.3) anchor = 'end';

        // Split label like "Interiority ↔ Exteriority" into two parts
        const parts = dim.label.split(' ↔ ');

        // Position adjusts vertically: above-axis labels need to lift; below-axis labels drop
        const ay = Math.sin(a);
        const lineHeight = 12;
        // baseline shift so multi-line label is visually centred on the anchor point
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

    // ---- Score scale labels (on top axis) ----
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

    // ---- Datasets (filled polygons) ----
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
