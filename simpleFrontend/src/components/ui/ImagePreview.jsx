import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X, ImageOff } from 'lucide-react'
import useScrollLock from '../useScrollLock'

export default function ImagePreview({
  src,
  alt = '',
  open,
  onClose,
  images,
  index: controlledIndex,
  onIndexChange,
}) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const isGallery = Array.isArray(images) && images.length > 0
  const [internalIndex, setInternalIndex] = useState(0)
  const currentIndex = controlledIndex ?? internalIndex
  const setIndex = onIndexChange ?? setInternalIndex
  const [imgError, setImgError] = useState(false)
  const backdropRef = useRef(null)

  const currentSrc = isGallery ? (images[currentIndex]?.src || images[currentIndex]?.image_url || images[currentIndex]?.thumbnail_url || '') : src
  const currentAlt = isGallery ? (images[currentIndex]?.alt || images[currentIndex]?.caption || '') : alt
  const total = isGallery ? images.length : 0

  const close = useCallback(() => {
    setImgError(false)
    onClose?.()
  }, [onClose])

  const prev = useCallback(() => {
    if (!isGallery) return
    setImgError(false)
    setIndex((i) => (i - 1 + total) % total)
  }, [isGallery, total, setIndex])

  const next = useCallback(() => {
    if (!isGallery) return
    setImgError(false)
    setIndex((i) => (i + 1) % total)
  }, [isGallery, total, setIndex])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') (isRtl ? next : prev)()
      if (e.key === 'ArrowRight') (isRtl ? prev : next)()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, prev, next, isRtl])

  useScrollLock(open)

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/90 p-4"
      onClick={(e) => { if (e.target === backdropRef.current) close() }}
      role="dialog"
      aria-modal="true"
      aria-label={t('common.imagePreview', 'Image preview')}
    >
      <button
        type="button"
        onClick={close}
        className="absolute end-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:end-5 sm:top-5"
        aria-label={t('common.close')}
      >
        <X className="size-5" />
      </button>

      {isGallery && total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute start-3 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:start-5"
            aria-label={t('public.gallery.prev', 'Previous')}
          >
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute end-12 z-10 grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:end-14"
            aria-label={t('public.gallery.next', 'Next')}
          >
            <ChevronRight className="size-5 rtl:rotate-180" />
          </button>
        </>
      )}

      <div
        className="relative flex max-h-[85vh] max-w-[90vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {imgError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 px-8 py-12 text-center">
            <ImageOff className="size-12 text-white/30" />
            <p className="text-sm font-semibold text-white/50">{t('common.imageLoadFailed', 'Failed to load image')}</p>
          </div>
        ) : (
          <img
            src={currentSrc}
            alt={currentAlt}
            className="max-h-[78vh] rounded-2xl object-contain shadow-2xl"
            onError={() => setImgError(true)}
            key={currentSrc}
          />
        )}

        {isGallery && total > 1 && (
          <span className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">
            {currentIndex + 1} / {total}
          </span>
        )}
      </div>
    </div>
  )
}
