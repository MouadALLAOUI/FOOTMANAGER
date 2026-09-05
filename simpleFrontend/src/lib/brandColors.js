// Fixed brand-color palette used across the app for team colors and
// profile-avatar fallback tiles. Stored by hex; persisted to the API
// as the raw hex string (users.avatar_color, teams.primary_color).
export const BRAND_COLORS = [
  { id: 'green', value: '#16a34a' },
  { id: 'emerald', value: '#059669' },
  { id: 'teal', value: '#0d9488' },
  { id: 'cyan', value: '#0891b2' },
  { id: 'sky', value: '#0284c7' },
  { id: 'blue', value: '#2563eb' },
  { id: 'indigo', value: '#4338ca' },
  { id: 'violet', value: '#7c3aed' },
  { id: 'purple', value: '#9333ea' },
  { id: 'fuchsia', value: '#c026d3' },
  { id: 'pink', value: '#db2777' },
  { id: 'rose', value: '#e11d48' },
  { id: 'red', value: '#dc2626' },
  { id: 'orange', value: '#ea580c' },
  { id: 'amber', value: '#d97706' },
  { id: 'yellow', value: '#ca8a04' },
  { id: 'lime', value: '#65a30d' },
  { id: 'slate', value: '#334155' },
]

export const DEFAULT_BRAND = '#16a34a'

// Normalizes a stored color: returns the raw value when it is one of the
// palette entries (ignoring case), otherwise the safe default.
export function brandFrom(value) {
  if (!value) return DEFAULT_BRAND
  const found = BRAND_COLORS.find((c) => c.value.toLowerCase() === String(value).toLowerCase())
  return found ? found.value : DEFAULT_BRAND
}