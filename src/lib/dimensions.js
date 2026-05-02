// ---------------------------------------------------------------------------
// The six identity dimensions used in the Soul of Wine D-score system.
//
// Each dimension is scored from -2 to +2 by SME, where positive values lean
// toward the `pos` pole and negative values toward the `neg` pole. The
// dimension labels frame the contrast bidirectionally.
// ---------------------------------------------------------------------------

export const DIMENSIONS = [
  {
    key: 'D1',
    label: 'Interiority ↔ Exteriority',
    pos: 'Interior, place-defined',
    neg: 'Outward-facing, market-oriented',
  },
  {
    key: 'D2',
    label: 'Struggle ↔ Ease',
    pos: 'Extreme difficulty, endurance',
    neg: 'Pleasure, comfort, ease',
  },
  {
    key: 'D3',
    label: 'Tradition ↔ Reinvention',
    pos: 'Deep custodial tradition',
    neg: 'Radical reinvention, disruption',
  },
  {
    key: 'D4',
    label: 'Individual ↔ Collective',
    pos: 'Strongly individual, solitary',
    neg: 'Strongly collective, communal',
  },
  {
    key: 'D5',
    label: 'Urgency ↔ Timelessness',
    pos: 'Urgent, present-focused',
    neg: 'Timeless, eternal',
  },
  {
    key: 'D6',
    label: 'Earthly ↔ Transcendent',
    pos: 'Deeply grounded, earthly',
    neg: 'Transcendent, spiritual',
  },
];

// Helper: extract values in canonical D1..D6 order from a region record
export function dscoreVector(region) {
  return DIMENSIONS.map((d) => region[d.key]);
}
