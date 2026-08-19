import { useEffect } from 'react'

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function removeMeta(attr, key) {
  document.head.querySelectorAll(`meta[${attr}="${key}"]`).forEach((el) => el.remove())
}

// Lightweight SEO helper: sets document title + meta description + Open Graph tags.
// No external framework — reuses the app's existing single-page architecture.
export default function useSeo({ title, description, image }) {
  useEffect(() => {
    const previousTitle = document.title
    const hadDescription = Boolean(document.head.querySelector('meta[name="description"]'))

    if (title) document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    if (image) setMeta('property', 'og:image', image)

    return () => {
      document.title = previousTitle
      removeMeta('property', 'og:title')
      removeMeta('property', 'og:description')
      removeMeta('property', 'og:type')
      removeMeta('property', 'og:image')
      if (!hadDescription) removeMeta('name', 'description')
    }
  }, [title, description, image])
}
