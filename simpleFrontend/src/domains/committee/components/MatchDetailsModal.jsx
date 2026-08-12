import React from 'react'
import { Crown } from 'lucide-react'
import { Modal, Button } from '../../../components/dashboard/ui'
import { TeamAvatar } from '../../../pages/tournaments/shared'
import { matchDay, formatTime } from '../../../lib/adapters'

export default function MatchDetailsModal({ fixture, onClose }) {
  const st = (() => {
    const m = fixture?.match
    if (fixture?.status === 'cancelled' || m?.status === 'cancelled') return 'cancelled'
    if (fixture?.status === 'postponed' || m?.status === 'postponed') return 'postponed'
    if (m?.status === 'finished') return 'completed'
    return 'pending'
  })()
  const homeName = fixture.home_team?.name || fixture.slots?.home || '—'
  const awayName = fixture.away_team?.name || fixture.slots?.away || '—'

  return (
    <Modal open onClose={onClose} title="تفاصيل المباراة" subtitle={`${homeName} vs ${awayName}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <TeamAvatar team={fixture.home_team} className="size-12" />
            <span className="max-w-[120px] truncate text-center text-xs font-bold text-slate-800">{homeName}</span>
          </div>
          <span className="min-w-[90px] text-center text-2xl font-black text-slate-900">
            {st === 'completed' ? `${fixture.match?.home_score ?? 0} - ${fixture.match?.away_score ?? 0}` : 'VS'}
          </span>
          <div className="flex flex-col items-center gap-1.5">
            <TeamAvatar team={fixture.away_team} className="size-12" />
            <span className="max-w-[120px] truncate text-center text-xs font-bold text-slate-800">{awayName}</span>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center justify-between">
            <span>الحالة:</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black`}>{st}</span>
          </div>
          {fixture.match?.winner_team_id && (
            <div className="flex items-center justify-between">
              <span>الفائز:</span>
              <span className="inline-flex items-center gap-1 font-black text-slate-900">
                <Crown className="size-3.5 text-amber-500" />
                {fixture.match.winner_team_id === fixture.home_team?.id ? homeName : awayName}
              </span>
            </div>
          )}
          {fixture.scheduled_at && (
            <div className="flex items-center justify-between">
              <span>التاريخ والوقت:</span>
              <span>{matchDay(fixture.scheduled_at, 'ar')} · {formatTime(fixture.scheduled_at)}</span>
            </div>
          )}
          {fixture.stadium && (
            <div className="flex items-center justify-between">
              <span>الملعب:</span>
              <span>{fixture.stadium.name}</span>
            </div>
          )}
          {fixture.group && (
            <div className="flex items-center justify-between">
              <span>المجموعة:</span>
              <span>{fixture.group.name}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
        </div>
      </div>
    </Modal>
  )
}
