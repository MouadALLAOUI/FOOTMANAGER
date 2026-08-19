import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import api from '../../api/client'
import { getApiErrorMessage } from '../../lib/errors'
import { inputClass } from '../../components/dashboard/ui'
import { useToast } from '../../components/ui/Toast'
import Reveal from '../matches/reveal'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[0-9][0-9\s-]{4,}$/

const initial = { name: '', email: '', phone: '', subject: '', message: '', website: '' }

export default function ContactForm() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = t('contact.form.errors.nameRequired')
    if (!EMAIL_RE.test(form.email)) next.email = t('contact.form.errors.emailInvalid')
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) next.phone = t('contact.form.errors.phoneInvalid')
    if (!form.subject.trim()) next.subject = t('contact.form.errors.subjectRequired')
    if (form.message.trim().length < 10) next.message = t('contact.form.errors.messageMin')
    else if (form.message.length > 2000) next.message = t('contact.form.errors.messageMax')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy || !validate()) return
    setBusy(true)
    try {
      await api.post('/v1/contact/messages', form)
      setForm(initial)
      setErrors({})
      setDone(true)
    } catch (err) {
      toast.error(getApiErrorMessage(err, t, t('contact.form.failed')))
    } finally {
      setBusy(false)
    }
  }

  const fieldClass = (key) => `${inputClass} w-full ${errors[key] ? '!border-rose-400' : ''}`

  return (
    <section className="bg-[#f6f7fb] pb-[140px] pt-[100px] lg:pb-[160px] lg:pt-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr,1.5fr] lg:gap-14">
          <Reveal>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1.5 text-xs font-bold text-green-600 ring-1 ring-green-500/20">
                {t('contact.form.badge')}
              </span>
              <h2 className="mt-5 text-3xl font-black leading-[1.3] text-slate-900 lg:text-[38px]">
                {t('contact.form.title')}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-500 lg:text-base">
                {t('contact.form.subtitle')}
              </p>

              <div className="relative mt-8 overflow-hidden rounded-[26px] bg-[#111827] p-6 text-white ring-1 ring-white/10">
                <div className="animate-gradient-move pointer-events-none absolute -top-20 start-1/3 size-60 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.25),transparent_65%)] blur-[50px]" />
                <p className="relative text-sm font-black leading-relaxed text-white/90">
                  {t('contact.form.replyNote')}
                </p>
                <p className="relative mt-3 text-xs font-semibold leading-relaxed text-slate-300">
                  {t('contact.form.replyNoteDesc')}
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            {done ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-[26px] bg-white p-8 text-center shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100">
                <span className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-8" />
                </span>
                <h3 className="mt-5 text-xl font-black text-slate-900">{t('contact.form.successTitle')}</h3>
                <p className="mt-2 max-w-sm text-sm font-semibold leading-relaxed text-slate-500">
                  {t('contact.form.success')}
                </p>
                <button
                  type="button"
                  onClick={() => setDone(false)}
                  className="mt-7 rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-green-500 hover:text-green-600"
                >
                  {t('contact.form.another')}
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-[26px] bg-white p-6 shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 lg:p-8"
              >
                <input
                  name="website"
                  type="text"
                  value={form.website}
                  onChange={set('website')}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('contact.form.name')} *</span>
                    <input className={fieldClass('name')} value={form.name} onChange={set('name')} maxLength={255} />
                    {errors.name && <span className="mt-1 block text-[11px] font-bold text-rose-500">{errors.name}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('contact.form.email')} *</span>
                    <input className={fieldClass('email')} dir="ltr" type="email" value={form.email} onChange={set('email')} maxLength={255} />
                    {errors.email && <span className="mt-1 block text-[11px] font-bold text-rose-500">{errors.email}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('contact.form.phone')}</span>
                    <input className={fieldClass('phone')} dir="ltr" value={form.phone} onChange={set('phone')} maxLength={30} />
                    {errors.phone && <span className="mt-1 block text-[11px] font-bold text-rose-500">{errors.phone}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('contact.form.subject')} *</span>
                    <input className={fieldClass('subject')} value={form.subject} onChange={set('subject')} maxLength={255} />
                    {errors.subject && <span className="mt-1 block text-[11px] font-bold text-rose-500">{errors.subject}</span>}
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('contact.form.message')} *</span>
                  <textarea
                    className={`${inputClass} !h-auto min-h-36 w-full resize-none py-3 ${errors.message ? '!border-rose-400' : ''}`}
                    value={form.message}
                    onChange={set('message')}
                    maxLength={2000}
                  />
                  <span className="mt-1 flex items-center justify-between gap-3">
                    {errors.message ? (
                      <span className="text-[11px] font-bold text-rose-500">{errors.message}</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400">{t('contact.form.messageHint')}</span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-400" dir="ltr">
                      {form.message.length}/2000
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-ripple mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-green-500 px-8 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 hover:shadow-[0_22px_55px_rgba(22,163,74,0.6)] active:translate-y-0 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                  {t(busy ? 'contact.form.sending' : 'contact.form.submit')}
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
