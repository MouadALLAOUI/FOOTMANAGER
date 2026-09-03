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

function safeT(key, opts) {
  const val = i18n.t(key, { ...opts, defaultValue: undefined })
  if (val === key || val === undefined) {
    return key.split('.').pop()
  }
  return val
}

const t = safeT

function currentLang() {
  return (i18n.resolvedLanguage || i18n.language || 'ar').startsWith('en') ? 'en' : 'ar'
}

const isAr = () => currentLang() === 'ar'
const locale = () => (isAr() ? 'ar-MA' : 'en-GB')

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function fmtDateTime(value) {
  const date = parseDate(value)
  if (!date) return ''
  const datePart = new Intl.DateTimeFormat(locale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
  const timePart = date.toLocaleTimeString(locale(), {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart} \u2014 ${timePart}`
}

function eventTypeKey(type, punishment) {
  if (type === 'foul') {
    return punishment === 'yellow' ? 'yellow'
      : punishment === 'second_yellow' ? 'secondYellow'
        : punishment === 'red' ? 'red'
          : punishment === 'penalty' ? 'penalty'
            : 'foul'
  }
  switch (type) {
    case 'goal': return 'goal'
    case 'own_goal': return 'ownGoal'
    case 'penalty_goal': return 'penalty'
    case 'missed_penalty': return 'missedPenalty'
    case 'assist': return 'assist'
    case 'yellow_card':
    case 'second_yellow': return 'yellow'
    case 'red_card': return 'red'
    case 'substitution': return 'substitution'
    case 'injury': return 'injury'
    case 'timeout': return 'timeout'
    case 'foul': return 'foul'
    case 'half_time': return 'halfTime'
    case 'second_half': return 'secondHalf'
    case 'kickoff': return 'kickoff'
    case 'match_end': return 'matchEnd'
    case 'var': return 'var'
    default: return 'other'
  }
}

function eventLabel(type, punishment) {
  const key = eventTypeKey(type, punishment)
  const exportKey = `committee.export.event.${key}`
  const ownKey = `public.matchDetail.type.${key}`
  const fromExport = i18n.exists(exportKey) ? i18n.t(exportKey) : null
  return fromExport || i18n.t(ownKey, { defaultValue: type })
}

function halfLabel(period) {
  if (!period) return ''
  if (period === 'first_half') return isAr() ? '1ش' : '1H'
  if (period === 'second_half') return isAr() ? '2ش' : '2H'
  if (period === 'extra_time') return isAr() ? 'إضافي' : 'ET'
  if (period === 'penalties') return isAr() ? 'ترجيح' : 'Pen'
  return ''
}

function eventTextPdf(e) {
  if (e.type === 'foul') {
    const name = e.description || [e.player_name, e.team_name].filter(Boolean).join(' • ')
    const label = eventLabel(e.type, e.punishment)
    return name ? `${name} — ${label}` : label
  }
  return eventText(e) || eventLabel(e.type, e.punishment)
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

const MATCH_STATUS_KEYS = {
  finished: 'public.tournamentPage.matchStatus.finished',
  live: 'public.tournamentPage.matchStatus.live',
  scheduled: 'public.tournamentPage.matchStatus.scheduled',
  postponed: 'public.tournamentPage.matchStatus.postponed',
  cancelled: 'public.tournamentPage.matchStatus.cancelled',
}

const STATUS_COLORS = {
  finished: { bg: '#dcfce7', fg: '#16a34a' },
  live: { bg: '#fee2e2', fg: '#e11d48' },
  scheduled: { bg: '#e0f2fe', fg: '#0284c7' },
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
  statusChip: {
    fontSize: 7,
    fontWeight: 700,
    borderRadius: 99,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 4,
  },
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
    borderBottomColor: C.green,
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
  eventMinute: { fontSize: 7, fontWeight: 800, color: C.green, marginLeft: 4, minWidth: 28 },
  eventHalf: { fontSize: 6, fontWeight: 700, color: C.muted, marginLeft: 2, minWidth: 18 },
  eventType: { fontSize: 6.8, fontWeight: 700, color: C.subtle, marginLeft: 4 },
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
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: 20,
    paddingTop: 6,
    borderTopWidth: 1.5,
    borderTopColor: C.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 7,
    color: C.muted,
  },
  footerApp: { fontWeight: 700, color: C.green },
  pageContent: {
    paddingBottom: 40,
  },
})

function TeamAvatarPdf({ team, images }) {
  const url = logoThumb(team)
  if (url && images?.has(url)) return <Image src={url} style={styles.teamLogo} />
  return (
    <View style={styles.teamLogoFallback}>
      <Text style={styles.teamLogoChar}>{(team?.name || '\u0643').charAt(0)}</Text>
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
        <Text style={styles.metaValue}>{value || '\u2014'}</Text>
      </View>
    </View>
  )
}

function EventRowPdf({ event, images, homeTeam, awayTeam }) {
  const side = sideOf(event, homeTeam?.id, awayTeam?.id)
  const anchor = side === 'home' ? homeTeam : side === 'away' ? awayTeam : null
  return (
    <View style={styles.event} wrap={false}>
      <Text style={styles.eventMinute}>{minuteText(event)}</Text>
      <Text style={styles.eventHalf}>{halfLabel(event.period)}</Text>
      <Text style={styles.eventType}>{eventLabel(event.type, event.punishment)}</Text>
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

export default function MatchPdfDocument({ match, images, appName }) {
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
  const status = m.is_finished ? 'finished' : m.is_live ? 'live' : 'scheduled'
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.scheduled
  const statusText = i18n.t(MATCH_STATUS_KEYS[status], { defaultValue: status })
  const now = new Intl.DateTimeFormat(locale(), {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContent}>
        <View style={styles.header}>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>
              {m.home_team?.name || '\u2014'} - {m.away_team?.name || '\u2014'}
            </Text>
            <Text style={styles.headerSub}>
              {fmtDateTime(m.scheduled_at)}
              {m.stadium?.name ? ` \u2022 ${m.stadium.name}` : ''}
              {stageName ? ` \u2022 ${stageName}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.teamBox}>
            <TeamAvatarPdf team={m.home_team} images={images} />
            <Text style={styles.teamName}>{m.home_team?.name || '\u2014'}</Text>
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
            <View style={[styles.statusChip, { backgroundColor: statusColor.bg }]}>
              <Text style={{ fontSize: 7, fontWeight: 700, color: statusColor.fg }}>
                {statusText}
              </Text>
            </View>
          </View>
          <View style={styles.teamBox}>
            <TeamAvatarPdf team={m.away_team} images={images} />
            <Text style={styles.teamName}>{m.away_team?.name || '\u2014'}</Text>
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

        <EventsBlock title={m.home_team?.name || '\u2014'} events={homeEvents} images={images} homeTeam={m.home_team} awayTeam={m.away_team} />
        <EventsBlock title={m.away_team?.name || '\u2014'} events={awayEvents} images={images} homeTeam={m.home_team} awayTeam={m.away_team} />
        {neutralEvents.length > 0 && (
          <EventsBlock title={i18n.t('public.matchDetail.type.other', { defaultValue: 'Other' })} events={neutralEvents} images={images} homeTeam={m.home_team} awayTeam={m.away_team} />
        )}

        {(m.player_penalties?.length > 0 || m.penalty_awards?.length > 0) && (
          <View wrap={false}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('public.matchDetail.penalties')}</Text>
            </View>
            {(m.penalty_awards || []).map((a) => (
              <View key={a.id} style={styles.event}>
                <Text style={styles.eventMinute}>{minuteText({ minute: a.minute })}</Text>
                <Text style={styles.eventType}>{t('public.matchDetail.penaltyAwardShort')}</Text>
                <Text style={styles.eventText}>{a.team_name || '\u2014'} \u2022 {t(`public.matchDetail.penaltyOutcome.${a.status}`)}</Text>
              </View>
            ))}
            {(m.player_penalties || []).map((p) => (
              <View key={p.id} style={styles.event}>
                <Text style={styles.eventMinute}>{minuteText({ minute: p.start_minute })}</Text>
                <Text style={styles.eventType}>{t('public.matchDetail.playerPenaltyShort')}</Text>
                <Text style={styles.eventText}>{p.player?.name || '\u2014'} #{p.player?.number || '\u2014'}</Text>
              </View>
            ))}
          </View>
        )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerApp}>{appName || t('common.appName')}</Text>
          <Text>
            {t('committee.export.generatedOn')}: {now}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
