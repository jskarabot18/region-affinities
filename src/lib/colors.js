// ---------------------------------------------------------------------------
// Region Affinities — colour system
//
// Wine-red is the project accent (#7B2D26). Cluster palettes are chosen for
// (a) clear distinguishability on parchment and white, (b) a tonal family
// that doesn't shout, (c) accessibility on hover/active states, and
// (d) text-legibility for cluster labels on white SVG.
// ---------------------------------------------------------------------------

export const WINE = '#7B2D26';
export const PARCHMENT = '#FAF7F2';
export const INK = '#1F1A17';

// Identity clusters — six tones, ordered to match the project's narrative arc
// from inward-traditional (deep) to outward-reinventing (bright/light).
export const IDENTITY_COLORS = {
  'Old World Interior':     '#5C2E2A', // deep claret — inward, devotional
  'Old World Exterior':     '#A14A3F', // brick — outward but tradition-anchored
  'Against the Odds':       '#8B5A2B', // umber — earthy struggle
  'The Moderates':          '#566159', // darker sage — balanced equilibrium (was #6B7166)
  'Outward Ease':           '#B07635', // warm ochre, slightly darker (was #C18A4A)
  'New World Reinvention':  '#3F6B7A', // slate-teal — constructed, intentional
};

// Terroir clusters — seven tones, lighter overall to read as "ground" beneath
// the bolder identity layer, but adjusted for legibility on white.
export const TERROIR_COLORS = {
  'French Viticultural':                '#956E61', // slightly darker (was #A8857A)
  'Germanic Rhine':                     '#6F8A87', // darker sage-teal (was #8AA29F)
  'Austrian Danube':                    '#8C9978', // darker olive (was #A6B19A)
  'Iberian Continental':                '#A07750', // burnt sienna (was #B58860)
  'Mediterranean & Volcanic':           '#B65F3F', // terracotta (was #C5704A)
  'American West Coast':                '#5F8590', // cooler slate (was #7BA0A8)
  'Southern Hemisphere & International': '#86749A', // dusty plum (was #9B8AA8)
};

export const IDENTITY_CLUSTERS = Object.keys(IDENTITY_COLORS);
export const TERROIR_CLUSTERS = Object.keys(TERROIR_COLORS);
