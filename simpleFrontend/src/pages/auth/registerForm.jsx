import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUser,
  faLock,
  faEye,
  faEyeSlash,
  faUserGroup,
  faBolt,
  faShieldHalved,
  faUserPlus,
  faArrowRight,
  faSpinner,
  faLayerGroup,
  faPhone,
  faEnvelope,
  faUsers,
  faShirt,
  faChartLine,
  faLocationDot,
  faCakeCandles,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import PremiumField from './premiumField'

const roles = [
  { id: 'manager', icon: faUserGroup },
  { id: 'terrain_owner', icon: faBolt },
  { id: 'player', icon: faShieldHalved },
  { id: 'committee', icon: faTrophy },
]

const categories = ['adult', 'teenager', 'children']
const positions = ['goalkeeper', 'defender', 'midfielder', 'forward']
const skills = ['beginner', 'amateur', 'semi_pro', 'pro']

export default function RegisterForm() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState(null)
  const [form, setForm] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(role, form)
      navigate('/pending')
    } catch (err) {
      const first = Object.values(err.response?.data?.errors || {})[0]
      setError(first?.[0] || err.response?.data?.message || t('auth.errors.registerFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (!role) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRole(r.id)}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:border-green-400 hover:shadow-[0_18px_40px_rgba(34,197,94,0.12)] active:translate-y-0"
          >
            <div className="grid size-12 place-items-center rounded-2xl bg-green-500/10 text-green-600 transition-colors duration-300 group-hover:bg-green-500 group-hover:text-white group-hover:shadow-[0_10px_24px_rgba(22,163,74,0.4)]">
              <FontAwesomeIcon icon={r.icon} className="size-5" />
            </div>
            <p className="text-sm font-extrabold text-slate-900">{t(`auth.roles.${r.id}.title`)}</p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {t(`auth.roles.${r.id}.description`)}
            </p>
          </button>
        ))}
      </div>
    )
  }

  const selected = roles.find((r) => r.id === role)

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setRole(null)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-green-600"
        >
          <FontAwesomeIcon icon={faArrowRight} className="size-3.5 ltr:rotate-180" />
          {t('auth.roles.back')}
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-100">
          <FontAwesomeIcon icon={selected.icon} className="size-3.5" />
          {t(`auth.roles.${role}.title`)}
        </span>
      </div>

      {error && (
        <div className="fade-in rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PremiumField
          id="reg-name"
          label={t('auth.fields.name')}
          placeholder={t('auth.placeholders.name')}
          icon={<FontAwesomeIcon icon={faUser} className="size-[18px]" />}
          value={form.name || ''}
          onChange={set('name')}
          required
          autoComplete="name"
        />
        <PremiumField
          id="reg-phone"
          label={t('auth.fields.phone')}
          placeholder={t('auth.placeholders.phone')}
          type="tel"
          icon={<FontAwesomeIcon icon={faPhone} className="size-[18px]" />}
          value={form.phone || ''}
          onChange={set('phone')}
          required
          autoComplete="tel"
        />
        <PremiumField
          id="reg-email"
          label={t('auth.fields.email')}
          placeholder={t('auth.placeholders.email')}
          type="email"
          icon={<FontAwesomeIcon icon={faEnvelope} className="size-[18px]" />}
          value={form.email || ''}
          onChange={set('email')}
          autoComplete="email"
        />
        <PremiumField
          id="reg-password"
          label={t('auth.fields.password')}
          placeholder={t('auth.placeholders.password')}
          type={showPassword ? 'text' : 'password'}
          icon={<FontAwesomeIcon icon={faLock} className="size-[18px]" />}
          value={form.password || ''}
          onChange={set('password')}
          required
          autoComplete="new-password"
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              className="absolute end-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition-all duration-300 hover:bg-slate-100 hover:text-green-600"
            >
              <FontAwesomeIcon
                icon={showPassword ? faEyeSlash : faEye}
                className="size-[18px]"
              />
            </button>
          }
        />
      </div>

      {role === 'manager' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PremiumField
            id="reg-team"
            label={t('auth.fields.teamName')}
            placeholder={t('auth.placeholders.teamName')}
            icon={<FontAwesomeIcon icon={faUserGroup} className="size-[18px]" />}
            value={form.team_name || ''}
            onChange={set('team_name')}
            required
          />
          <PremiumField
            id="reg-members"
            label={t('auth.fields.memberCount')}
            placeholder={t('auth.placeholders.memberCount')}
            type="number"
            min="1"
            icon={<FontAwesomeIcon icon={faUsers} className="size-[18px]" />}
            value={form.member_count || ''}
            onChange={set('member_count')}
            required
          />
          <PremiumField
            id="reg-category"
            label={t('auth.fields.teamCategory')}
            select
            icon={<FontAwesomeIcon icon={faLayerGroup} className="size-[18px]" />}
            value={form.team_category || ''}
            onChange={set('team_category')}
            required
          >
            <option value="" disabled>
              {t('auth.selects.category')}
            </option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {t(`auth.selects.categories.${c}`)}
              </option>
            ))}
          </PremiumField>
          <PremiumField
            id="reg-assoc"
            label={t('auth.fields.associationName')}
            placeholder={t('auth.placeholders.associationName')}
            value={form.association_name || ''}
            onChange={set('association_name')}
          />
        </div>
      )}

      {role === 'player' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PremiumField
            id="reg-position"
            label={t('auth.fields.position')}
            select
            icon={<FontAwesomeIcon icon={faShirt} className="size-[18px]" />}
            value={form.position || ''}
            onChange={set('position')}
          >
            <option value="" disabled>
              {t('auth.selects.position')}
            </option>
            {positions.map((p) => (
              <option key={p} value={p}>
                {t(`auth.selects.positions.${p}`)}
              </option>
            ))}
          </PremiumField>
          <PremiumField
            id="reg-skill"
            label={t('auth.fields.skillLevel')}
            select
            icon={<FontAwesomeIcon icon={faChartLine} className="size-[18px]" />}
            value={form.skill_level || ''}
            onChange={set('skill_level')}
          >
            <option value="" disabled>
              {t('auth.selects.skill')}
            </option>
            {skills.map((s) => (
              <option key={s} value={s}>
                {t(`auth.selects.skills.${s}`)}
              </option>
            ))}
          </PremiumField>
          <PremiumField
            id="reg-city"
            label={t('auth.fields.city')}
            placeholder={t('auth.placeholders.city')}
            icon={<FontAwesomeIcon icon={faLocationDot} className="size-[18px]" />}
            value={form.city || ''}
            onChange={set('city')}
          />
          <PremiumField
            id="reg-birth"
            label={t('auth.fields.birthYear')}
            placeholder={t('auth.placeholders.birthYear')}
            type="number"
            min="1950"
            max={new Date().getFullYear()}
            icon={<FontAwesomeIcon icon={faCakeCandles} className="size-[18px]" />}
            value={form.birth_year || ''}
            onChange={set('birth_year')}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-ripple flex h-[58px] w-full items-center justify-center gap-2.5 rounded-2xl bg-green-500 text-[15px] font-extrabold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-[0_22px_55px_rgba(22,163,74,0.6)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? (
          <FontAwesomeIcon icon={faSpinner} className="size-5 animate-spin" />
        ) : (
          <FontAwesomeIcon icon={faUserPlus} className="size-5" />
        )}
        {busy ? t('auth.submitRegisterBusy') : t('auth.submitRegister')}
      </button>
    </form>
  )
}
