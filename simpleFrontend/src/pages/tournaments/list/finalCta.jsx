import { useTranslation } from 'react-i18next'
import { ArrowUp, MessageCircle } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFutbol } from '@fortawesome/free-solid-svg-icons'

export default function FinalCta() {
  const { t } = useTranslation()

  const scrollToDirectory = () => {
    document.getElementById('tournaments-directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const defaultMessage =
    'السلام عليكم، أود الاستفسار حول بطولات ودوريات كرة القدم في منصة أجي نقصرو.'
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(defaultMessage)}`

  return (
    <section aria-labelledby="final-cta-heading" className="relative">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-green-950 p-7 text-center shadow-lg sm:p-10 lg:p-12">
        <FontAwesomeIcon
          icon={faFutbol}
          aria-hidden="true"
          className="animate-float pointer-events-none absolute -bottom-6 -start-6 size-28 text-white/5"
        />
        <FontAwesomeIcon
          icon={faFutbol}
          aria-hidden="true"
          className="animate-float pointer-events-none absolute -top-8 -end-8 size-36 text-white/5"
          style={{ animationDelay: '1.4s' }}
        />

        <div className="relative z-10 mx-auto max-w-2xl">
          <h2
            id="final-cta-heading"
            className="text-xl font-black text-white sm:text-2xl md:text-3xl"
          >
            {t(
              'public.tournaments.finalCta.title',
              'هل تبحث عن منافسة قادمة أو ترغب في متابعة فريقك المفضّل؟',
            )}
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            {t(
              'public.tournaments.finalCta.subtitle',
              'انضم إلى مجتمع كرة القدم للهواة في المغرب، وكن جزءاً من تجربة رياضية متكاملة تجمع الشغف، التنافس، والروح الرياضية.',
            )}
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={scrollToDirectory}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-xs font-black text-slate-900 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 sm:w-auto"
            >
              <ArrowUp className="size-3.5" />
              <span>{t('public.tournaments.finalCta.exploreAll', 'تصفح كل البطولات')}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 text-xs font-black text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-green-400 hover:bg-white/15 sm:w-auto"
            >
              <MessageCircle className="size-3.5 text-green-400" />
              <span>{t('public.tournaments.finalCta.contactUs', 'تواصل مع إدارة المنصة')}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
