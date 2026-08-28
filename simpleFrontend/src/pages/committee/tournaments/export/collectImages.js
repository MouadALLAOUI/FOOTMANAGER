import { logoThumb, coverThumb } from '../../../../lib/thumb'

export function collectImageUrls(data) {
  const set = new Set()
  const add = (u) => {
    if (u && typeof u === 'string' && u.trim()) set.add(u.trim())
  }
  const { tournament, teams, standings, news, gallery, sponsors, partners } = data || {}
  add(tournament?.logo_url)
  ;(teams || []).forEach((p) => add(logoThumb(p.team)))
  ;(standings?.groups || []).forEach((g) => (g.rows || []).forEach((r) => add(logoThumb(r.team))))
  ;(news || []).forEach((n) => add(coverThumb(n)))
  ;(gallery || []).forEach((im) => add(im.thumbnail_url || im.image_url))
  ;(sponsors || []).forEach((s) => add(s.logo_url))
  ;(partners || []).forEach((p) => add(p.logo_url))
  return [...set]
}

export async function validateImages(urls, { concurrency = 6 } = {}) {
  const valid = new Set()
  let i = 0
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (i < urls.length) {
      const idx = i++
      const u = urls[idx]
      try {
        const res = await fetch(u, { method: 'GET', mode: 'cors' })
        if (res.ok) valid.add(u)
      } catch {
        /* not embeddable -> drop */
      }
    }
  })
  await Promise.all(workers)
  return valid
}
