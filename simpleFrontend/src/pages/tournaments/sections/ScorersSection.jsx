import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleDot, Hand, LayoutGrid, ShieldAlert, Target } from 'lucide-react'
import { RankList, StatisticsSummary } from '../shared'

const TABS = ['overview', 'scorers', 'assists', 'cards']

export default function ScorersSection({ stats }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('overview')

  const hasData = useMemo(
    () => !!(stats && (stats.top_scorers || []).length > 0),
    [stats],
  )

  if (!hasData) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><Target className="size-6" /></span>
        <p className="text-sm font-bold text-slate-600">{t('public.tournamentPage.noScorers')}</p>
      </div>
    )
  }

  const TAB_ICONS = {
    overview: LayoutGrid,
    scorers: CircleDot,
    assists: Hand,
    cards: ShieldAlert,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map((key) => {
          const Icon = TAB_ICONS[key]
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold transition ${
                active
                  ? 'bg-slate-900 text-white shadow-[0_8px_20px_rgba(15,23,42,0.25)]'
                  : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <Icon className="size-3.5" />
              {t(`public.statistics.tabs.${key}`)}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <StatisticsSummary stats={stats} />}

      {tab === 'scorers' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <RankList title={t('public.statistics.scorers')} icon={CircleDot} items={stats.top_scorers} />
          <RankList title={t('public.statistics.ownGoals')} icon={Target} items={stats.own_goals} />
        </div>
      )}

      {tab === 'assists' && (
        <RankList title={t('public.statistics.assists')} icon={Hand} items={stats.top_assists} />
      )}

      {tab === 'cards' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <RankList title={t('public.statistics.yellowCards')} icon={ShieldAlert} items={stats.yellow_cards} />
          <RankList title={t('public.statistics.redCards')} icon={ShieldAlert} items={stats.red_cards} />
        </div>
      )}
    </div>
  )
}
