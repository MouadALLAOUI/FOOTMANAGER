import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../../components/dashboard/ui'

export default function PhotosModal({ terrain, onClose }) {
  const { t, i18n } = useTranslation()
  const images = terrain?.images || []
  const [lightbox, setLightbox] = useState(null)

  const isRtl = i18n.dir() === 'rtl'
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  const prev = () => setLightbox((i) => (i - 1 + images.length) % images.length)
  const next = () => setLightbox((i) => (i + 1) % images.length)

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowLeft') next()
      if (e.key === 'ArrowRight') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox])

  return (
    <>
      <Modal
        open={!!terrain}
        onClose={onClose}
        title={t('terrain.card.images')}
        subtitle={terrain?.name}
        size="lg"
      >
        {images.length === 0 ? (
          <p className="py-12 text-center text-sm font-bold text-slate-400">{t('terrain.card.noImages')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightbox(i)}
                className="group relative aspect-video overflow-hidden rounded-xl bg-slate-100"
              >
                <img
                  loading="lazy"
                  decoding="async"
                  src={img.image_url}
                  alt={img.alt_text || terrain?.name || ''}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </Modal>

      {lightbox !== null && images[lightbox] && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 p-4" onClick={onClose}>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}
            className="absolute end-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t('terrain.card.prevPhoto')}
                onClick={(e) => { e.stopPropagation(); prev() }}
                className="absolute start-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <PrevIcon className="size-5" />
              </button>
              <button
                type="button"
                aria-label={t('terrain.card.nextPhoto')}
                onClick={(e) => { e.stopPropagation(); next() }}
                className="absolute end-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <NextIcon className="size-5" />
              </button>
            </>
          )}
          <img
            src={images[lightbox].image_url}
            alt={images[lightbox].alt_text || terrain?.name || ''}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </>
  )
}
