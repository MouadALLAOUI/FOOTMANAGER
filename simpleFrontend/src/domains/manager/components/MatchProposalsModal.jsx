import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { Modal, Button } from '../../../components/dashboard/ui'
import TeamLogo from '../../../components/profile/TeamLogo'
import { logoThumb } from '../../../lib/thumb'

export default function MatchProposalsModal({ open, onClose, match, onConfirmed }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState(null)

  useEffect(() => {
    if (open && match?.id) {
      loadProposals()
    }
  }, [open, match?.id])

  const loadProposals = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/manager/match-requests/${match.id}/proposals`)
      setProposals(res.data.proposals || [])
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmProposal = async (proposal) => {
    const oppName = proposal.type === 'registered' ? proposal.team?.name : proposal.guest_team_name
    if (!window.confirm(`هل أنت متأكد من اختيار "${oppName}" كمنافس وتأكيد المباراة؟`)) return

    setConfirmingId(proposal.id)
    try {
      const res = await api.post(`/manager/match-requests/${match.id}/confirm-proposal/${proposal.id}`)
      toast.success(res.data.message || 'تم تأكيد المنافس بنجاح!')
      if (onConfirmed) onConfirmed(res.data.match)
      onClose()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setConfirmingId(null)
    }
  }

  if (!match) return null

  const inviteUrl = `${window.location.origin}/matches/invite/${match.invitation_token}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    toast.success('تم نسخ رابط التحدي بنجاح!')
  }

  const handleWhatsAppShare = () => {
    const fieldName = match.stadium?.name || match.custom_terrain_name || 'ملعب محدد'
    const matchDate = match.match_datetime
      ? new Date(match.match_datetime).toLocaleString('ar-MA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : ''
    const msg = `⚽ *تحدي مباراة ودية!*\nفريق *[${match.host_team?.name || 'فريقنا'}]* يبحث عن منافس!\n📍 *الملعب:* ${fieldName}\n📅 *الموعد:* ${matchDate}\n⚔️ *هل تقبل التحدي؟ أرسل طلب التحدي هنا:*\n${inviteUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="طلبات التحدي الواردة"
      subtitle={`مباراة: ${match.host_team?.name || ''} — ${match.stadium?.name || match.custom_terrain_name || ''}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Share Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/70 p-3.5">
          <div className="min-w-0">
            <p className="text-xs font-black text-emerald-900">رابط دعوة التحدي للمباراة</p>
            <p className="truncate text-[11px] font-medium text-emerald-700">{inviteUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyLink}>
              <Share2 className="size-3.5" />
              نسخ الرابط
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={handleWhatsAppShare}
            >
              <MessageCircle className="size-3.5" />
              واتساب
            </Button>
          </div>
        </div>

        {/* Proposals List */}
        {loading ? (
          <div className="py-12 text-center text-sm font-semibold text-slate-400">جاري تحميل الطلبات...</div>
        ) : proposals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Users className="size-6" />
            </div>
            <p className="mt-3 text-sm font-black text-slate-700">لم تصل أي طلبات تحدي بعد</p>
            <p className="mt-1 text-xs text-slate-400">
              انشر رابط التحدي في واتساب أو فيسبوك لجلب منافسين لمباراتك!
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleWhatsAppShare}>
                <MessageCircle className="size-3.5" />
                نشر في واتساب الآن
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => {
              const isRegistered = p.type === 'registered'
              const oppName = isRegistered ? p.team?.name : p.guest_team_name
              const contactName = isRegistered ? p.team?.manager?.name || p.user?.name : p.guest_contact_name
              const contactPhone = isRegistered ? p.team?.manager?.phone || p.user?.phone : p.guest_phone
              const cleanPhone = contactPhone ? contactPhone.replace(/[^0-9]/g, '') : null
              const isAccepted = p.status === 'accepted'
              const isPending = p.status === 'pending'
              const isBusy = confirmingId === p.id

              return (
                <div
                  key={p.id}
                  className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                    isAccepted
                      ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Opponent Info */}
                    <div className="flex items-center gap-3">
                      {isRegistered ? (
                        <TeamLogo team={p.team} src={logoThumb(p.team)} className="size-11" />
                      ) : (
                        <div className="grid size-11 place-items-center rounded-2xl bg-amber-100 font-black text-amber-700">
                          <User className="size-5" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900">{oppName}</p>
                          {isRegistered ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <Shield className="size-3" />
                              فريق معتمد
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              <User className="size-3" />
                              ضيف (بدون نقاط)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          المسؤول: <span className="font-bold text-slate-700">{contactName || 'غير محدد'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <MessageCircle className="size-3.5" />
                          واتساب
                        </a>
                      )}

                      {isAccepted ? (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">
                          <CheckCircle2 className="size-3.5" />
                          تم اختياره
                        </span>
                      ) : isPending && match.status === 'open' ? (
                        <Button
                          size="sm"
                          className="bg-slate-900 text-white hover:bg-emerald-600"
                          disabled={isBusy}
                          onClick={() => handleConfirmProposal(p)}
                        >
                          <Check className="size-3.5" />
                          {isBusy ? 'جاري التأكيد...' : 'اختيار وتأكيد المباراة'}
                        </Button>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">
                          {p.status === 'declined' ? 'تم اختيار منافس آخر' : p.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes if any */}
                  {p.notes && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
                      <span className="font-bold text-slate-700">رسالة المنافس: </span>
                      {p.notes}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="mt-2 text-[10px] text-slate-400">
                    أُرسل الطلب {new Date(p.created_at).toLocaleString('ar-MA')}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
