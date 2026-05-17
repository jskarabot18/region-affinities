# Region Affinities

> Kinship in identity, kinship in terroir, and where they part ways.
> An interactive companion to **The Soul of Wine** — a study of cultural identity across 59 wine regions.

🔗 **Live tool:** [jskarabot18.github.io/region-affinities](https://jskarabot18.github.io/region-affinities/) 📖 **Parent study:** [The Soul of Wine](https://jskarabot18.github.io/soul-of-wine/) 🍇 **Vinotheca:** [jskarabot18.github.io/vinotheca](https://jskarabot18.github.io/vinotheca/)

---

## The question

If you measured 59 wine regions on **two completely different things** — their *cultural identity* (how the place narrates itself: solitary or social, traditional or restless, struggling or at ease) and their *terroir* (climate, soil, latitude, viticultural infrastructure) — would the two measurements agree?

Would Bordeaux's *identity twins* (regions with similar cultural personality) be the same regions as its *terroir twins* (regions with similar physical conditions)?

The Soul of Wine study finds that they do not. Identity and terroir are independent classification systems. **The map is not the soul.**

Region Affinities is the interactive surface where you can see this for yourself — region by region, kin by kin, side by side.

---

## Four ways in

### Dual Networks · *kinship in both systems, side by side*

Two force-directed graphs of the same 59 regions, with edges drawn between each region and its top 5 nearest kin. The left graph uses identity similarity; the right graph uses terroir similarity. Hover any region — both networks light up the same name and its kin in each system. The mismatch is visible at a glance.

[![Dual Networks tab](https://github.com/jskarabot18/region-affinities/raw/main/docs/screenshots/01-dual-networks.png)](/jskarabot18/region-affinities/blob/main/docs/screenshots/01-dual-networks.png)

### Identity ↔ Terroir · *the bipartite map between the two systems*

A ribbon diagram showing how the 6 identity clusters distribute across the 7 terroir clusters. Some clusters bunch into a single terroir family (Old World Interior is mostly French and Germanic terroir). Others scatter completely (Against the Odds spans every continent and almost every terroir family). The diagram lets you read the cross-tabulation as flow.

[![Identity ↔ Terroir tab](https://github.com/jskarabot18/region-affinities/raw/main/docs/screenshots/02-bipartite-flow.png)](/jskarabot18/region-affinities/blob/main/docs/screenshots/02-bipartite-flow.png)

### Region Atlas · *one region at full depth*

Pick any of the 59 regions. See its 6-axis identity radar, both cluster assignments, the metaphor that captures its character (Burgundy → *Devotion*, Santorini → *Survival*, Tokaj → *Melancholy*), and its top 5 kin in each system — with shared kin highlighted. Click any kin to jump to that region's profile.

[![Region Atlas tab](https://github.com/jskarabot18/region-affinities/raw/main/docs/screenshots/03-region-atlas.png)](/jskarabot18/region-affinities/blob/main/docs/screenshots/03-region-atlas.png)

### Comparison · *2 to 4 regions overlaid*

Build a small comparison set and see the radar shapes layered. Sicily and Central Otago overlap nearly perfectly in identity profile despite being on opposite sides of the equator and having nothing in common terroir-wise. The tool defaults to that pairing because it makes the central thesis tangible in a single glance.

[![Comparison tab](https://github.com/jskarabot18/region-affinities/raw/main/docs/screenshots/04-comparison.png)](/jskarabot18/region-affinities/blob/main/docs/screenshots/04-comparison.png)

---

## How it works

### The data

- **59 regions** across 16 countries, 39 Old World and 20 New World
- Each region is assigned a one-word **metaphor** that captures its cultural character (e.g. Burgundy → *Devotion*, Beaujolais → *Joy*, Sicily → *Resurrection*)
- Each region is scored on **six identity dimensions** (D1–D6) by structured expert judgment, each on a -2 to +2 scale:
  * **D1** Interiority ↔ Exteriority
  * **D2** Struggle ↔ Ease
  * **D3** Tradition ↔ Reinvention
  * **D4** Individual ↔ Collective
  * **D5** Urgency ↔ Timelessness
  * **D6** Earthly ↔ Transcendent
- Each region is *separately* described in a factual terroir narrative (climate, soils, varieties, viticultural structure)


### The two pipelines

**Identity clustering.** The six D-scores are standardised and clustered with k-means into 6 identity types: *Old World Interior · Old World Exterior · The Moderates · Outward Ease · Against the Odds · New World Reinvention*.

**Terroir clustering.** The factual terroir descriptions are converted to TF-IDF vectors, compressed via PCA into 10 dimensions, then clustered with k-means into 7 terroir families: *Mediterranean & Volcanic · French Viticultural · Iberian Continental · Germanic Rhine · Austrian Danube · American West Coast · Southern Hemisphere & International*.

The two pipelines never share data. Each region ends up with one identity cluster and one terroir cluster. The question is whether the assignments agree.

### Independence test

Statistical comparison of the two cluster solutions yields **ARI ≈ 0.023** and **chi-square p-value well above 0.05** — meaning the two systems are essentially independent. Knowing a region's terroir cluster gives you almost no information about its identity cluster.

This independence is what makes the kinship comparisons in Region Affinities surprising. Bordeaux's identity kin and terroir kin are largely different regions. So are Burgundy's. So are Mosel's. Of the 59 regions, **29 (49%) have zero overlap** between their top-5 identity kin and their top-5 terroir kin.

### Read the research

The Work's documentation — the four canonical PDFs shared between Region Affinities and The Soul of Wine — is shipped from this repo at `public/docs/` and surfaced via the **Documentation** dropdown in the top right of every page:

- **[Summary](https://jskarabot18.github.io/region-affinities/docs/SoulOfWine_Summary.pdf)** — plain-language overview of the question, the data, the methodology, the findings, and the principal cluster contents
- **[Technical Appendix](https://jskarabot18.github.io/region-affinities/docs/SoulOfWine_Technical_Appendix.pdf)** — mathematical framework, algorithms, and implementation: encoding maps, dimensionality reduction and clustering pipelines, similarity construction, and the formal statistical tests of independence
- **[Methods Primer](https://jskarabot18.github.io/region-affinities/docs/SoulOfWine_Methods_Primer.pdf)** — non-technical guide to TF-IDF, PCA, K-means, silhouette, ARI, and the chi-squared test
- **[Data Appendix](https://jskarabot18.github.io/region-affinities/docs/SoulOfWine_Data_Appendix.pdf)** — complete D-score matrix, cluster membership, pipeline parameters, SME review change log, source materials

Plus the two Region Reference documents hosted on the Soul of Wine repo:

- **[Region Reference — Identity](https://jskarabot18.github.io/soul-of-wine/docs/layer1-descriptions.pdf)** — the 59 anthropological identity narratives
- **[Region Reference — Terroir](https://jskarabot18.github.io/soul-of-wine/docs/layer2-descriptions.pdf)** — the 59 factual terroir profiles

The four canonical PDFs ship with title "The Soul of Wine" because the Study is the scholarly artefact and the Tool is the interactive surface; both faces of the Work share the same supporting documentation (per Vinotheca §2). The same four files are byte-identical at `soul-of-wine/docs/`.

The narrative paper of the study — **[The Map and the Soul](https://jskarabot18.github.io/soul-of-wine/docs/SoulOfWine_Narrative.pdf)** — lives on the Soul of Wine site as a study-class artefact alongside the canonical four.

---

## Getting Started

### Prerequisites

- **Node.js 18+** ([download](https://nodejs.org/))
- **npm** (ships with Node.js)
- **git**


### Local development

```
# Clone the repo
git clone https://github.com/jskarabot18/region-affinities.git
cd region-affinities

# Install dependencies
npm install

# Start the dev server (hot reload)
npm run dev
```

The dev server runs on `http://localhost:5173` by default. Vite will print the actual URL in your terminal.

### Build for production

```
npm run build
```

Output is written to `dist/`. The build is fully static — every page, asset, and data file is pre-rendered at build time.

### Preview the production build locally

```
npm run preview
```

Useful for sanity-checking the production bundle before pushing.

### Deploy

Deployment is automatic. Push to the `main` branch and the GitHub Action defined in `.github/workflows/deploy.yml` builds the site and pushes the output to the `gh-pages` branch, which GitHub Pages serves at `https://jskarabot18.github.io/region-affinities/`.

```
git push origin main
# Wait ~30-60 seconds for GitHub Actions to complete
# Then hard-refresh the browser (Cmd+Shift+R / Ctrl+Shift+R)
```

You can monitor build status at the [Actions tab](https://github.com/jskarabot18/region-affinities/actions).

---

## Project structure

```
region-affinities/
├── public/
│   ├── data/                       # Pre-computed similarity data (59 regions, ~250KB)
│   │   ├── regions.json
│   │   ├── identity_pca.json
│   │   ├── terroir_clusters.json
│   │   ├── terroir_pca.json
│   │   └── similarities.json
│   ├── docs/                       # Canonical 4-PDF set (shared with The Soul of Wine)
│   │   ├── SoulOfWine_Summary.pdf
│   │   ├── SoulOfWine_Technical_Appendix.pdf
│   │   ├── SoulOfWine_Methods_Primer.pdf
│   │   └── SoulOfWine_Data_Appendix.pdf
│   └── favicon.svg
├── docs-source/                    # LaTeX sources for the four canonical PDFs
│   ├── SoulOfWine_Summary.tex
│   ├── SoulOfWine_Technical_Appendix.tex
│   ├── SoulOfWine_Methods_Primer.tex
│   ├── SoulOfWine_Data_Appendix.tex
│   └── vinotheca.sty               # Shared Vinotheca LaTeX package
├── scripts/
│   └── precompute_similarities.py  # Re-run to regenerate similarities.json
├── src/
│   ├── App.jsx                     # Tab router
│   ├── main.jsx                    # Entry point
│   ├── components/
│   │   ├── Header.jsx              # Top banner + Documentation dropdown
│   │   ├── Footer.jsx              # in vino, cognitio
│   │   ├── DualNetworks.jsx        # Tab 1: side-by-side force graphs
│   │   ├── BipartiteFlow.jsx       # Tab 2: identity ↔ terroir ribbons
│   │   ├── RegionAtlas.jsx         # Tab 3: per-region detail
│   │   ├── Comparison.jsx          # Tab 4: multi-region overlay
│   │   └── RadarChart.jsx          # Reusable D3 radar
│   ├── lib/
│   │   ├── colors.js               # Cluster palettes
│   │   ├── dimensions.js           # D1-D6 definitions
│   │   └── dataContext.jsx         # Loads + provides the data
│   └── styles/
│       └── index.css               # Tailwind + EB Garamond
├── .github/workflows/
│   └── deploy.yml                  # Auto-deploy on push to main
└── package.json
```

---

## Tech stack

- **React 18** + **Vite** — frontend framework + build tool
- **D3.js** — force-directed graphs, ribbons, radar charts
- **Tailwind CSS** — utility styling, EB Garamond serif + Inter sans
- **GitHub Pages** — static hosting via auto-deploy GitHub Action
- **LaTeX** — documentation source (canonical `vinotheca.sty` package, builds via `pdflatex` from inside `docs-source/`)

---

## License

Code: [MIT](https://github.com/jskarabot18/region-affinities/blob/main/LICENSE) Study & narrative content: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)

---

## Correspondence

Questions, comments, corrections — <hello@codexvini.com>

*in vino, cognitio*

© Jure Skarabot · MMXXVI
