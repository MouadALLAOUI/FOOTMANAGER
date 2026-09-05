import React from 'react'
import { MapPin, Clock, Trophy, MessageSquare, Users, Shield } from 'lucide-react'
import Drawer from '../../../components/dashboard/Drawer'
import { StatusBadge } from '../../../components/dashboard/ui'
import { ManagerContact } from '../../../components/dashboard/cards'
import TeamLogo from '../../../components/profile/TeamLogo'

export default function MatchDetail({ match, onClose, onActions, onLineup }) {
  const datetime = match?.match_datetime ? new Date(match.match_datetime) : null
  const joined = match?.players_joined ?? 0
  const needed = match?.players_needed ?? 0
  const remaining = match?.players_remaining ?? 0
  const full = Boolean(match?.needs_players) && remaining === 0
  const pct = needed > 0 ? Math.min(Math.round((joined / needed) * 100), 100) : 0
  return (
    <Drawer open={Boolean(match)} onClose={onClose} title="تفاصيل المباراة" subtitle="معلومات كاملة عن هذه المباراة" size="480">
      {match && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-gradient-to-l from-[#0b1220] to-[#12321f] p-6 text-center text-white">
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <TeamLogo team={match.host_team} className="size-14" rounded="rounded-2xl" ring="ring-2 ring-white/10" fontSize="text-lg" />
                <span className="max-w-[100px] truncate text-xs font-bold">{match.host_team?.name}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black">{match.host_score ?? '–'}</span>
                <span className="my-1 text-[10px] font-bold text-white/40">ضد</span>
                <span className="text-2xl font-black">{match.opponent_score ?? '–'}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <TeamLogo team={match.opponent_team} className="size-14" rounded="rounded-2xl" ring="ring-2 ring-white/10" fontSize="text-lg" />
                <span className="max-w-[100px] truncate text-xs font-bold">{match.opponent_team?.name || 'خصم محتمل'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <StatusBadge status={match.status} />
            {datetime && (
              <span className="text-xs font-semibold text-slate-400">
                {new Intl.DateTimeFormat('ar-MA', { dateStyle: 'full', timeStyle: 'short' }).format(datetime)}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {[
              { icon: MapPin, label: 'الملعب', value: match.stadium?.name || match.custom_terrain_name || 'غير محدد' },
              {
                icon: Clock,
                label: 'المدة',
                value: datetime
                  ? new Intl.DateTimeFormat('ar-MA', { hour: '2-digit', minute: '2-digit' }).format(datetime)
                  : '—',
              },
              {
                icon: Trophy,
                label: 'السعر',
                value: match.price_per_player ? `${match.price_per_player} د.م / لاعب` : 'مجاني',
              },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white text-green-600 shadow-sm">
                  <r.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400">{r.label}</p>
                  <p className="text-sm font-bold text-slate-800">{r.value}</p>
                </div>
              </div>
            ))}
          </div>

          {match.needs_players ? (
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-violet-600/70">
                <Users className="size-3" />
                اللاعبون المطلوبون
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-black text-violet-700">
                  {joined} <span className="text-xs font-bold text-violet-400">من</span> {needed}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    full ? 'bg-rose-100 text-rose-600' : 'bg-white text-violet-600'
                  }`}
                >
                  {full ? 'اكتمل العدد' : `ينقص ${remaining}`}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : null}

          {match.player_format && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
              <span className="grid size-9 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <Shield className="size-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold text-emerald-600/70">صيغة اللاعبين</p>
                <p className="text-sm font-bold text-slate-800">{match.player_format}</p>
              </div>
            </div>
          )}

          {onLineup && (match.status === 'open' || match.status === 'accepted') && (
            <button
              type="button"
              onClick={() => onLineup(match)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 transition hover:bg-green-100"
            >
              <Shield className="size-4" />
              تشكيلة المباراة
            </button>
          )}

          {match.notes && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                <MessageSquare className="size-3" />
                ملاحظات
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{match.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50/60 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold text-green-600/70">تواصل مع المسير المنافس</p>
              <p className="text-sm font-extrabold text-slate-800">
                {match.opponent_team?.manager?.name || match.host_team?.manager?.name || 'غير متاح'}
              </p>
            </div>
            <ManagerContact manager={match.opponent_team?.manager || match.host_team?.manager} />
          </div>

          <div className="flex flex-wrap gap-2">{onActions?.(match)}</div>
        </div>
      )}
    </Drawer>
  )
}
