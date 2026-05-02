#!/usr/bin/env python3
"""
Precompute similarity matrices for Region Affinities.

Reads:
  public/data/regions.json        — D-scores per region
  public/data/terroir_pca.json    — PCA coordinates per region (terroir space)

Writes:
  public/data/similarities.json   — identity_sim[i][j] and terroir_sim[i][j]

Identity similarity: cosine on 6-D D-score vectors (zero-vector regions handled).
Terroir similarity: cosine on 2-D terroir PCA coordinates.

Identity neighbours and terroir neighbours are precomputed (top-5 each).
"""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"

# ---------------------------------------------------------------------------
# Load source data
# ---------------------------------------------------------------------------

with open(DATA / "regions.json") as f:
    regions_data = json.load(f)

with open(DATA / "terroir_pca.json") as f:
    terroir_pca = json.load(f)

with open(DATA / "terroir_clusters.json") as f:
    terroir_clusters = json.load(f)

regions = regions_data["regions"]

# Index by region name for cross-file lookups
pca_by_name = {p["name"]: p for p in terroir_pca}

# ---------------------------------------------------------------------------
# Reconcile: build a single canonical region list with all attributes
# ---------------------------------------------------------------------------

canonical = []
for r in regions:
    name = r["region"]
    pca_entry = pca_by_name.get(name)
    if pca_entry is None:
        raise ValueError(f"No PCA entry for {name}")

    # Country naming: prefer the long-form ('South Africa' over 'S. Africa')
    country = r["country"]
    if country == "S. Africa":
        country = "South Africa"

    canonical.append({
        "id": r["id"],
        "name": name,
        "country": country,
        "world": r["world"],
        "metaphor": r["metaphor"],
        "identity_cluster": r["cluster"],     # source of truth: regions.json
        "terroir_cluster": terroir_clusters[name],
        "D1": r["D1"], "D2": r["D2"], "D3": r["D3"],
        "D4": r["D4"], "D5": r["D5"], "D6": r["D6"],
        "terroir_pc1": pca_entry["pc1"],
        "terroir_pc2": pca_entry["pc2"],
    })

print(f"Canonical region list: {len(canonical)} regions")

# ---------------------------------------------------------------------------
# Cosine similarity helper
# ---------------------------------------------------------------------------

def cosine(a, b):
    """Cosine similarity between two equal-length vectors. Returns 0 for zero-vector inputs."""
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)

# ---------------------------------------------------------------------------
# Compute pairwise similarities
# ---------------------------------------------------------------------------

n = len(canonical)
identity_vecs = [[r["D1"], r["D2"], r["D3"], r["D4"], r["D5"], r["D6"]] for r in canonical]
terroir_vecs = [[r["terroir_pc1"], r["terroir_pc2"]] for r in canonical]

identity_sim = [[0.0] * n for _ in range(n)]
terroir_sim = [[0.0] * n for _ in range(n)]

for i in range(n):
    for j in range(n):
        if i == j:
            identity_sim[i][j] = 1.0
            terroir_sim[i][j] = 1.0
        elif j > i:
            s_id = cosine(identity_vecs[i], identity_vecs[j])
            s_te = cosine(terroir_vecs[i], terroir_vecs[j])
            identity_sim[i][j] = identity_sim[j][i] = round(s_id, 4)
            terroir_sim[i][j] = terroir_sim[j][i] = round(s_te, 4)

# ---------------------------------------------------------------------------
# Top-K neighbours for each region in each space
# ---------------------------------------------------------------------------

K = 5

def top_k(sim_row, exclude_idx, k):
    pairs = [(j, s) for j, s in enumerate(sim_row) if j != exclude_idx]
    pairs.sort(key=lambda x: x[1], reverse=True)
    return pairs[:k]

identity_neighbours = []
terroir_neighbours = []

for i, r in enumerate(canonical):
    id_nb = top_k(identity_sim[i], i, K)
    te_nb = top_k(terroir_sim[i], i, K)

    identity_neighbours.append({
        "region": r["name"],
        "neighbours": [
            {"name": canonical[j]["name"], "similarity": round(s, 4)}
            for j, s in id_nb
        ],
    })
    terroir_neighbours.append({
        "region": r["name"],
        "neighbours": [
            {"name": canonical[j]["name"], "similarity": round(s, 4)}
            for j, s in te_nb
        ],
    })

# ---------------------------------------------------------------------------
# Cross-space disagreement: regions whose identity neighbours and terroir
# neighbours have minimal overlap. This is rhetorically powerful — it is the
# independence finding made personal.
# ---------------------------------------------------------------------------

disagreement = []
for i, r in enumerate(canonical):
    id_set = {n["name"] for n in identity_neighbours[i]["neighbours"]}
    te_set = {n["name"] for n in terroir_neighbours[i]["neighbours"]}
    overlap = len(id_set & te_set)
    disagreement.append({
        "region": r["name"],
        "overlap": overlap,
        "identity_only": sorted(id_set - te_set),
        "terroir_only": sorted(te_set - id_set),
    })

zero_overlap = [d for d in disagreement if d["overlap"] == 0]
print(f"Regions with zero overlap between top-5 identity and top-5 terroir neighbours: {len(zero_overlap)} / {n}")

# ---------------------------------------------------------------------------
# Write canonical output
# ---------------------------------------------------------------------------

output = {
    "metadata": {
        "n_regions": n,
        "k_identity": 6,
        "k_terroir": 7,
        "silhouette_identity": 0.3029,
        "silhouette_terroir": 0.2457,
        "ari": 0.023,
        "chi_squared": 38.776,
        "chi_squared_p": 0.131,
        "neighbour_k": K,
    },
    "regions": canonical,
    "identity_similarity": identity_sim,
    "terroir_similarity": terroir_sim,
    "identity_neighbours": identity_neighbours,
    "terroir_neighbours": terroir_neighbours,
    "disagreement": disagreement,
}

OUT = DATA / "similarities.json"
with open(OUT, "w") as f:
    json.dump(output, f, indent=2)

print(f"Wrote {OUT}")
print(f"  Regions: {n}")
print(f"  Identity matrix: {n}x{n}")
print(f"  Terroir matrix: {n}x{n}")
print(f"  Identity neighbours: top-{K} per region")
print(f"  Terroir neighbours: top-{K} per region")
