import { useEffect } from 'react'

/**
 * Lightweight and zero-dependency SEO updater for SPA routes.
 * Dynamically updates document.title, meta description, keywords, canonical, and OpenGraph tags.
 */
export default function SEO({
  title,
  description,
  keywords,
  canonical,
  image = 'https://ajin9essro.com/logo.jpeg',
}) {
  useEffect(() => {
    // 1. Update Document Title
    const baseTitle = 'أجي نقصرو | Aji Nqssro'
    if (title) {
      document.title = title.includes('أجي نقصرو') ? title : `${title} | ${baseTitle}`
    }

    // Helper to update or create a meta tag
    const updateMeta = (selector, attribute, value) => {
      if (!value) return
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        const [attrName, attrVal] = selector.replace('meta[', '').replace(']', '').split('=')
        el.setAttribute(attrName, attrVal.replace(/"/g, ''))
        document.head.appendChild(el)
      }
      el.setAttribute(attribute, value)
    }

    // 2. Meta Description
    if (description) {
      updateMeta('meta[name="description"]', 'content', description)
      updateMeta('meta[property="og:description"]', 'content', description)
      updateMeta('meta[name="twitter:description"]', 'content', description)
    }

    // 3. Meta Keywords
    if (keywords) {
      updateMeta('meta[name="keywords"]', 'content', keywords)
    }

    // 4. OpenGraph Title
    if (title) {
      updateMeta('meta[property="og:title"]', 'content', document.title)
      updateMeta('meta[name="twitter:title"]', 'content', document.title)
    }

    // 5. OpenGraph Image
    if (image) {
      updateMeta('meta[property="og:image"]', 'content', image)
      updateMeta('meta[name="twitter:image"]', 'content', image)
    }

    // 6. Canonical URL
    if (canonical) {
      let linkEl = document.querySelector('link[rel="canonical"]')
      if (!linkEl) {
        linkEl = document.createElement('link')
        linkEl.setAttribute('rel', 'canonical')
        document.head.appendChild(linkEl)
      }
      linkEl.setAttribute('href', canonical)
      updateMeta('meta[property="og:url"]', 'content', canonical)
      updateMeta('meta[name="twitter:url"]', 'content', canonical)
    }
  }, [title, description, keywords, canonical, image])

  return null
}
