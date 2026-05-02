// ---------------------------------------------------------------------------
// Region Affinities — colour system
//
// Wine-red is the project accent (#7B2D26). Cluster palettes are chosen for
// (a) clear distinguishability on parchment, (b) a tonal family that doesn't
// shout, (c) accessibility on white and on hover states.
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
  'The Moderates':          '#6B7166', // sage-grey — balanced equilibrium
  'Outward Ease':           '#C18A4A', // warm ochre — generous, sunlit
  'New World Reinvention':  '#3F6B7A', // slate-teal — constructed, intentional
};

// Terroir clusters — seven tones, lighter overall to read as "ground" beneath
// the bolder identity layer.
export const TERROIR_COLORS = {
  'French Viticultural':                '#A8857A',
  'Germanic Rhine':                     '#8AA29F',
  'Austrian Danube':                    '#A6B19A',
  'Iberian Continental':                '#B58860',
  'Mediterranean & Volcanic':           '#C5704A',
  'American West Coast':                '#7BA0A8',
  'Southern Hemisphere & International': '#9B8AA8',
};

export const IDENTITY_CLUSTERS = Object.keys(IDENTITY_COLORS);
export const TERROIR_CLUSTERS = Object.keys(TERROIR_COLORS);
