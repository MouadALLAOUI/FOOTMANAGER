import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Wrench, Home } from 'lucide-react'

export default function Maintenance({ announcement }) {
  const { t } = useTranslation()
  return (
    <section className="grid min-h-screen place-items-center bg-[#0a101a] px-6 py-20" role="status">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-green-500/10 text-green-400 ring-1 ring-white/10">
          <Wrench className="size-8" />
        </div>
        <h1 className="mt-6 text-2xl font-black text-white lg:text-3xl">{t('errorPage.maintenance.title')}</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-400">
          {t('errorPage.maintenance.desc')}
        </p>
        {announcement && (
          <p className="mx-auto mt-5 max-w-md rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300">
            {announcement}
          </p>
        )}
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-white/15 bg-white/5 px-7 text-sm font-bold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
          >
            <Home className="size-5" />
            {t('errorPage.home')}
          </Link>
        </div>
      </div>
    </section>
  )
}
