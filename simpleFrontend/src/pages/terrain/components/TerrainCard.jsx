import { useEffect, useRef, useState } from 'react'
import {
  Banknote,
  Images,
  MapPin,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, StatusBadge } from '../../../components/dashboard/ui'
import { coverThumb } from '../../../lib/thumb'

export const typeLabels = {
  salle: 'قاعة مغطاة',
  synthetic: 'عشب اصطناعي',
  cement: 'أرضية إسمنتية',
  minifoot: 'ميني فوتبول',
  grass: 'عشب طبيعي',
}

export function TerrainCard({ terrain, onEdit, onImages, onDelete, onToggle, occupancy, toggleBusy }) {
  const { t } = useTranslation()
  const img = coverThumb(terrain) || terrain.images?.[0]?.image_url
  const open = terrain.is_open !== false
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDocMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <div className="group relative rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]">
      <div className="relative aspect-[16/9] overflow-hidden rounded-t-3xl">
        {img ? (
          <img
            src={img}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
            <span className="text-5xl">🏟️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
        <div className="absolute start-4 top-4 flex gap-2">
          {open ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-white shadow">
              <span className="size-1.5 rounded-full bg-white" />
              مفتوح
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-black text-white shadow">
              <span className="size-1.5 rounded-full bg-white" />
              مغلق
            </span>
          )}
          {occupancy !== undefined && (
            <span className="rounded-full bg-slate-900/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
              إشغال {occupancy}%
            </span>
          )}
        </div>
        <div className="absolute bottom-3 start-4 end-4">
          <p className="truncate text-lg font-black text-white">{terrain.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-white/70">
            <MapPin className="size-3" />
            {terrain.city || 'بدون مدينة'} • {typeLabels[terrain.type] || terrain.type}
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{terrain.player_format || '—'}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 font-extrabold text-green-700">
            <Banknote className="size-3" />
            {Number(terrain.price_per_team || 0).toLocaleString('ar-MA')} د.م
          </span>
        </div>
        {terrain.facilities?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {terrain.facilities.slice(0, 4).map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-100">
                {f.icon || '🏟️'} {f.name}
              </span>
            ))}
            {terrain.facilities.length > 4 && (
              <span className="text-[10px] font-bold text-slate-400">+{terrain.facilities.length - 4}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t border-slate-100 p-3">
        <Button variant="outline" size="sm" className="flex-1 !px-2" onClick={onEdit}>
          <Pencil className="size-3.5" />
          {t('terrain.card.edit')}
        </Button>
        <Button
          variant={open ? 'outline' : 'soft'}
          size="sm"
          className="flex-1 !px-2"
          onClick={onToggle}
          disabled={toggleBusy}
        >
          {open ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {open ? t('terrain.card.suspend') : t('terrain.card.activate')}
        </Button>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={t('terrain.card.more')}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label={t('terrain.card.more')}
              className="absolute end-0 top-10 z-20 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onImages()
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <Images className="size-4 text-slate-400" />
                {t('terrain.card.images')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete()
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-xs font-bold text-rose-500 hover:bg-rose-50"
              >
                <Trash2 className="size-4" />
                {t('terrain.card.deleteField')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TerrainListItem({ terrain, onEdit, onToggle, onDelete }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors hover:border-green-200">
      <StatusBadge status={terrain.is_open === false ? 'cancelled' : 'open'} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-slate-900">{terrain.name}</p>
        <p className="truncate text-[11px] text-slate-400">
          {terrain.city || '—'} • {typeLabels[terrain.type] || terrain.type} • {terrain.player_format || '—'} •{' '}
          {Number(terrain.price_per_team || 0).toLocaleString('ar-MA')} د.م
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" />
          تعديل
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          {terrain.is_open === false ? 'فتح' : 'إغلاق'}
        </Button>
        <Button variant="ghost" size="sm" className="!text-rose-500" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
