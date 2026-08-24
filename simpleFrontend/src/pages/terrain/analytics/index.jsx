import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, CalendarCheck, CalendarX2, CheckCircle2, Clock3, CreditCard, Hourglass, Percent, Repeat, Ticket, Wallet, XCircle } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { mapHttpError } from '../../../lib/errorState'
import { SectionError } from '../../../components/errors'
import { Card, SectionTitle, Skeleton, Stat } from '../../../components/dashboard/ui'
import { AreaTrend, Bars, Donut } from '../../../components/dashboard/charts'
import RangeFilter, { rangeForPreset } from '../../../components/analytics/RangeFilter'

const TYPE_COLORS = ['#22c55e', '#8b5cf6']
const PAYMENT_COLORS = ['#22c55e', '#f59e0b', '#0ea5e9', '#f43f5e']

function detectPreset(range) {
  if (!range?.from || !range?.to) return '30d'
  for (const p of ['today', '7d', '30d', '3m', 'year']) {
    const r = rangeForPreset(p)
    if (r.from === range.from && r.to === range.to) return p
  }
  return 'custom'
}

function formatHourLabel(hour) {
  const h = String(hour).padStart(2, '0')
  return `${h}:00`
}

export default function TerrainAnalytics() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA'
  const [range, setRange] = useState(rangeForPreset('30d'))

  const preset = useMemo(() => detectPreset(range), [range])
  const isHourly = preset === 'today'

  const { data, loading, errorState, refetch } = useApi(
    () => api.get('/owner/analytics/details', {
      params: { from: range.from, to: range.to, group_by: isHourly ? 'hour' : 'day' },
    }).then((r) => r.data),
    [range.from, range.to, isHourly],
  )

  const summary = data?.summary || {}
  const series = data?.series || []

  const fmtKey = (key) => {
    if (!key) return ''
    try {
      if (isHourly) {
        return formatHourLabel(Number(key))
      }
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${key}T00:00:00`))
    } catch {
      return key
    }
  }

  const chartSeries = series.map((r) => ({ label: fmtKey(r.key), revenue: r.revenue ?? 0, bookings: r.bookings ?? 0 }))

  const peakHourData = (data?.peak_hours || []).map((count, hour) => ({ name: `${hour}:00`, value: count }))
  const popularDayData = (data?.popular_days || []).map((count, day) => ({
    name: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(Date.UTC(2026, 0, 4 + day))),
    value: count,
  }))
  const statusData = Object.entries(data?.by_status || {})
    .map(([status, value]) => ({ name: t(`status.${status}`), value }))
    .filter((d) => d.value > 0)

  const typeData = Object.entries(data?.by_type || {})
    .filter(([, v]) => v.revenue > 0 || v.bookings > 0)
    .map(([type, v], i) => ({
      name: t(`terrain.analytics.type.${type}`),
      value: Math.round(v.revenue),
      color: TYPE_COLORS[i % TYPE_COLORS.length],
    }))

  const paymentData = Object.entries(data?.by_payment_status || {})
    .filter(([, v]) => v > 0)
    .map(([status, value], i) => ({
      name: t(`terrain.analytics.payment.${status}`),
      value: Math.round(value),
      color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
    }))

  const formatMoney = (value) => `${Number(value || 0).toLocaleString(locale)} ${t('terrain.overview.stats.currency')}`

  const statCards = [
    { icon: Wallet, label: t('terrain.analytics.stat.revenue'), value: formatMoney(summary.revenue), accent: 'green' },
    { icon: CreditCard, label: t('terrain.analytics.stat.confirmedRevenue'), value: formatMoney(summary.confirmed_revenue), accent: 'sky' },
    { icon: XCircle, label: t('terrain.analytics.stat.refunded'), value: formatMoney(summary.refunded_amount), accent: 'rose' },
    { icon: Ticket, label: t('terrain.analytics.stat.bookings'), value: summary.bookings ?? 0, accent: 'sky' },
    { icon: Banknote, label: t('terrain.analytics.stat.avgBooking'), value: formatMoney(summary.avg_booking_value), accent: 'amber' },
    { icon: Percent, label: t('terrain.analytics.stat.occupancy'), value: `${summary.occupancy ?? 0}%`, accent: 'violet' },
    { icon: Clock3, label: t('terrain.analytics.stat.availableSlots'), value: summary.available_slots ?? 0, accent: 'green' },
    { icon: CalendarX2, label: t('terrain.analytics.stat.cancellations'), value: summary.cancellations ?? 0, accent: 'rose' },
    { icon: CheckCircle2, label: t('terrain.analytics.stat.completed'), value: summary.completed ?? 0, accent: 'green' },
    { icon: Hourglass, label: t('terrain.analytics.stat.pending'), value: summary.pending ?? 0, accent: 'amber' },
    { icon: Repeat, label: t('terrain.analytics.stat.subscriptions'), value: summary.subscriptions ?? 0, accent: 'orange' },
    { icon: CalendarCheck, label: t('terrain.analytics.stat.approved'), value: summary.approved ?? 0, accent: 'sky' },
  ]

  return (
    <div>
      <SectionTitle
        title={t('terrain.analytics.title')}
        subtitle={t('terrain.analytics.subtitle')}
        action={<RangeFilter value={range} onChange={setRange} />}
      />

      {errorState && <SectionError state={errorState} onRetry={refetch} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[26px]" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((s) => (
            <Stat key={s.label} icon={s.icon} label={s.label} value={s.value} accent={s.accent} />
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card
            title={isHourly ? t('terrain.analytics.trend.titleHourly') : t('terrain.analytics.trend.title')}
            subtitle={t('terrain.analytics.trend.subtitle')}
            className="lg:col-span-2"
          >
            {chartSeries.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('terrain.analytics.empty')}</p>
            ) : (
              <AreaTrend
                data={chartSeries}
                xKey="label"
                series={[
                  { dataKey: 'revenue', name: t('terrain.analytics.trend.revenue'), color: '#22c55e' },
                  { dataKey: 'bookings', name: t('terrain.analytics.trend.bookings'), color: '#0ea5e9', fillOpacity: 0.06 },
                ]}
                height={isHourly ? 260 : 220}
              />
            )}
          </Card>

          <Card title={t('terrain.analytics.peakHours')}>
            {peakHourData.every((d) => d.value === 0) ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('terrain.analytics.empty')}</p>
            ) : (
              <Bars data={peakHourData} xKey="name" bars={[{ dataKey: 'value', name: t('terrain.analytics.stat.bookings'), color: '#8b5cf6' }]} />
            )}
          </Card>

          <Card title={t('terrain.analytics.popularDays')}>
            {popularDayData.every((d) => d.value === 0) ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('terrain.analytics.empty')}</p>
            ) : (
              <Bars data={popularDayData} xKey="name" bars={[{ dataKey: 'value', name: t('terrain.analytics.stat.bookings'), color: '#0ea5e9' }]} />
            )}
          </Card>

          <Card title={t('terrain.analytics.byStatus')}>
            {statusData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('terrain.analytics.empty')}</p>
            ) : (
              <Donut data={statusData.map((d, i) => ({ ...d, color: ['#22c55e', '#0ea5e9', '#8b5cf6', '#f43f5e', '#f59e0b', '#94a3b8'][i % 6] }))} height={220} />
            )}
          </Card>

          <Card title={t('terrain.analytics.byPaymentStatus')}>
            {paymentData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('terrain.analytics.empty')}</p>
            ) : (
              <Donut data={paymentData} height={220} />
            )}
          </Card>

          {typeData.length > 0 && (
            <Card title={t('terrain.analytics.byType')}>
              <Donut
                data={typeData}
                height={220}
                centerLabel={t('terrain.analytics.stat.bookings')}
                centerValue={summary.bookings ?? 0}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
