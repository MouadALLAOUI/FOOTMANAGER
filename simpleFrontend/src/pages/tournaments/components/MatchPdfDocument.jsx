import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import i18n from '../../../i18n'
import { logoThumb } from '../../../lib/thumb'
import { sortMatchEvents, minuteText, sideOf, eventText } from '../matchEvents'

import w400 from '../../../fonts/static/NotoKufiArabic-400.ttf'
import w600 from '../../../fonts/static/NotoKufiArabic-600.ttf'
import w700 from '../../../fonts/static/NotoKufiArabic-700.ttf'
import w800 from '../../../fonts/static/NotoKufiArabic-800.ttf'

Font.register({
  family: 'NotoKufiArabic',
  fonts: [
    { src: w400, fontWeight: 400 },
    { src: w600, fontWeight: 600 },
    { src: w700, fontWeight: 700 },
    { src: w800, fontWeight: 800 },
  ],
})

const t = (key, opts) => i18n.t(key, opts)

function currentLang() {
  return (i18n.resolvedLanguage || i18n.language || 'ar').startsWith('en') ? 'en' : 'ar'
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function fmtDateTime(value) {
  const date = parseDate(value)
  if (!date) return ''
  const lang = currentLang()
  const datePart = new Intl.DateTimeFormat(lang.startsWith('ar') ? 'ar-MA' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
  const timePart = date.toLocaleTimeString(lang.startsWith('ar') ? 'ar-MA' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart} — ${timePart}`
}

function eventTypeKey(type) {
  switch (type) {
    case 'goal':
      return 'goal'
    case 'own_goal':
      return 'ownGoal'
    case 'penalty_goal':
      return 'penalty'
    case 'missed_penalty':
      return 'missedPenalty'
    case 'assist':
      return 'assist'
    case 'yellow_card':
    case 'second_yellow':
      return 'yellow'
    case 'red_card':
      return 'red'
    case 'substitution':
      return 'substitution'
    case 'injury':
      return 'injury'
    case 'timeout':
      return 'timeout'
    case 'half_time':
      return 'halfTime'
    case 'second_half':
      return 'secondHalf'
    case 'kickoff':
      return 'kickoff'
    case 'match_end':
      return 'matchEnd'
    case 'var':
      return 'var'
    default:
      return 'other'
  }
}

function eventLabel(type) {
  const key = eventTypeKey(type)
  const exportKey = `committee.export.event.${key}`
  const ownKey = `public.matchDetail.type.${key}`
  const fromExport = i18n.exists(exportKey) ? i18n.t(exportKey) : null
  return fromExport || i18n.t(ownKey, { defaultValue: type })
}

function eventTextPdf(e) {
  return eventText(e) || eventLabel(e.type)
}

const C = {
  green: '#16a34a',
  greenLight: '#dcfce7',
  ink: '#0f172a',
  text: '#111827',
  muted: '#64748b',
  subtle: '#475569',
  line: '#e2e8f0',
  chipBg: '#f8fafc',
  amber: '#d97706',
  rose: '#e11d48',
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingTop: 26,
    fontFamily: 'NotoKufiArabic',
    fontSize: 9,
    color: C.text,
    textAlign: 'right',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: C.green,
    paddingBottom: 12,
    marginBottom: 12,
  },
  headerTitleBox: { flex: 1, paddingRight: 12 },
  headerTitle: { fontSize: 16, fontWeight: 800, color: C.ink, textAlign: 'right' },
  headerSub: { fontSize: 8.5, color: C.muted, marginTop: 2 },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  teamBox: { flex: 1, alignItems: 'center' },
  teamLogo: { width: 34, height: 34, borderRadius: 17 },
  teamLogoFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoChar: { fontSize: 13, fontWeight: 800, color: C.green },
  teamName: { fontSize: 8.5, fontWeight: 700, marginTop: 4, textAlign: 'center' },
  scoreBox: { width: 130, alignItems: 'center' },
  score: { fontSize: 22, fontWeight: 800, color: C.ink },
  penalties: { fontSize: 8.5, fontWeight: 700, color: C.muted, marginTop: 1 },
  statusChip: { fontSize: 7, fontWeight: 700, borderRadius: 99, paddingVertical: 2, paddingHorizontal: 8, marginTop: 4 },
  winnerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 5 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, marginBottom: 5 },
  metaItem: { width: '50%', paddingHorizontal: 3, marginBottom: 5 },
  metaBox: { backgroundColor: C.chipBg, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 8 },
  metaLabel: { fontSize: 6.5, fontWeight: 700, color: C.muted },
  metaValue: { fontSize: 8.5, fontWeight: 600, color: C.text, marginTop: 1 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: C.line,
    paddingBottom: 4,
    marginBottom: 7,
    marginTop: 10,
  },
  sectionTitle: { fontSize: 11, fontWeight: 800, color: C.ink },

  teamSection: { marginTop: 8 },
  teamHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  teamInvLogo: { width: 12, height: 12, borderRadius: 6, marginLeft: 4 },
  teamHeadName: { fontSize: 9.5, fontWeight: 800, color: C.green },
  teamHeadCount: { fontSize: 7.5, color: C.muted, marginLeft: 6 },

  event: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.line,
    borderRadius: 4,
    backgroundColor: C.chipBg,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    marginBottom: 3,
  },
  eventMinute: { fontSize: 7, fontWeight: 800, color: C.green, marginLeft: 4 },
  eventType: { fontSize: 6.8, fontWeight: 700, color: C.muted, marginLeft: 4 },
  eventText: { fontSize: 7.8, fontWeight: 600 },

  empty: {
    backgroundColor: C.chipBg,
    borderRadius: 6,
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 8.5,
    paddingVertical: 8,
    marginTop: 2,
  },

  footer: {
    marginTop: 18,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: C.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: C.muted,
  },
})

function TeamAvatarPdf({ team, images }) {
  const url = logoThumb(team)
  if (url && images?.has(url)) return <Image src={url} style={styles.teamLogo} />
  return (
    <View style={styles.teamLogoFallback}>
      <Text style={styles.teamLogoChar}>{(team?.name || '؟').charAt(0)}</Text>
    </View>
  )
}

function SmallLogo({ team, images }) {
  const url = logoThumb(team)
  if (!url || !images?.has(url)) return null
  return <Image src={url} style={styles.teamInvLogo} />
}

function MetaItem({ label, value }) {
  return (
    <View style={styles.metaItem}>
      <View style={styles.metaBox}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value || '—'}</Text>
      </View>
    </View>
  )
}

function EventRowPdf({ event, images, homeTeam, awayTeam }) {
  const side = sideOf(event, homeTeam?.id, awayTeam?.id)
  const anchor = side === 'home' ? homeTeam : side === 'away' ? awayTeam : null
  return (
    <View style={styles.event}>
      <Text style={styles.eventMinute}>{minuteText(event)}</Text>
      <Text style={styles.eventType}>{eventLabel(event.type)}</Text>
      <Text style={styles.eventText}>{eventTextPdf(event)}</Text>
      {anchor && <SmallLogo team={anchor} images={images} />}
    </View>
  )
}

function EventsBlock({ title, events, images, homeTeam, awayTeam }) {
  if (!events || events.length === 0) return null
  return (
    <View style={styles.teamSection} wrap={false}>
      <View style={styles.teamHead}>
        <Text style={styles.teamHeadName}>{title}</Text>
        <Text style={styles.teamHeadCount}>{t('public.matchDetail.events')}</Text>
      </View>
      {events.map((e, i) => (
        <EventRowPdf key={e.id ?? i} event={e} images={images} homeTeam={homeTeam} awayTeam={awayTeam} />
      ))}
    </View>
  )
}

export default function MatchPdfDocument({ match, images }) {
  const m = match || {}
  const lang = currentLang()
  const homeId = m.home_team?.id
  const awayId = m.away_team?.id
  const events = sortMatchEvents(m.events || [])
  const homeEvents = events.filter((e) => sideOf(e, homeId, awayId) === 'home')
  const awayEvents = events.filter((e) => sideOf(e, homeId, awayId) === 'away')
  const neutralEvents = events.filter((e) => sideOf(e, homeId, awayId) === 'neutral')
  const hasPenalties = m.is_finished && m.home_penalties != null && m.away_penalties != null
  const winnerText = m.winner_team_id
    ? m.winner_team_id === homeId
      ? m.home_team?.name
      : m.winner_team_id === awayId
        ? m.away_team?.name
        : ''
    : ''
  const stageName = m.round?.name || m.group?.name
  const now = new Intl.DateTimeFormat(lang.startsWith('ar') ? 'ar-MA' : 'en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>
              {m.home_team?.name || '—'} - {m.away_team?.name || '—'}
            </Text>
            <Text style={styles.headerSub}>
              {fmtDateTime(m.scheduled_at)}
              {m.stadium?.name ? ` • ${m.stadium.name}` : ''}
              {stageName ? ` • ${stageName}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.teamBox}>
            <TeamAvatarPdf team={m.home_team} images={images} />
            <Text style={styles.teamName}>{m.home_team?.name || '—'}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.score}>
              {m.is_finished || m.is_live ? `${m.home_score ?? 0} - ${m.away_score ?? 0}` : 'VS'}
            </Text>
            {hasPenalties && (
              <Text style={styles.penalties}>
                ({m.home_penalties} - {m.away_penalties})
              </Text>
            )}
            <Text style={[styles.statusChip, { backgroundColor: m.is_finished ? C.greenLight : C.chipBg, color: m.is_finished ? C.green : C.muted }]}>
              {m.is_finished
                ? i18n.t('public.tournamentPage.matchStatus.finished', { defaultValue: 'Finished' })
                : i18n.t('public.tournamentPage.matchStatus.scheduled', { defaultValue: 'Scheduled' })}
            </Text>
          </View>
          <View style={styles.teamBox}>
            <TeamAvatarPdf team={m.away_team} images={images} />
            <Text style={styles.teamName}>{m.away_team?.name || '—'}</Text>
          </View>
        </View>

        {winnerText && (
          <View style={styles.winnerRow}>
            <Text style={{ fontSize: 8, fontWeight: 700, color: C.text }}>
              {t('public.matchDetail.winner')}:{' '}
              <Text style={{ color: C.green, fontWeight: 800 }}>{winnerText}</Text>
            </Text>
          </View>
        )}

        <View style={styles.metaRow}>
          {m.scheduled_at && <MetaItem label={i18n.t('public.matchDetail.date', { defaultValue: 'Date' })} value={fmtDateTime(m.scheduled_at)} />}
          {m.stadium?.name && <MetaItem label={i18n.t('public.matchDetail.stadium', { defaultValue: 'Stadium' })} value={m.stadium.name} />}
          {stageName && <MetaItem label={i18n.t('public.matchDetail.stage', { defaultValue: 'Stage' })} value={stageName} />}
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('public.matchDetail.events')}</Text>
        </View>

        {events.length === 0 && (
          <Text style={styles.empty}>{t('public.matchDetail.noEvents')}</Text>
        )}

        <EventsBlock title={m.home_team?.name || '—'} events={homeEvents} images={images} homeTeam={m.home_team} awayTeam={m.away_team} />
        <EventsBlock title={m.away_team?.name || '—'} events={awayEvents} images={images} homeTeam={m.home_team} awayTeam={m.away_team} />
        <EventsBlock title={i18n.t('public.matchDetail.type.other', { defaultValue: 'Other' })} events={neutralEvents} images={images} homeTeam={m.home_team} awayTeam={m.away_team} />

        <View style={styles.footer}>
          <Text>Aji Nkassrou</Text>
          <Text>
            {t('committee.export.generatedOn')}: {now}
          </Text>
        </View>
      </Page>
    </Document>
  )
}