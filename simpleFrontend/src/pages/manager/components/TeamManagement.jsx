import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Phone, Users, X } from 'lucide-react'
import api from '../../../api/client'
import { Button, Skeleton } from '../../../components/dashboard/ui'
import { useCommandCenter } from '../components/CommandCenterContext'
import { Section, positionLabels } from '../components/shared'

function PhoneButton({ player }) {
  const { t } = useTranslation()
  const number = player.phone || player.player_profile?.phone
  if (!number) return null
  const href = `tel:${number}`
  return (
    <a
      href={href}
      className="grid size-8 place-items-center rounded-xl bg-sky-50 text-sky-600 transition-colors hover:bg-sky-100"
      title={t('ov.team.call')}
    >
      <Phone className="size-3.5" />
    </a>
  )
}

function WhatsAppButton({ player }) {
  const { t } = useTranslation()
  const number = player.phone || player.player_profile?.phone
  if (!number) return null
  const clean = String(number).replace(/[^\d]/g, '')
  return (
    <a
      href={`https://wa.me/${clean}`}
      target="_blank"
      rel="noreferrer"
      className="grid size-8 place-items-center rounded-xl bg-green-50 text-green-600 transition-colors hover:bg-green-100"
      title={t('ov.team.whatsapp')}
    >
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.7-1.3 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1a16 16 0 0 1-1.6-.6 11.6 11.6 0 0 1-4.6-4c-.5-.7-1.1-1.8-1-3 .1-.7.7-1.4 1.3-1.6h.7c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.4.5c-.2.2-.3.4-.1.7a10 10 0 0 0 2 2.4c.7.6 1.4 1 2 1.3.3.2.5.1.7-.1l.6-.7c.2-.3.4-.2.7-.1l1.8.9c.3.2.5.3.6.4.1.1.1.6 0 1Z" />
      </svg>
    </a>
  )
}

function NumberBadge({ player }) {
  const { t } = useTranslation()
  const { toast, reload } = useCommandCenter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const save = async () => {
    const n = value.trim()
    if (!n || !/^\d{1,2}$/.test(n)) return toast.error(t('ov.team.invalidNumber'))
    try {
      await api.put(`/manager/players/${player.id}`, { number: parseInt(n, 10) })
      toast.success(t('ov.team.numberUpdated'))
      setEditing(false)
      reload()
    } catch {
      toast.error(t('ov.team.numberUpdateFailed'))
    }
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="w-14 rounded-lg border border-green-300 bg-white px-1.5 py-1 text-center text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-green-200"
        />
        <button onClick={save} type="button" aria-label="حفظ" className="text-green-600">
          <Check className="size-3.5" />
        </button>
        <button onClick={() => setEditing(false)} type="button" aria-label="إلغاء" className="text-slate-300">
          <X className="size-3.5" />
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => {
        setValue(String(player.number ?? ''))
        setEditing(true)
      }}
      className="grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg bg-slate-100 px-1 text-xs font-black text-slate-700 transition-colors hover:bg-slate-200"
      title={t('ov.team.changeNumber')}
    >
      {player.number ?? <Pencil className="size-3 text-slate-400" />}
    </button>
  )
}

export default function TeamManagement() {
  const { t } = useTranslation()
  const { players, loading, openPlayer, openTeam } = useCommandCenter()
  const list = players?.slice(0, 5) || []

  return (
    <Section
      id="team"
      icon={Users}
      tint="emerald"
      title={t('ov.team.title')}
      subtitle={t('ov.team.subtitle')}
      badge={
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600 ring-1 ring-emerald-200">
          {players?.length ?? 0}
        </span>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-xs font-semibold text-slate-400">
          {t('ov.team.empty')}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((p, i) => {
            const name = p.player_profile?.full_name || p.full_name || t('ov.team.playerN', { count: i + 1 })
            return (
              <div
                key={p.id}
                onClick={() => openPlayer(p)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-start transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
              >
                <NumberBadge player={p} />
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-black text-emerald-600">
                  {name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900">{name}</p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {positionLabels[p.position] && t('ov.positions.' + p.position) || positionLabels[p.position] || p.position || '—'}
                    {p.player_profile?.age ? ` • ${t('ov.team.yearsOld', { count: p.player_profile.age })}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <WhatsAppButton player={p} />
                  <PhoneButton player={p} />
                </div>
              </div>
            )
          })}
          <Button variant="soft" className="w-full" onClick={openTeam}>
            <Users className="size-4" />
            {t('ov.team.manageFullTeam')}
          </Button>
        </div>
      )}
    </Section>
  )
}
