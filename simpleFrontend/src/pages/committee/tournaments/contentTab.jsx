import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Handshake, Images, Newspaper, Users } from 'lucide-react'
import CommitteeNews from './content/news'
import CommitteeGallery from './content/gallery'
import CommitteeSponsors from './content/sponsors'
import CommitteePartners from './content/partners'

const SECTIONS = [
  { key: 'news', icon: Newspaper },
  { key: 'gallery', icon: Images },
  { key: 'sponsors', icon: Handshake },
  { key: 'partners', icon: Users },
]

export default function ContentTab({ tournament, refresh }) {
  const { t } = useTranslation()
  const [active, setActive] = useState('news')

  return (
    <div>
      <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60">
        {SECTIONS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors ${
              active === key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Icon className="size-4" />
            {t(`committee.content.${key}.title`)}
          </button>
        ))}
      </div>

      {active === 'news' && <CommitteeNews tournament={tournament} refresh={refresh} />}
      {active === 'gallery' && <CommitteeGallery tournament={tournament} refresh={refresh} />}
      {active === 'sponsors' && <CommitteeSponsors tournament={tournament} refresh={refresh} />}
      {active === 'partners' && <CommitteePartners tournament={tournament} refresh={refresh} />}
    </div>
  )
}
