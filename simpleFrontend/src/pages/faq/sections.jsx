import { useState } from 'react'
import {
  Users,
  Trophy,
  Landmark,
  CalendarCheck,
  Swords,
  LifeBuoy,
  ChevronDown,
} from 'lucide-react'

const CATEGORY_ICONS = {
  general: Users,
  managers: Trophy,
  owners: Landmark,
  bookings: CalendarCheck,
  tournaments: Swords,
}

const FALLBACK_ICON = LifeBuoy

function FaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={item.q}
            className={`overflow-hidden rounded-2xl bg-white ring-1 transition-all duration-300 ${
              isOpen ? 'shadow-[0_14px_36px_-18px_rgba(15,23,42,0.28)] ring-green-500' : 'ring-slate-200/70 hover:ring-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-5 py-4 text-start"
            >
              <span className="flex-1 text-[15px] font-bold text-slate-900 sm:text-base">{item.q}</span>
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full transition-colors duration-300 ${
                  isOpen ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <ChevronDown
                  className={`size-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function FaqSections({ content }) {
  const jump = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="bg-[#f6f7fb] pb-16 pt-10 lg:pb-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="-mx-6 mb-10 flex gap-2 overflow-x-auto px-6 pb-2">
          {content.categories.map((cat, i) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => jump(cat.id)}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-green-500 hover:text-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
            >
              {i + 1}. {cat.title}
            </button>
          ))}
        </div>

        <div className="space-y-12">
          {content.categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] || FALLBACK_ICON
            return (
              <section key={cat.id} id={cat.id} className="scroll-mt-24">
                <h2 className="mb-4 flex items-center gap-3 text-lg font-black text-slate-900 sm:text-xl">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-green-500/10 text-green-600">
                    <Icon className="size-5" />
                  </span>
                  {cat.title}
                </h2>
                <FaqAccordion items={cat.items} />
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}