import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../../components/dashboard/ui'
import ImagePreview from '../../../components/ui/ImagePreview'

export default function PhotosModal({ terrain, onClose }) {
  const { t } = useTranslation()
  const images = terrain?.images || []
  const [lightbox, setLightbox] = useState(null)

  const previewImages = images.map((img) => ({
    src: img.image_url,
    alt: img.alt_text || terrain?.name || '',
  }))

  return (
    <>
      <Modal
        open={!!terrain}
        onClose={onClose}
        title={t('terrain.card.images')}
        subtitle={typeof terrain?.name === 'string' ? terrain.name : undefined}
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

      <ImagePreview
        images={previewImages}
        index={lightbox ?? 0}
        onIndexChange={setLightbox}
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
      />
    </>
  )
}
