export function formatDateISO(dateString) {
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString()
  } catch {
    return dateString
  }
}
