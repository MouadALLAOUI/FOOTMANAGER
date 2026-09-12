import React from 'react'
import { MessageSquare, Shield, Users } from 'lucide-react'
import MatchGlassModal from '../../../components/matches/MatchGlassModal'
import { ManagerContact } from '../../../components/dashboard/cards'

export default function MatchDetail({ match, onClose, onActions, onLineup, onTeamClick }) {
  if (!match) return null

  const opponentManager = match.opponent_team?.manager || match.host_team?.manager
  const joined = match?.players_joined ?? 0
  const needed = match?.players_needed ?? 0
  const remaining = match?.players_remaining ?? 0
  const full = Boolean(match?.needs_players) && remaining === 0
  const pct = needed > 0 ? Math.min(Math.round((joined / needed) * 100), 100) : 0

  const managerActions = (
    <div className="space-y-3">
      {/* Lineup button if applicable */}
      {onLineup && (match.status === 'open' || match.status === 'accepted') && (
        <button
          type="button"
          onClick={() => onLineup(match)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/50 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 py-3 px-4 text-xs font-black text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.25)] backdrop-blur-md transition hover:scale-[1.01] hover:border-emerald-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-[0.99]"
        >
          <Shield className="size-4 text-emerald-300" />
          تشكيلة وتكتيك المباراة
        </button>
      )}

      {/* Needs players recruitment widget */}
      {match.needs_players && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/40 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-200">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-emerald-400" />
              اللاعبون المطلوبون
            </span>
            <span className="font-mono">
              {joined} <span className="text-[10px] text-emerald-400">من</span> {needed}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${full ? 'bg-rose-400' : 'bg-emerald-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-end text-[10px] font-semibold text-emerald-300/70">
            {full ? 'اكتمل العدد' : `ينقص ${remaining} لاعب`}
          </p>
        </div>
      )}

      {/* Opponent Manager Contact */}
      {opponentManager && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/25 bg-emerald-950/40 px-4 py-3 backdrop-blur-md">
          <div>
            <p className="text-[10px] font-bold text-emerald-300/70">تواصل مع المسير المنافس</p>
            <p className="text-xs font-extrabold text-white">{opponentManager.name || 'غير متاح'}</p>
          </div>
          <ManagerContact manager={opponentManager} />
        </div>
      )}

      {/* Match Notes */}
      {match.notes && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-xs text-white/85 backdrop-blur-md">
          <p className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300">
            <MessageSquare className="size-3" />
            ملاحظات
          </p>
          <p className="mt-1 leading-relaxed">{match.notes}</p>
        </div>
      )}

      {/* Additional Custom Actions */}
      {onActions && <div className="flex flex-wrap gap-2">{onActions(match)}</div>}
    </div>
  )

  return (
    <MatchGlassModal
      open={Boolean(match)}
      onClose={onClose}
      match={match}
      onTeamClick={onTeamClick}
      managerActions={managerActions}
    />
  )
}
