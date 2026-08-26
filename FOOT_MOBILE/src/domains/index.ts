export const domains = [
  'public',
  'auth',
  'player',
  'manager',
  'terrain',
  'committee',
  'admin',
] as const;

export type Domain = (typeof domains)[number];
