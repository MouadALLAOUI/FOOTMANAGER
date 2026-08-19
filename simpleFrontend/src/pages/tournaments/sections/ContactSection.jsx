import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebook, faInstagram, faTiktok, faWhatsapp, faYoutube } from '@fortawesome/free-brands-svg-icons'
import { Loader2, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import api from '../../../api/client'
import { inputClass } from '../../../components/dashboard/ui'

const socials = [
  { key: 'facebook', icon: faFacebook, brand: '#1877F2' },
  { key: 'instagram', icon: faInstagram, brand: '#E4405F' },
  { key: 'tiktok', icon: faTiktok, brand: '#111827' },
  { key: 'youtube', icon: faYoutube, brand: '#FF0000' },
  { key: 'whatsapp', icon: faWhatsapp, brand: '#25D366' },
]

const initial = { name: '', email: '', phone: '', subject: '', message: '', website: '' }

export default function ContactSection({ contact, tournamentKey }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setDone(false)
    try {
      await api.post(`/v1/tournaments/${tournamentKey}/contact/messages`, form)
      setForm(initial)
      setDone(true)
    } catch (err) {
      const messages = err.response?.data?.errors
      setError(Object.values(messages || {})[0]?.[0] || err.response?.data?.message || t('public.contact.failed'))
    } finally {
      setBusy(false)
    }
  }

  const visibleSocials = socials.filter((s) => contact?.[`${s.key}_url`])
  const hasInfo = Boolean(contact?.phone || contact?.email || contact?.whatsapp_link || contact?.location || visibleSocials.length > 0)

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="mb-5 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-sky-50 text-sky-600"><MessageCircle className="size-4" /></span>
        <h4 className="text-sm font-black text-slate-900">{t('public.contact.title')}</h4>
      </div>

      <div className={hasInfo ? 'grid gap-6 lg:grid-cols-[1fr,1.4fr]' : ''}>
        {hasInfo && (
          <div className="flex flex-col gap-3">
            {contact?.phone && (
              <a href={`tel:${contact.phone}`} dir="ltr" className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-left">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Phone className="size-4" /></span>
                <span className="text-sm font-extrabold text-slate-800">{contact.phone}</span>
              </a>
            )}
            {contact?.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600"><Mail className="size-4" /></span>
                <span dir="ltr" className="break-all text-sm font-extrabold text-slate-800">{contact.email}</span>
              </a>
            )}
            {contact?.whatsapp_link && (
              <a
                href={contact.whatsapp_link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-600"><FontAwesomeIcon icon={faWhatsapp} className="size-4" /></span>
                <span className="text-sm font-extrabold text-slate-800">{t('public.contact.whatsapp')}</span>
              </a>
            )}
            {contact?.location && (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><MapPin className="size-4" /></span>
                <span className="text-sm font-extrabold text-slate-800">{contact.location}</span>
              </div>
            )}
            {visibleSocials.length > 0 && (
              <div className="mt-1">
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{t('public.contact.follow')}</p>
                <div className="flex flex-wrap gap-2">
                  {visibleSocials.map((s) => (
                    <a
                      key={s.key}
                      href={contact[`${s.key}_url`]}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={s.key}
                      className="grid size-10 place-items-center rounded-xl border border-slate-100 bg-white text-slate-500 transition hover:scale-105 hover:border-slate-200"
                    >
                      <FontAwesomeIcon icon={s.icon} className="size-4" style={{ color: s.brand }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input name="website" type="text" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={`${inputClass} w-full`} value={form.name} onChange={set('name')} placeholder={t('public.contact.name')} required maxLength={255} />
            <input className={`${inputClass} w-full`} dir="ltr" value={form.email} onChange={set('email')} placeholder={t('public.contact.email')} type="email" required maxLength={255} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={`${inputClass} w-full`} dir="ltr" value={form.phone} onChange={set('phone')} placeholder={t('public.contact.phone')} maxLength={30} />
            <input className={`${inputClass} w-full`} value={form.subject} onChange={set('subject')} placeholder={t('public.contact.subject')} required maxLength={255} />
          </div>
          <textarea
            className={`${inputClass} !h-auto min-h-28 w-full resize-none py-3`}
            value={form.message}
            onChange={set('message')}
            placeholder={t('public.contact.message')}
            required
            minLength={10}
            maxLength={2000}
          />
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          {done && <p className="text-xs font-bold text-emerald-600">{t('public.contact.success')}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-60 sm:w-auto"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {t(busy ? 'public.contact.sending' : 'public.contact.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
