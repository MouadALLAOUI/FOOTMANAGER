import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebook, faInstagram, faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { SectionError } from '../../components/errors'
import Reveal from '../matches/reveal'

const socials = [
  { key: 'facebook', icon: faFacebook, brand: '#1877F2' },
  { key: 'instagram', icon: faInstagram, brand: '#E4405F' },
]

export default function ContactInfo() {
  const { t } = useTranslation()
  const { data, loading, error, errorState, refetch } = useApi(() => api.get('/v1/contact').then((r) => r.data.data))

  const hasInfo = Boolean(
    data?.phone || data?.email || data?.whatsapp_link || data?.address || data?.working_hours,
  )
  const visibleSocials = socials.filter((s) => data?.[`${s.key}_url`])

  return (
    <section id="contact-info" className="scroll-mt-6 bg-white py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-1.5 text-xs font-bold text-green-600 ring-1 ring-green-500/20">
              {t('contact.info.badge')}
            </span>
            <h2 className="mt-5 text-3xl font-black leading-[1.3] text-slate-900 lg:text-[38px]">
              {t('contact.info.title')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-500 lg:text-base">
              {t('contact.info.subtitle')}
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data?.phone && (
            <Reveal delay={60}>
              <a
                href={`tel:${data.phone}`}
                dir="ltr"
                className="group flex h-full flex-col justify-between rounded-[26px] bg-[#f6f7fb] p-6 ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-2 hover:bg-white hover:shadow-[0_8px_30px_rgba(17,24,39,0.08)] hover:ring-green-500"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Phone className="size-5" />
                </span>
                <span className="mt-5">
                  <span className="block text-sm font-black text-slate-900">{t('contact.info.phone')}</span>
                  <span className="mt-1 block text-left text-lg font-extrabold tracking-wide text-slate-600">
                    {data.phone}
                  </span>
                </span>
              </a>
            </Reveal>
          )}

          {data?.email && (
            <Reveal delay={120}>
              <a
                href={`mailto:${data.email}`}
                className="group flex h-full flex-col justify-between rounded-[26px] bg-[#f6f7fb] p-6 ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-2 hover:bg-white hover:shadow-[0_8px_30px_rgba(17,24,39,0.08)] hover:ring-green-500"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                  <Mail className="size-5" />
                </span>
                <span className="mt-5">
                  <span className="block text-sm font-black text-slate-900">{t('contact.info.email')}</span>
                  <span dir="ltr" className="mt-1 block break-all text-end text-lg font-extrabold tracking-wide text-slate-600">
                    {data.email}
                  </span>
                </span>
              </a>
            </Reveal>
          )}

          {data?.whatsapp_link && (
            <Reveal delay={180}>
              <a
                href={data.whatsapp_link}
                target="_blank"
                rel="noreferrer"
                className="group flex h-full flex-col justify-between rounded-[26px] bg-[#f6f7fb] p-6 ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-2 hover:bg-white hover:shadow-[0_8px_30px_rgba(17,24,39,0.08)] hover:ring-green-500"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-green-100 text-green-600">
                  <FontAwesomeIcon icon={faWhatsapp} className="size-5" />
                </span>
                <span className="mt-5">
                  <span className="block text-sm font-black text-slate-900">{t('contact.info.whatsapp')}</span>
                  <span dir="ltr" className="mt-1 block text-end text-lg font-extrabold tracking-wide text-green-600">
                    {data.whatsapp_number}
                  </span>
                </span>
              </a>
            </Reveal>
          )}

          {data?.address && (
            <Reveal delay={60}>
              <div className="flex h-full flex-col justify-between rounded-[26px] bg-[#f6f7fb] p-6 ring-1 ring-slate-100">
                <span className="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                  <MapPin className="size-5" />
                </span>
                <span className="mt-5">
                  <span className="block text-sm font-black text-slate-900">{t('contact.info.address')}</span>
                  <span className="mt-1 block text-lg font-extrabold leading-relaxed text-slate-600">
                    {data.address}
                  </span>
                </span>
              </div>
            </Reveal>
          )}

          {data?.working_hours && (
            <Reveal delay={120}>
              <div className="flex h-full flex-col justify-between rounded-[26px] bg-[#f6f7fb] p-6 ring-1 ring-slate-100">
                <span className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                  <Clock className="size-5" />
                </span>
                <span className="mt-5">
                  <span className="block text-sm font-black text-slate-900">{t('contact.info.workingHours')}</span>
                  <span className="mt-1 block text-lg font-extrabold leading-relaxed text-slate-600">
                    {data.working_hours}
                  </span>
                </span>
              </div>
            </Reveal>
          )}
        </div>

        {visibleSocials.length > 0 && (
          <Reveal delay={160}>
            <div className="mt-10 flex items-center justify-center gap-4">
              <span className="text-sm font-black text-slate-400">{t('contact.info.follow')}</span>
              <div className="flex gap-3">
                {visibleSocials.map((s) => (
                  <a
                    key={s.key}
                    href={data[`${s.key}_url`]}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.key}
                    className="grid size-11 place-items-center rounded-2xl border border-slate-100 bg-white text-slate-500 transition hover:scale-105 hover:border-slate-200 hover:shadow-[0_8px_30px_rgba(17,24,39,0.08)]"
                  >
                    <FontAwesomeIcon icon={s.icon} className="size-5" style={{ color: s.brand }} />
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {error && (
          <div className="mt-12">
            <SectionError state={errorState} onRetry={refetch} />
          </div>
        )}

        {!loading && !error && !hasInfo && (
          <p className="mt-10 text-center text-sm font-bold text-slate-400">
            {t('contact.info.empty')}
          </p>
        )}
      </div>
    </section>
  )
}
