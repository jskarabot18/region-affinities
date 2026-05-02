# Region Affinities

> Kinship in identity, kinship in terroir, and where they part ways.

An interactive companion tool to **[The Soul of Wine](https://jskarabot18.github.io/soul-of-wine/)**. Region Affinities lets you explore the two independent classification systems — identity (k=6) and terroir (k=7) — across all 59 wine regions in the study.

🔗 **[Open the tool →](https://jskarabot18.github.io/region-affinities/)**

---

## The four views

| View | What it shows |
|---|---|
| **Dual Networks** | Side-by-side force-directed graphs. Same 59 regions, two similarity models. The argument made visible. |
| **Identity ↔ Terroir** | Bipartite chord linking the two cluster systems. The tangle is the independence finding. |
| **Region Atlas** | Per-region detail: D-score radar, identity kin (top 5), terroir kin (top 5), and the divergence between them. |
| **Comparison** | Overlay 2–4 regions on a shared radar to compare profiles directly. |

## Project context

Region Affinities is one of two outputs from the Soul of Wine project:

- **The Study** — argument, methodology, findings → [`soul-of-wine`](https://github.com/jskarabot18/soul-of-wine)
- **The Tool** — interactive exploration of the structure → this repo

The Study makes the argument; the Tool makes it explorable. They share the same canonical data.

## Tech stack

- **Vite + React 18** — UI framework and build
- **D3.js** — visualization primitives (force, scales, shapes)
- **Tailwind CSS** — utility-first styling, wine-red palette (#7B2D26)
- **GitHub Actions + Pages** — auto-deploy on push to `main`

## Local development

You only need this if you want to preview changes before pushing.

```bash
# Requires Node.js 20+
npm install
npm run dev          # http://localhost:5173
npm run build        # builds to dist/
```

## Regenerating data

The tool reads a single derived file: `public/data/similarities.json`. It's generated from the canonical Soul of Wine data files (`regions.json`, `terroir_clusters.json`, `terroir_pca.json`) by a Python script:

```bash
python3 scripts/precompute_similarities.py
```

This computes pairwise cosine similarities, top-5 kin in each system, and the per-region overlap statistics that drive the divergence views. Re-run only when the canonical data changes.

## Source data

All region-level data is canonical and derived from the Soul of Wine study (Pass 5, post-SME review):

- 59 regions across 16 countries
- 6 identity dimensions, scored −2 to +2 by SME
- k=6 identity clusters (D-scores → PCA → k-means)
- k=7 terroir clusters (Layer 2 TF-IDF → fully model-derived)
- ARI = 0.023, χ² p = 0.131 — the two systems are statistically independent

## License

Source-available, CC BY-NC 4.0. Free for personal and non-commercial use.

---

*Companion tool to The Soul of Wine — Jure Skarabot, 2026.*
