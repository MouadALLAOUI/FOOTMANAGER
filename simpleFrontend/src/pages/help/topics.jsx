import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  UserPlus,
  Trophy,
  CalendarCheck,
  Users,
  CreditCard,
  LifeBuoy,
  ArrowRight,
} from 'lucide-react'

const TOPIC_ICONS = {
  'user-plus': UserPlus,
  trophy: Trophy,
  calendar: CalendarCheck,
  users: Users,
  'credit-card': CreditCard,
  'life-buoy': LifeBuoy,
}

const FALLBACK_ICON = LifeBuoy

export default function HelpTopics({ content }) {
  const { t } = useTranslation()

  return (
    <section id="help-topics" className="bg-[#f6f7fb] pb-8 pt-12 lg:pt-16">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('help.page.topicsTitle')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">{t('help.page.topicsSubtitle')}</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {content.topics.map((topic) => {
            const Icon = TOPIC_ICONS[topic.icon] || FALLBACK_ICON
            return (
              <Link
                key={topic.id}
                to={topic.to}
                className="group relative overflow-hidden rounded-[26px] bg-white p-7 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/60 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_24px_60px_-16px_rgba(15,23,42,0.22)] hover:ring-green-500/60"
              >
                <div className="pointer-events-none absolute -end-10 -top-10 size-32 rounded-full bg-green-500/5 transition-transform duration-300 ease-out group-hover:scale-150" />
                <span className="relative grid size-13 place-items-center rounded-2xl bg-green-500/10 text-green-600 transition-colors duration-300 group-hover:bg-green-500 group-hover:text-white">
                  <Icon className="size-6" />
                </span>
                <h3 className="relative mt-5 text-[17px] font-black text-slate-900">{topic.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-500">{topic.description}</p>
                <span className="relative mt-5 inline-flex items-center gap-2 text-sm font-bold text-green-600">
                  {t('help.page.open')}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}