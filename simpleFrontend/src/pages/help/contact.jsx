import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Send } from 'lucide-react'

export default function HelpContact() {
  const { t } = useTranslation()

  return (
    <section className="bg-[#f6f7fb] pb-[120px] pt-8 lg:pb-[140px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col items-center justify-between gap-6 rounded-[26px] bg-slate-950 px-8 py-10 ring-1 ring-white/10 lg:flex-row lg:px-12">
          <div className="text-center lg:text-start">
            <h3 className="text-xl font-black text-white">{t('help.page.ctaTitle')}</h3>
            <p className="mt-1 text-sm text-slate-400">{t('help.page.ctaDesc')}</p>
          </div>
          <Link
            to="/contact"
            className="btn-ripple flex h-[52px] shrink-0 items-center gap-2.5 rounded-2xl bg-green-500 px-7 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 active:translate-y-0"
          >
            <Send className="size-5" />
            {t('help.page.ctaButton')}
          </Link>
        </div>
      </div>
    </section>
  )
}