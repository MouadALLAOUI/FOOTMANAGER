import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  MapPin,
  Phone,
  Shield,
  Swords,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { Modal, Skeleton, StatusBadge, Button } from '../../../components/dashboard/ui'
import TeamLogo from '../../../components/profile/TeamLogo'

export default function OpponentProfileModal({ teamId, open, onClose }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !teamId) {
      setData(null)
      setError('')
      return
    }

    let isMounted = true
    setLoading(true)
    setError('')

    api
      .get(`/manager/teams/${teamId}`)
      .then((res) => {
        if (isMounted) setData(res.data)
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || 'تعذر تحميل بيانات الفريق')
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [open, teamId])

  const team = data?.team
  const recentMatches = data?.recent_matches || []

  return (
    <Modal open={open} onClose={onClose} title="الملف التعريفي للفريق المنافس" subtitle="معلومات وتشكيلة ونتائج الفريق الأخيرة">
      {loading ? (
        <div className="space-y-4 py-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-center text-sm font-bold text-rose-600">
          {error}
        </div>
      ) : team ? (
        <div className="space-y-5">
          {/* Header Card */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <TeamLogo
              team={team}
              src={team.logo_thumbnail_url || team.logo_url}
              className="size-16 rounded-2xl shadow-sm"
              fontSize="text-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-slate-900">{team.name}</p>
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>{team.category === 'adult' ? 'كبار' : team.category === 'teenager' ? 'شباب' : 'براعم'}</span>
                {team.city && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3 text-slate-400" />
                      {team.city}
                    </span>
                  </>
                )}
              </p>
              {team.primary_stadium?.name && (
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  الملعب الأساسي: {team.primary_stadium.name}
                </p>
              )}
            </div>
          </div>

          {/* Manager Information */}
          {team.manager && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white text-slate-600 shadow-sm">
                  <User className="size-4" />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400">المسير الرياضي</p>
                  <p className="text-sm font-extrabold text-slate-800">{team.manager.name}</p>
                </div>
              </div>
              {team.manager.phone && (
                <a
                  href={`tel:${team.manager.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  dir="ltr"
                >
                  <Phone className="size-3 text-green-600" />
                  {team.manager.phone}
                </a>
              )}
            </div>
          )}

          {/* Active Formation if present */}
          {team.formation && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                  <Shield className="size-3.5" />
                  التشكيلة الأساسية ({team.formation.name || team.formation.format})
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                  {team.formation.format}
                </span>
              </div>
              {team.formation.formation && (
                <p className="mt-1 text-xs font-bold text-emerald-600">
                  الرسم التكتيكي: {team.formation.formation}
                </p>
              )}
            </div>
          )}

          {/* Squad Players preview */}
          {team.players && team.players.length > 0 && (
            <div>
              <p className="mb-2 flex items-center justify-between text-xs font-black text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  قائمة اللاعبين
                </span>
                <span className="text-slate-400">{team.players.length} لاعب</span>
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pe-1">
                {team.players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-slate-100 font-black text-[10px] text-slate-700">
                        {p.number ?? '–'}
                      </span>
                      <span className="font-bold text-slate-800">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {p.position === 'goalkeeper'
                        ? 'حارس'
                        : p.position === 'defender'
                          ? 'مدافع'
                          : p.position === 'midfielder'
                            ? 'وسط'
                            : p.position === 'forward'
                              ? 'مهاجم'
                              : p.position}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Matches */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-700">
              <Trophy className="size-3.5" />
              آخر المباريات المكتملة
            </p>
            {recentMatches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
                لا توجد مباريات مكتملة مسجلة مؤخراً
              </p>
            ) : (
              <div className="space-y-2">
                {recentMatches.map((m) => {
                  const isHost = m.host_team_id === team.id
                  const teamScore = isHost ? m.host_score : m.opponent_score
                  const oppScore = isHost ? m.opponent_score : m.host_score
                  const oppTeam = isHost ? m.opponent_team : m.host_team
                  const won = teamScore > oppScore
                  const draw = teamScore === oppScore

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-2.5 text-xs shadow-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`grid size-6 place-items-center rounded-lg text-[10px] font-black ${
                            won
                              ? 'bg-emerald-100 text-emerald-700'
                              : draw
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {won ? 'فوز' : draw ? 'تعادل' : 'خسارة'}
                        </span>
                        <span className="truncate font-bold text-slate-800">
                          ضد {oppTeam?.name || 'فريق'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-black tabular-nums text-slate-900">
                        <span>{teamScore ?? '–'}</span>
                        <span className="text-slate-300">-</span>
                        <span>{oppScore ?? '–'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
