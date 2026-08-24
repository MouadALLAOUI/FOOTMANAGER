import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlayerMatchDetail } from '../../../api/queries'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../../api/client'
import { q } from '../../../api/queries'
import PositionGrid from './PositionGrid'
import ManagerProfileCard from './ManagerProfileCard'
import PageSkeleton from '../../../components/system/PageSkeleton'
import {
  ArrowRight,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react'

const POSITION_LABELS = {
  goalkeeper: 'حارس المرمى',
  defender: 'مدافع',
  midfielder: 'لاعب وسط',
  forward: 'مهاجم',
}

export default function MatchDetail() {
  const { t } = useTranslation()
  const { matchId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = usePlayerMatchDetail(matchId)
  const [showApply, setShowApply] = useState(false)
  const [selectedPos, setSelectedPos] = useState(null)
  const [message, setMessage] = useState('')
  const [applyError, setApplyError] = useState(null)
  const [applySuccess, setApplySuccess] = useState(false)

  const applyMutation = useMutation({
    mutationFn: (payload) => api.post(`/player/matches/${matchId}/apply`, payload).then(r => r.data),
    onSuccess: () => {
      setApplySuccess(true)
      setShowApply(false)
      queryClient.invalidateQueries({ queryKey: q.playerMatchDetail(matchId) })
      queryClient.invalidateQueries({ queryKey: ['player', 'applications'] })
    },
    onError: (err) => {
      setApplyError(err.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب')
    },
  })

  if (isLoading) return <PageSkeleton />
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-muted font-medium">المباراة غير موجودة أو تم حذفها</p>
        <button onClick={() => navigate('/player/feed')} className="mt-4 text-primary text-sm underline">
          العودة للقائمة
        </button>
      </div>
    )
  }

  const { match, stadium, manager, positions_needed, position_availability, my_application } = data

  const hasPositions = positions_needed && Object.keys(positions_needed).length > 0
  const availablePositions = hasPositions
    ? Object.entries(position_availability || {}).filter(([, d]) => d.available > 0)
    : []
  const alreadyApplied = !!my_application || applySuccess
  const full = match.players_full

  function handleApply() {
    setApplyError(null)
    const payload = {}
    if (message.trim()) payload.message = message.trim()
    if (hasPositions && selectedPos) payload.position = selectedPos
    applyMutation.mutate(payload)
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition">
        <ArrowRight className="w-4 h-4" />
        رجوع
      </button>

      <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-black">تفاصيل المباراة</h1>
            {match.player_format && (
              <span className="inline-block mt-1 text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {match.player_format}
              </span>
            )}
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${full ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
            {full ? 'مكتملة' : 'مفتوحة'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{new Date(match.match_datetime).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{new Date(match.match_datetime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {stadium && (
            <div className="flex items-center gap-2 text-muted col-span-2">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{stadium.name}{stadium.city ? ` - ${stadium.city}` : ''}</span>
            </div>
          )}
          {!stadium && match.custom_terrain_name && (
            <div className="flex items-center gap-2 text-muted col-span-2">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{match.custom_terrain_name}</span>
            </div>
          )}
          {match.price_per_player != null && (
            <div className="flex items-center gap-2 text-muted">
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>{match.price_per_player} د.م / لاعب</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted">
            <Users className="w-4 h-4 shrink-0" />
            <span>{match.players_joined} لاعب مسجل{match.players_needed ? ` / ${match.players_needed} مطلوب` : ''}</span>
          </div>
        </div>

        {match.notes && (
          <div className="text-sm text-muted bg-background rounded-lg p-3 border border-border">
            {match.notes}
          </div>
        )}
      </div>

      {hasPositions && (
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-black flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            المراكز المطلوبة
          </h2>
          <PositionGrid availability={position_availability} />
        </div>
      )}

      {manager && (
        <div className="space-y-2">
          <h2 className="text-sm font-black flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            منظّم المباراة
          </h2>
          <ManagerProfileCard manager={manager} />
        </div>
      )}

      <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        {alreadyApplied ? (
          <div className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl py-3 px-4 text-green-400 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5" />
            {my_application ? `تم التقديم مسبقاً - ${my_application.status === 'accepted' ? 'مقبول' : 'بانتظار المراجعة'}` : 'تم إرسال طلبك بنجاح'}
          </div>
        ) : showApply ? (
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black">التقديم للمباراة</h3>
              <button onClick={() => { setShowApply(false); setApplyError(null) }} className="text-xs text-muted">إلغاء</button>
            </div>

            {hasPositions && availablePositions.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted">اختر المركز</label>
                <div className="grid grid-cols-2 gap-2">
                  {availablePositions.map(([pos, data]) => (
                    <button
                      key={pos}
                      onClick={() => setSelectedPos(pos)}
                      className={`text-sm py-2 px-3 rounded-xl border transition ${
                        selectedPos === pos
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-foreground hover:border-primary/50'
                      }`}
                    >
                      {POSITION_LABELS[pos]} ({data.available} متاح)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasPositions && !selectedPos && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                يجب اختيار مركز للتقديم
              </p>
            )}

            <div className="relative">
              <MessageSquare className="absolute top-3 start-3 w-4 h-4 text-muted" />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="رسالة اختيارية..."
                rows={2}
                className="w-full bg-background border border-border rounded-xl py-2 pe-3 ps-9 text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {applyError && (
              <p className="text-xs text-red-400">{applyError}</p>
            )}

            <button
              onClick={handleApply}
              disabled={applyMutation.isPending || (hasPositions && !selectedPos)}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                'إرسال طلب الانضمام'
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowApply(true)}
            disabled={full}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold disabled:opacity-50 disabled:bg-gray-600"
          >
            {full ? 'المباراة مكتملة' : 'التقديم لهذه المباراة'}
          </button>
        )}
      </div>
    </div>
  )
}
