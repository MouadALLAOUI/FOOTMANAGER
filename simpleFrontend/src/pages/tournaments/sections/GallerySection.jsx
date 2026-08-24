import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Images } from 'lucide-react'
import ImagePreview from '../../../components/ui/ImagePreview'

export default function GallerySection({ gallery }) {
  const { t } = useTranslation()
  const [lightbox, setLightbox] = useState(-1)

  const images = gallery || []
  const open = lightbox >= 0 && lightbox < images.length

  const previewImages = images.map((img) => ({
    src: img.image_url,
    alt: img.caption || '',
  }))

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

      <ImagePreview
        images={previewImages}
        index={lightbox}
        onIndexChange={setLightbox}
        open={open}
        onClose={() => setLightbox(-1)}
      />
    </>
  )
}
