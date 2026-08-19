import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FileText, ShieldCheck } from 'lucide-react'

export default function PricingLegalLinks() {
  const { t } = useTranslation()

  return (
    <section className="bg-white px-6 pb-16 lg:pb-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
        <p className="text-center text-sm font-semibold text-slate-600">{t('pricing.page.legalDesc')}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/terms"
            className="inline-flex items-center gap-2 rounded-full bg-[#f6f7fb] px-5 py-2.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-green-500 hover:text-white hover:ring-green-500"
          >
            <FileText className="size-4" />
            {t('pricing.page.linkTerms')}
          </Link>
          <Link
            to="/privacy"
            className="inline-flex items-center gap-2 rounded-full bg-[#f6f7fb] px-5 py-2.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-green-500 hover:text-white hover:ring-green-500"
          >
            <ShieldCheck className="size-4" />
            {t('pricing.page.linkPrivacy')}
          </Link>
        </div>
      </div>
    </section>
  )
}
