import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, CalendarCheck, CalendarX2, CheckCircle2, Clock3, Hourglass, Percent, Repeat, Ticket, Wallet } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Card, SectionTitle, Skeleton, Stat } from '../../../components/dashboard/ui'
import { AreaTrend, Bars, Donut } from '../../../components/dashboard/charts'
import RangeFilter, { rangeForPreset } from '../../../components/analytics/RangeFilter'

export default function TerrainAnalytics() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA'
  const [range, setRange] = useState(rangeForPreset('30d'))

  const { data, loading } = useApi(
    () => api.get('/owner/analytics/details', { params: { from: range.from, to: range.to } }).then((r) => r.data),
    [range.from, range.to],
  )

  const summary = data?.summary || {}
  const series = data?.series || []

  const fmtKey = (key) => {
    if (!key) return ''
    try {
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

  const formatMoney = (value) => `${Number(value || 0).toLocaleString(locale)} ${t('terrain.overview.stats.currency')}`

  const statCards = [
    { icon: Wallet, label: t('terrain.analytics.stat.revenue'), value: formatMoney(summary.revenue), accent: 'green' },
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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[26px]" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((s) => (
            <Stat key={s.label} icon={s.icon} label={s.label} value={s.value} accent={s.accent} />
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card title={t('terrain.analytics.trend.title')} subtitle={t('terrain.analytics.trend.subtitle')} className="lg:col-span-2">
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
        </div>
      )}
    </div>
  )
}
