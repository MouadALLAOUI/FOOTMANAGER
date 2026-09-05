import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function TermsSections({ content }) {
  return (
    <section className="bg-[#f6f7fb] pb-16 pt-4 lg:pb-24 lg:pt-10">
      <div className="mx-auto max-w-3xl px-6">
        <article className="min-w-0 rounded-[26px] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/60 sm:p-8 lg:p-12">
          {content.sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className={`scroll-mt-24 ${i > 0 ? 'border-t border-slate-100 pt-8' : 'pt-2'} ${i < content.sections.length - 1 ? 'pb-8' : ''}`}
            >
              <h2 className="flex items-center gap-3 text-lg font-black text-slate-900 sm:text-xl">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-green-500/10 text-sm font-black text-green-600">
                  {i + 1}
                </span>
                {s.title}
              </h2>

              <div className="mt-4 space-y-3">
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="text-[15px] leading-[1.9] text-slate-600">
                    {p}
                  </p>
                ))}
                {s.list && (
                  <ul className="mt-1 space-y-2">
                    {s.list.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-[15px] leading-[1.8] text-slate-600">
                        <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-green-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {s.link && (
                  <Link
                    to={s.link.href}
                    className="mt-1 inline-flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-2.5 text-sm font-bold text-green-700 transition hover:bg-green-500 hover:text-white"
                  >
                    {s.link.label}
                    <ArrowRight className="size-4 rtl:rotate-180" />
                  </Link>
                )}
              </div>
            </section>
          ))}
        </article>
      </div>
    </section>
  )
}