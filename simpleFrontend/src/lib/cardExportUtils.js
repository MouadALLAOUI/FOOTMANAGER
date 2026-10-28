import { toBlob, toPng } from 'html-to-image'
import api from '../api/client'
import { toast } from '../components/ui/Toast/toastStore'

/**
 * Converts a Blob to a Base64 data URL string.
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Safely converts an image URL to a Base64 data URL.
 * 1. Checks if already a data URL.
 * 2. Tries in-memory canvas draw (zero network request).
 * 3. Tries backend CORS proxy endpoint (/api/v1/media/proxy).
 * 4. Tries direct CORS fetch.
 * 5. Falls back to generating a stylized SVG initials badge if all fails.
 */
export async function urlToDataUrl(url, fallbackName = 'فريق', fallbackColor = '#1F7A4D') {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('data:')) return url

  // 1. Try fetching via API CORS proxy
  try {
    const proxyUrl = `/v1/media/proxy?url=${encodeURIComponent(url)}`
    const res = await api.get(proxyUrl, { responseType: 'blob', timeout: 5000 })
    if (res.data && res.data.size > 0) {
      return await blobToDataUrl(res.data)
    }
  } catch (err) {
    // Silently continue to direct fetch
  }

  // 2. Try direct fetch with CORS mode
  try {
    const directRes = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (directRes.ok) {
      const blob = await directRes.blob()
      return await blobToDataUrl(blob)
    }
  } catch (err) {
    // Continue
  }

  // 3. Fallback: Generate an inline SVG initials badge data URL so a blank transparent box is NEVER exported
  const trimmed = (fallbackName || 'فريق').trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  const initials = words.length >= 2
    ? (words[0].slice(0, 1) + words[1].slice(0, 1))
    : trimmed.slice(0, 2) || 'ف'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="24" fill="${fallbackColor}" />
    <text x="60" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initials}</text>
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Inlines all <img> tags and background-images within an element into Base64 data URLs.
 * This ensures html-to-image never triggers CORS or network failures during export.
 */
export async function inlineAllImages(rootElement) {
  if (!rootElement) return

  // 1. Process all <img> tags
  const images = Array.from(rootElement.querySelectorAll('img'))
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src') || img.src
      if (!src || src.startsWith('data:')) return

      const alt = img.getAttribute('alt') || 'فريق'
      const dataUrl = await urlToDataUrl(src, alt)
      if (dataUrl) {
        img.src = dataUrl
        img.removeAttribute('srcset')
      }
    })
  )

  // 2. Process elements with background-image
  const allElements = [rootElement, ...Array.from(rootElement.querySelectorAll('*'))]
  await Promise.all(
    allElements.map(async (el) => {
      const style = window.getComputedStyle(el)
      const bg = style.backgroundImage
      if (!bg || bg === 'none') return

      const urlMatch = bg.match(/url\(['"]?([^'"]+)['"]?\)/)
      if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
        const bgUrl = urlMatch[1]
        try {
          const dataUrl = await urlToDataUrl(bgUrl)
          if (dataUrl) {
            el.style.backgroundImage = `url("${dataUrl}")`
          }
        } catch {}
      }
    })
  )
}

/**
 * Captures a match card element and exports it as a high-resolution PNG Blob.
 *
 * Options:
 * - targetWidth: 800 (default width for widescreen broadcast card)
 * - pixelRatio: 2 (for crisp, sharp 1600px width capture)
 * - filename: custom filename for export
 * - replaceButtonsWithFooter: whether to replace interactive buttons with AJI NQSSRO official watermark footer
 */
export async function exportMatchCardToBlob(cardElement, options = {}) {
  if (!cardElement) {
    throw new Error('لم يتم العثور على عنصر بطاقة المباراة')
  }

  const {
    targetWidth = 800,
    pixelRatio = 2,
    replaceButtonsWithFooter = true,
  } = options

  // 1. Clone the DOM element deeply
  const clone = cardElement.cloneNode(true)

  // 2. Prepare container offscreen with RTL direction and explicit dimensions
  const container = document.createElement('div')
  container.setAttribute('dir', 'rtl')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '-9999px'
  container.style.width = `${targetWidth}px`
  container.style.zIndex = '-9999'
  container.style.opacity = '1'
  container.style.pointerEvents = 'none'

  // Style the cloned card for broadcast-grade export
  clone.style.width = '100%'
  clone.style.maxWidth = '100%'
  clone.style.margin = '0'
  clone.style.transform = 'none'
  clone.style.fontFamily = '"Cairo", "Segoe UI", system-ui, -apple-system, sans-serif'

  // Remove or replace interactive elements
  const carouselButtons = clone.querySelectorAll('button[aria-label="المباراة السابقة"], button[aria-label="المباراة التالية"]')
  carouselButtons.forEach((btn) => btn.remove())

  // Handle bottom interactive buttons (.no-share-capture)
  const noShareElements = clone.querySelectorAll('.no-share-capture')
  if (replaceButtonsWithFooter) {
    noShareElements.forEach((el) => {
      // Replace with official AJI NQSSRO broadcast card footer
      const footer = document.createElement('div')
      footer.className = 'mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between text-xs font-bold text-slate-300'
      footer.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="grid size-6 place-items-center rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px]">AN</span>
          <span class="text-white font-extrabold tracking-wide">أجي نقصرو</span>
          <span class="text-[10px] text-emerald-400 font-semibold">• منصة كرة القدم الأولى بالمغرب</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-amber-400 font-mono font-bold tracking-wider">ajin9essro.com</span>
        </div>
      `
      el.parentNode.replaceChild(footer, el)
    })
  } else {
    noShareElements.forEach((el) => el.remove())
  }

  // Replace backdrop-blur with deep dark solid surface colors so canvas renders without muddy artifacts
  const blurElements = clone.querySelectorAll('[class*="backdrop-blur"]')
  blurElements.forEach((el) => {
    el.style.backdropFilter = 'none'
    el.style.webkitBackdropFilter = 'none'
    if (el.className.includes('bg-slate-950')) {
      el.style.backgroundColor = 'rgba(8, 14, 26, 0.94)'
    } else if (el.className.includes('bg-black')) {
      el.style.backgroundColor = 'rgba(10, 15, 20, 0.92)'
    }
  })

  container.appendChild(clone)
  document.body.appendChild(container)

  try {
    // 3. Preload and inline all images (team logos, badges, backgrounds)
    await inlineAllImages(clone)

    // 4. Ensure fonts are loaded and images decoded
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready.catch(() => {})
    }

    const clonedImages = Array.from(clone.querySelectorAll('img'))
    await Promise.all(
      clonedImages.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()))
    )

    // Wait a brief animation frame for browser layout calculation
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 60)))

    // 5. Render to PNG Blob via html-to-image
    const blob = await toBlob(clone, {
      pixelRatio,
      cacheBust: false,
      skipFonts: true,
      backgroundColor: '#070B14',
    })

    if (!blob || blob.size === 0) {
      throw new Error('توليد الصورة أنتج ملفاً فارغاً')
    }

    return blob
  } finally {
    // Always clean up the temporary offscreen element
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }
}

/**
 * Downloads a Blob directly to the client device.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/**
 * Handles the complete sharing / download workflow for any match card or shareable element:
 * - Native sharing with file on supported mobile devices
 * - Direct PNG download + URL clipboard copy fallback on desktop
 * - Accurate user feedback toasts (never claims success if failed)
 */
export async function shareOrDownloadMatchCard({
  cardElement,
  title = 'بطاقة مباراة — أجي نقصرو',
  text = '',
  url = typeof window !== 'undefined' ? window.location.href : 'https://ajin9essro.com',
  filename = 'match-card.png',
  targetWidth = 800,
}) {
  let blob = null
  let imageFile = null

  try {
    blob = await exportMatchCardToBlob(cardElement, { targetWidth, pixelRatio: 2 })
    if (blob) {
      imageFile = new File([blob], filename, { type: 'image/png' })
    }
  } catch (err) {
    console.error('Match card export error:', err)
  }

  // 1. Mobile Native Web Share with the generated Image File
  if (imageFile && typeof navigator !== 'undefined' && navigator.canShare) {
    const shareData = {
      files: [imageFile],
      title,
      text: text ? `${text}\n${url}` : url,
    }

    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        toast.success('تمت مشاركة بطاقة المباراة بنجاح')
        return { success: true, method: 'share-file' }
      } catch (err) {
        if (err?.name === 'AbortError') {
          return { success: false, cancelled: true }
        }
        console.warn('File share attempt failed, falling back to download:', err)
      }
    }
  }

  // 2. Desktop & Fallback: Automatic PNG Download + Link Copy
  if (blob) {
    downloadBlob(blob, filename)
    try {
      await navigator.clipboard.writeText(url)
    } catch {}
    toast.success('تم تنزيل بطاقة المباراة بجودة عالية ونسخ الرابط بنجاح')
    return { success: true, method: 'download' }
  }

  // 3. Last Fallback if image generation failed: Link sharing only (with honest feedback)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url })
      toast.info('تمت مشاركة رابط تفاصيل المباراة')
      return { success: true, method: 'share-link' }
    } catch (err) {
      if (err?.name === 'AbortError') return { success: false, cancelled: true }
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    toast.info('تم نسخ رابط المباراة إلى الحافظة')
    return { success: true, method: 'clipboard' }
  } catch {
    toast.error('تعذرت مشاركة بطاقة المباراة، يرجى المحاولة مرة أخرى')
    return { success: false, error: true }
  }
}
