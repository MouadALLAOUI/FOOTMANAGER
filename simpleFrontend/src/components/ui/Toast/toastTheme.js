import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { TOAST_TYPES } from './toastConfig'

export const TOAST_THEMES = {
  [TOAST_TYPES.SUCCESS]: {
    Icon: CheckCircle2,
    accent: 'text-emerald-600',
    bar: 'text-emerald-500',
    chip: 'bg-emerald-500',
    glow: 'shadow-[0_10px_28px_rgba(16,185,129,0.2)]',
  },
  [TOAST_TYPES.ERROR]: {
    Icon: XCircle,
    accent: 'text-rose-600',
    bar: 'text-rose-500',
    chip: 'bg-rose-500',
    glow: 'shadow-[0_10px_28px_rgba(244,63,94,0.2)]',
  },
  [TOAST_TYPES.WARNING]: {
    Icon: AlertTriangle,
    accent: 'text-amber-600',
    bar: 'text-amber-500',
    chip: 'bg-amber-500',
    glow: 'shadow-[0_10px_28px_rgba(245,158,11,0.2)]',
  },
  [TOAST_TYPES.INFO]: {
    Icon: Info,
    accent: 'text-sky-600',
    bar: 'text-sky-500',
    chip: 'bg-sky-500',
    glow: 'shadow-[0_10px_28px_rgba(14,165,233,0.2)]',
  },
}
