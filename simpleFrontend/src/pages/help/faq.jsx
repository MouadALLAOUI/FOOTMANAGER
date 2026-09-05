import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MessageCircleQuestion, ArrowRight } from 'lucide-react'

export default function HelpFaq() {
  const { t } = useTranslation()

  return (
    <section className="bg-[#f6f7fb] pt-8">
      <div className="mx-auto max-w-[1200px] px-6">
        <Link
          to="/faq"
          className="group flex flex-col items-center justify-between gap-6 rounded-[26px] bg-white p-8 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/60 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-16px_rgba(15,23,42,0.2)] hover:ring-green-500/60 lg:flex-row lg:p-10"
        >
          <div className="flex flex-col items-center gap-5 text-center lg:flex-row lg:text-start">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-green-500/10 text-green-600 transition-colors duration-300 group-hover:bg-green-500 group-hover:text-white">
              <MessageCircleQuestion className="size-7" />
            </span>
            <div>
              <h3 className="text-xl font-black text-slate-900">{t('help.page.faqTitle')}</h3>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">{t('help.page.faqDesc')}</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2.5 rounded-2xl bg-green-500 px-7 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:bg-green-400 group-hover:shadow-[0_22px_55px_rgba(22,163,74,0.6)]">
            {t('help.page.faqButton')}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </span>
        </Link>
      </div>
    </section>
  )
}