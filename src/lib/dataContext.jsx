import { createContext, useContext, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// DataContext
//
// Loads similarities.json once and provides:
//   regions                — canonical 59-region list with both clusters + scores
//   identitySimilarity     — n×n cosine matrix on D-scores
//   terroirSimilarity      — n×n cosine matrix on terroir PCA coords
//   identityNeighbours     — top-5 identity kin per region
//   terroirNeighbours      — top-5 terroir kin per region
//   disagreement           — overlap stats per region
//   metadata               — pipeline statistics (silhouette, ARI, etc.)
//   selectedRegion / setSelectedRegion — cross-tab selection state
//
// Note: similarities.json uses snake_case keys (Python-generated). We alias
// to camelCase here so JS components can use idiomatic property names.
// ---------------------------------------------------------------------------

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);

  useEffect(() => {
    // Vite resolves base path automatically via import.meta.env.BASE_URL
    const url = `${import.meta.env.BASE_URL}data/similarities.json`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((raw) => {
        // Map snake_case JSON keys to camelCase
        setData({
          metadata: raw.metadata,
          regions: raw.regions,
          identitySimilarity: raw.identity_similarity,
          terroirSimilarity: raw.terroir_similarity,
          identityNeighbours: raw.identity_neighbours,
          terroirNeighbours: raw.terroir_neighbours,
          disagreement: raw.disagreement,
        });
      })
      .catch(setError);
  }, []);

  if (error) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl text-wine mb-2">Data load error</h2>
        <p className="text-ink-muted">{error.message}</p>
        <p className="text-sm text-ink-subtle mt-4">
          Check that <code>public/data/similarities.json</code> was generated
          by running <code>python3 scripts/precompute_similarities.py</code>.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center text-ink-muted">
        <p className="small-caps">Loading</p>
      </div>
    );
  }

  return (
    <DataContext.Provider value={{ ...data, selectedRegion, setSelectedRegion }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
