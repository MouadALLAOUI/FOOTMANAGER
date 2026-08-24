import { useTranslation } from 'react-i18next'

export default function TermsToc({ content }) {
  const { t } = useTranslation()

  const jump = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="bg-[#f6f7fb] pb-6 pt-10 lg:hidden">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">{t('terms.page.tocTitle')}</p>
        <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2">
          {content.sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-green-500 hover:text-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
