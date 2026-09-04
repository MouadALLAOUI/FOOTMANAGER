import { useTranslation } from 'react-i18next'
import { BellOff, BellRing, Send, Smartphone } from 'lucide-react'
import { useWebPush } from '../../hooks/useWebPush'
import { Toggle } from '../dashboard/ui'
import { useToast } from '../ui/Toast'

/**
 * Reusable "Enable notifications" control for ANY logged-in role.
 * Handles browser permission, Web Push subscription storage, and the iOS
 * Add-to-Home-Screen requirement (web push needs the PWA installed on iOS).
 */
export default function EnablePushNotifications({ className = '' }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { supported, subscribed, busy, needsIOSHomeScreen, enable, disable, sendTest } = useWebPush()

  const toggle = async () => {
    if (subscribed) {
      await disable()
      toast.info(t('notifications.push.disabled'))
      return
    }
    const result = await enable()
    if (result?.ok) {
      toast.success(t('notifications.push.enabled'))
    } else if (result?.reason === 'denied') {
      toast.error(t('notifications.push.denied'))
    } else if (result?.reason === 'unsupported') {
      toast.error(t('notifications.push.unsupported'))
    } else if (result?.reason === 'error') {
      toast.error(`${t('notifications.push.error')} ${result?.error || ''}`)
    }
    // reason 'ios-home-screen' is surfaced inline by needsIOSHomeScreen
  }

  const sendTestNow = async () => {
    const result = await sendTest()
    if (result?.ok) toast.success(t('notifications.push.testSent'))
    else if (result?.reason === 'not-subscribed') toast.info(t('notifications.push.testNotSubscribed'))
    else toast.error(result?.message || t('notifications.push.testFailed'))
  }

  if (!supported) return null

  return (
    <div className={`rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            {subscribed ? <BellRing className="size-4" /> : <BellOff className="size-4" />}
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t('notifications.push.title')}</h3>
            <p className="text-[11px] font-semibold text-slate-400">{t('notifications.push.desc')}</p>
          </div>
        </div>
        <Toggle checked={subscribed} onChange={toggle} disabled={busy} label={t('notifications.push.toggle')} />
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={sendTestNow}
          disabled={busy || !subscribed}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="size-3.5" />
          {t('notifications.push.test')}
        </button>
      </div>

      {needsIOSHomeScreen && <IosNudge />}
    </div>
  )
}

export function IosNudge() {
  const { t } = useTranslation()
  return (
    <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
        <Smartphone className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-extrabold text-amber-800">{t('notifications.push.iosTitle')}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-700">{t('notifications.push.iosBody')}</p>
      </div>
    </div>
  )
}

export function PushEnableBanner() {
  const { t } = useTranslation()
  const { supported, subscribed, busy, needsIOSHomeScreen, enable, sendTest } = useWebPush()
  const { toast } = useToast()

  if (!supported) return null

  const confirm = async () => {
    const result = await enable()
    if (result?.ok) toast.success(t('notifications.push.enabled'))
    else if (result?.reason === 'denied') toast.error(t('notifications.push.denied'))
    else if (result?.reason === 'error') toast.error(`${t('notifications.push.error')} ${result?.error || ''}`)
    else if (result?.ok === false && !result?.reason) toast.info(t('notifications.push.enableToTest'))
  }

  const sendTestNow = async () => {
    const result = await sendTest()
    if (result?.ok) toast.success(t('notifications.push.testSent'))
    else if (result?.reason === 'not-subscribed') toast.info(t('notifications.push.testNotSubscribed'))
    else toast.error(result?.message || t('notifications.push.testFailed'))
  }

  const primary = subscribed
    ? {
        label: t('notifications.push.test'),
        onClick: sendTestNow,
        cls: 'bg-slate-900 hover:bg-slate-800',
        icon: Send,
      }
    : {
        label: t('notifications.push.enable'),
        onClick: confirm,
        cls: 'bg-emerald-500 hover:bg-emerald-600',
        icon: BellRing,
      }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
        {subscribed ? <BellRing className="size-4" /> : <BellOff className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-emerald-900">
          {subscribed ? t('notifications.push.title') : t('notifications.push.nudgeTitle')}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-700">
          {subscribed ? t('notifications.push.testHint') : t('notifications.push.nudgeBody')}
        </p>
        {needsIOSHomeScreen && <IosNudge />}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={primary.onClick}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50 ${primary.cls}`}
        >
          <primary.icon className="size-3.5" />
          {primary.label}
        </button>
      </div>
    </div>
  )
}
