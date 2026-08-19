import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'

function Lightbox({ images, index, onClose, setIndex }) {
  const { t } = useTranslation()

  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length, setIndex])
  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length, setIndex])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  const current = images[index]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={onClose} />
      <button
        type="button"
        onClick={onClose}
        className="absolute end-4 top-4 grid size-10 place-items-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label={t('common.close')}
      >
        <X className="size-5" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute start-3 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:start-6"
            aria-label={t('public.gallery.prev')}
          >
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute end-14 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:end-6"
            aria-label={t('public.gallery.next')}
          >
            <ChevronRight className="size-6 rtl:rotate-180" />
          </button>
        </>
      )}

      <figure className="relative max-h-[85vh] w-full max-w-3xl">
        <img src={current.image_url} alt={current.caption || ''} className="mx-auto max-h-[75vh] w-auto rounded-2xl object-contain shadow-2xl" />
        <figcaption className="mt-3 flex items-center justify-between gap-3">
          <p className="truncate text-sm font-bold text-white/90">{current.caption || t('public.gallery.untitled')}</p>
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/80">
            {index + 1} / {images.length}
          </span>
        </figcaption>
      </figure>
    </div>
  )
}

export default function GallerySection({ gallery }) {
  const { t } = useTranslation()
  const [lightbox, setLightbox] = useState(-1)

  const images = gallery || []
  const open = lightbox >= 0 && lightbox < images.length

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><Images className="size-6" /></span>
        <p className="text-sm font-bold text-slate-600">{t('public.gallery.empty')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setLightbox(i)}
            className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100 text-start"
          >
            <img
              src={img.thumbnail_url || img.image_url}
              alt={img.caption || ''}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            {img.caption && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pb-2 pt-8 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {img.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {open && <Lightbox images={images} index={lightbox} setIndex={setLightbox} onClose={() => setLightbox(-1)} />}
    </>
  )
}
