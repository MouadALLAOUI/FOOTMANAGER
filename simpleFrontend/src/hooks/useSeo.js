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

function setLink(rel, href) {
  if (!href) return
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function removeMeta(attr, key) {
  document.head.querySelectorAll(`meta[${attr}="${key}"]`).forEach((el) => el.remove())
}

// Lightweight SEO hook: sets document title, meta description, keywords, canonical, and Open Graph / Twitter tags.
export default function useSeo({
  title,
  description,
  keywords,
  canonical,
  image = 'https://ajin9essro.com/logo.jpeg',
}) {
  useEffect(() => {
    const previousTitle = document.title
    const baseBrand = 'أجي نقصرو'
    const fullTitle = title
      ? (title.includes(baseBrand) ? title : `${title} | ${baseBrand}`)
      : 'أجي نقصرو | أول منصة لتنظيم مباريات كرة القدم وحجز ملاعب القرب بالمغرب'

    document.title = fullTitle

    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }

    if (keywords) {
      setMeta('name', 'keywords', keywords)
    }

    setMeta('property', 'og:title', fullTitle)
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('property', 'og:type', 'website')
    setMeta('name', 'twitter:card', 'summary_large_image')

    if (image) {
      setMeta('property', 'og:image', image)
      setMeta('name', 'twitter:image', image)
    }

    if (canonical) {
      setLink('canonical', canonical)
      setMeta('property', 'og:url', canonical)
      setMeta('name', 'twitter:url', canonical)
    }

    return () => {
      document.title = previousTitle
    }
  }, [title, description, keywords, canonical, image])
}
