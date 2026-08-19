import { useTranslation } from 'react-i18next'
import { Check, Loader2 } from 'lucide-react'

const STAGE_ORDER = ['group', 'round_of_16', 'quarterfinal', 'semifinal', 'final']
const STAGE_KEYS = {
  group: 'stages.group',
  round_of_16: 'stages.roundOf16',
  quarterfinal: 'stages.quarterfinal',
  semifinal: 'stages.semifinal',
  final: 'stages.final',
}

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

function stageState(rounds) {
  if (!rounds || rounds.length === 0) return 'upcoming'
  if (rounds.every((r) => r.status === 'completed')) return 'done'
  if (rounds.some((r) => r.status === 'in_progress' || r.status === 'available')) return 'current'
  return 'upcoming'
}

export default function TournamentStageBar({ rounds = [] }) {
  const { t } = useTranslation()
  if (!Array.isArray(rounds) || rounds.length === 0) return null

  const present = STAGE_ORDER.filter((stage) => rounds.some((r) => r.stage === stage))
  if (present.length < 2) return null

  return (
    <nav aria-label={t('stages.progression')} className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-2">
        {present.map((stage, i) => {
          const state = stageState(rounds.filter((r) => r.stage === stage))
          const isDone = state === 'done'
          const isCurrent = state === 'current'
          return (
            <li key={stage} className="flex items-center gap-2">
              <div
                className={cx(
                  'stage-step inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-black',
                  isDone && 'bg-green-500 text-white shadow-[0_6px_16px_rgba(22,163,74,0.28)]',
                  isCurrent && 'bg-green-50 text-green-700 ring-2 ring-green-500',
                  !isDone && !isCurrent && 'border border-slate-200 bg-white text-slate-400',
                )}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {isDone ? <Check className="size-3.5" /> : isCurrent ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {t(STAGE_KEYS[stage])}
              </div>
              {i < present.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cx('h-0.5 w-7 rounded-full sm:w-12', isDone || isCurrent ? 'bg-green-400' : 'bg-slate-200')}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
