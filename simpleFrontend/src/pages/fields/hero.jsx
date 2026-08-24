import { useTranslation } from 'react-i18next'
import { hideBrokenImage } from '../../lib/imageErrors'

export default function FieldsHero() {
  const { t } = useTranslation()

  return (
    <section className="relative h-[260px] overflow-hidden">
      <img
        src="/backgrounds/fields/field-2.jpg"
        alt=""
        fetchPriority="high"
        decoding="async"
        onError={hideBrokenImage}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pt-16 text-center">
        <h1 className="text-4xl font-black text-white drop-shadow-lg md:text-5xl">
          {t('fieldsPage.hero.title')}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
          {t('fieldsPage.hero.subtitle')}
        </p>
      </div>
    </section>
  )
}
