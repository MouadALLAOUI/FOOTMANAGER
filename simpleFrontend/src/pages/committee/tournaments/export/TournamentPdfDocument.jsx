import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import i18n from '../../../../i18n'
import { logoThumb, coverThumb } from '../../../../lib/thumb'
import { LIVE_STATUSES } from '../../../../data/fixtures'
import { statusLabels } from '../../../../components/dashboard/ui'

import w400 from '../../../../fonts/static/NotoKufiArabic-400.ttf'
import w600 from '../../../../fonts/static/NotoKufiArabic-600.ttf'
import w700 from '../../../../fonts/static/NotoKufiArabic-700.ttf'
import w800 from '../../../../fonts/static/NotoKufiArabic-800.ttf'

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
    const fb = key.split('.').pop()
    if (opts?.n != null) return `${fb} ${opts.n}`
    return fb
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
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function fmtDate(value) {
  const date = parseDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(locale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
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

function fixtureStatus(f) {
  const m = f.match
  if (f.status === 'cancelled' || m?.status === 'cancelled') return 'cancelled'
  if (f.status === 'postponed' || m?.status === 'postponed') return 'postponed'
  if (m?.status === 'finished') return 'finished'
  if (m && LIVE_STATUSES.has(m.status)) return 'live'
  return 'scheduled'
}

const MATCH_STATUS_KEYS = {
  finished: 'public.tournamentPage.matchStatus.finished',
  live: 'public.tournamentPage.matchStatus.live',
  scheduled: 'public.tournamentPage.matchStatus.scheduled',
  postponed: 'public.tournamentPage.matchStatus.postponed',
  cancelled: 'public.tournamentPage.matchStatus.cancelled',
}

function matchStatusText(status) {
  const key = MATCH_STATUS_KEYS[status]
  return key ? t(key) : status
}

const STATUS_COLORS = {
  finished: { bg: '#dcfce7', fg: '#16a34a' },
  live: { bg: '#fee2e2', fg: '#e11d48' },
  scheduled: { bg: '#e0f2fe', fg: '#0284c7' },
  postponed: { bg: '#ffedd5', fg: '#ea580c' },
  cancelled: { bg: '#f1f5f9', fg: '#64748b' },
}

function matchWinner(f) {
  const m = f.match
  if (!m) return ''
  let winnerId = m.winner_team_id
  if (!winnerId && m.home_penalties != null && m.away_penalties != null && m.home_penalties !== m.away_penalties) {
    winnerId = m.home_penalties > m.away_penalties ? f.home_team?.id : f.away_team?.id
  }
  if (!winnerId && m.home_score != null && m.away_score != null && m.home_score !== m.away_score) {
    winnerId = m.home_score > m.away_score ? f.home_team?.id : f.away_team?.id
  }
  if (!winnerId) return ''
  if (winnerId === f.home_team?.id) return f.home_team?.name || ''
  if (winnerId === f.away_team?.id) return f.away_team?.name || ''
  return ''
}

function scoreLine(f) {
  const m = f.match
  if (!m || m.home_score == null || m.away_score == null) return 'vs'
  let line = `${m.home_score} - ${m.away_score}`
  if (m.home_penalties != null && m.away_penalties != null) {
    line += ` (${m.home_penalties} - ${m.away_penalties})`
  }
  return line
}

function eventTypeKey(type, punishment) {
  if (type === 'foul') {
    return punishment === 'yellow' ? 'yellow'
      : punishment === 'second_yellow' ? 'secondYellow'
        : punishment === 'red' ? 'red'
          : punishment === 'penalty' ? 'penalty'
            : null
  }
  if (type === 'own_goal') return 'ownGoal'
  if (type === 'yellow_card' || type === 'second_yellow') return 'yellow'
  if (type === 'red_card') return 'red'
  if (type === 'assist') return 'assist'
  if (type === 'goal' || type === 'penalty_goal') return 'goal'
  return null
}

function halfLabel(period) {
  if (!period) return ''
  if (period === 'first_half') return isAr() ? 'الشوط الأول' : '1H'
  if (period === 'second_half') return isAr() ? 'الشوط الثاني' : '2H'
  if (period === 'extra_time') return isAr() ? 'وقت إضافي' : 'ET'
  if (period === 'penalties') return isAr() ? 'ترجيح' : 'Pen'
  return ''
}

function img(images, url) {
  return url && images?.has(url) ? url : null
}

const C = {
  green: '#16a34a',
  greenLight: '#dcfce7',
  ink: '#0f172a',
  text: '#111827',
  muted: '#64748b',
  subtle: '#475569',
  line: '#e2e8f0',
  cellLine: '#eef2f7',
  headBg: '#f1f5f9',
  chipBg: '#f8fafc',
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    paddingTop: 28,
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
    marginBottom: 14,
  },
  headerLogoBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerTitle: { flex: 1, paddingRight: 14 },
  headerH1: { fontSize: 17, fontWeight: 800, color: C.ink },
  headerSub: { fontSize: 8.5, color: C.muted, marginTop: 1 },
  headerSub2: { fontSize: 8.5, color: C.muted, marginTop: 1 },

  section: { marginBottom: 14, marginTop: 4 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: C.green,
    paddingBottom: 5,
    marginBottom: 8,
  },
  sectionIconBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sectionIcon: {
    fontSize: 10,
    fontWeight: 800,
    color: C.green,
  },
  sectionTitle: { fontSize: 12, fontWeight: 800, color: C.ink },
  subTitle: { fontSize: 10, fontWeight: 700, color: C.green, marginTop: 8, marginBottom: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  infoItem: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  infoBox: {
    backgroundColor: C.chipBg,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  infoLabel: { fontSize: 6.5, fontWeight: 700, color: C.muted },
  infoValue: { fontSize: 9, fontWeight: 600, color: C.text, marginTop: 1 },

  rulesLabel: { fontSize: 7.5, fontWeight: 700, color: C.muted, marginTop: 6 },
  rulesText: {
    marginTop: 2,
    backgroundColor: C.chipBg,
    borderRadius: 6,
    padding: 8,
    fontSize: 8.5,
    whiteSpace: 'pre-wrap',
  },

  table: { marginTop: 2 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.cellLine, alignItems: 'stretch' },
  th: {
    backgroundColor: C.headBg,
    fontWeight: 700,
    fontSize: 6.8,
    color: '#334155',
    paddingVertical: 4,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  thCenter: { textAlign: 'center' },
  td: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 4 },
  tdCenter: { textAlign: 'center' },
  rowTeam: { fontSize: 7.5, fontWeight: 600 },
  teamLogo: { width: 10, height: 10, borderRadius: 3, marginLeft: 4 },

  teamCell: { flexDirection: 'row', alignItems: 'center' },

  statusChip: {
    fontSize: 6,
    fontWeight: 700,
    borderRadius: 10,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    textAlign: 'center',
    overflow: 'hidden',
  },

  empty: {
    backgroundColor: C.chipBg,
    borderRadius: 6,
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 8.5,
    paddingVertical: 8,
    marginTop: 4,
  },

  result: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  resultHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  resultRound: { fontSize: 7.5, fontWeight: 700, color: C.green },
  resultDate: { fontSize: 7.5, color: C.muted },
  resultScore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 2 },
  resultTeam: { flex: 1, fontSize: 9, fontWeight: 800 },
  resultNum: { fontSize: 10, fontWeight: 800, paddingHorizontal: 8, paddingVertical: 1, backgroundColor: C.headBg, borderRadius: 4 },
  resultMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3, fontSize: 7.5, color: C.subtle },

  eventRow: {
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
  eventHalf: { fontSize: 6, fontWeight: 700, color: C.muted, marginLeft: 2, minWidth: 20 },
  eventType: { fontSize: 6.8, fontWeight: 700, color: C.subtle, marginLeft: 4 },
  eventText: { fontSize: 7.8, fontWeight: 600, marginLeft: 3 },
  eventTeamLogo: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },

  eventsSection: { marginTop: 6, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 4 },
  eventsLabel: { fontSize: 7, fontWeight: 700, color: C.muted, marginBottom: 3 },
  eventTeamHeader: { fontSize: 8, fontWeight: 800, color: C.green, marginTop: 4, marginBottom: 2 },

  newsItem: { flexDirection: 'row', borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 7, marginBottom: 6 },
  newsImg: { width: 54, height: 40, borderRadius: 5, marginLeft: 8 },
  newsBody: { flex: 1 },
  newsTitle: { fontSize: 9, fontWeight: 800, color: C.ink },
  newsDate: { fontSize: 7, color: C.muted, marginTop: 1 },
  newsContent: { fontSize: 7.5, color: C.subtle, marginTop: 3 },

  galleryRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  galleryItem: { width: '33.33%', paddingHorizontal: 4, marginBottom: 6 },
  galleryImg: { width: '100%', height: 58, borderRadius: 6, borderWidth: 1, borderColor: C.line },
  galleryCaption: { textAlign: 'center', color: C.subtle, fontSize: 6.8, marginTop: 2 },

  partnersRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  partner: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  partnerBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 7 },
  partnerLogo: { width: 26, height: 26, borderRadius: 5, marginLeft: 7, objectFit: 'contain', borderWidth: 0.5, borderColor: '#eef2f7', backgroundColor: '#f8fafc' },
  partnerBody: { flex: 1 },
  partnerName: { fontSize: 8.5, fontWeight: 700 },
  partnerLevel: { fontSize: 7, color: C.green, fontWeight: 600, marginTop: 1 },
  partnerLink: { fontSize: 7, color: C.muted, marginTop: 1 },

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

function InfoItem({ label, value }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>{t(label)}</Text>
        <Text style={styles.infoValue}>{value || '\u2014'}</Text>
      </View>
    </View>
  )
}

function Section({ icon, title, children, style }) {
  return (
    <View style={[styles.section, style]} wrap={false}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIconBox}>
          <Text style={styles.sectionIcon}>{icon}</Text>
        </View>
        <Text style={styles.sectionTitle}>{t(title)}</Text>
      </View>
      {children}
    </View>
  )
}

function SubTitle({ children }) {
  return <Text style={styles.subTitle}>{children}</Text>
}

function Empty({ label }) {
  return <Text style={styles.empty}>{t(label)}</Text>
}

function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.scheduled
  return (
    <View
      style={[
        styles.statusChip,
        { backgroundColor: colors.bg, color: colors.fg },
      ]}
    >
      <Text style={{ fontSize: 6, fontWeight: 700, color: colors.fg }}>
        {matchStatusText(status)}
      </Text>
    </View>
  )
}

function DetailsSection({ tournament }) {
  const start = fmtDate(tournament.start_date)
  const end = fmtDate(tournament.end_date)
  const statusKey = statusLabels[tournament.status] ? t(statusLabels[tournament.status]) : tournament.status
  return (
    <Section icon={'\u2022'} title="committee.export.section.details">
      <View style={styles.grid}>
        <InfoItem label="committee.export.organizer" value={tournament.organizer?.name} />
        <InfoItem label="committee.export.location" value={tournament.location} />
        <InfoItem label="committee.export.dates" value={start && end ? `${start} ${t('committee.export.to')} ${end}` : start || end} />
        <InfoItem label="committee.export.format" value={t(`committee.tournaments.formats.${tournament.tournament_format}`)} />
        <InfoItem label="committee.export.status" value={statusKey} />
        <InfoItem
          label="committee.export.registrationPeriod"
          value={`${fmtDateTime(tournament.registration_start_at)} ${t('committee.export.to')} ${fmtDateTime(tournament.registration_end_at)}`.trim()}
        />
        <InfoItem
          label="committee.export.registrationFee"
          value={tournament.requires_registration_fee ? `${tournament.registration_fee} DH` : t('committee.detail.feeFree')}
        />
        <InfoItem label="committee.export.capacity" value={tournament.teams_count || '\u2014'} />
        <InfoItem
          label="committee.export.points"
          value={`${tournament.points_for_win} / ${tournament.points_for_draw} / ${tournament.points_for_loss}`}
        />
      </View>
      <Text style={styles.rulesLabel}>{t('committee.export.rules')}</Text>
      <Text style={styles.rulesText}>{tournament.rules || t('committee.export.noRules')}</Text>
    </Section>
  )
}

function TeamsSection({ teams, images }) {
  const list = teams || []
  if (list.length === 0) return null
  return (
    <Section icon={'\u00BB'} title="committee.export.section.teams">
      <View style={styles.table}>
        <View style={[styles.tr, { borderBottomWidth: 2, borderBottomColor: C.line }]}>
          <Text style={[styles.th, styles.thCenter, { width: '10%' }]}>{t('committee.export.position')}</Text>
          <Text style={[styles.th, { width: '45%' }]}>{t('committee.export.team')}</Text>
          <Text style={[styles.th, { width: '30%' }]}>{t('committee.export.city')}</Text>
          <Text style={[styles.th, { width: '15%' }]}>{t('committee.export.group')}</Text>
        </View>
        {list.map((p, i) => (
          <View key={p.id ?? i} style={styles.tr} wrap={false}>
            <Text style={[styles.td, styles.tdCenter, { width: '10%' }]}>{i + 1}</Text>
            <View style={[styles.teamCell, { width: '45%' }]}>
              {img(images, logoThumb(p.team)) && <Image src={img(images, logoThumb(p.team))} style={styles.teamLogo} />}
              <Text style={styles.rowTeam}>{p.team?.name || '\u2014'}</Text>
            </View>
            <Text style={[styles.td, { width: '30%' }]}>{p.team?.city || '\u2014'}</Text>
            <Text style={[styles.td, { width: '15%' }]}>{p.group?.name || t('committee.export.noGroup')}</Text>
          </View>
        ))}
      </View>
    </Section>
  )
}

function buildFixtureSections(fixtures) {
  const group = []
  const knockout = []
  for (const f of fixtures || []) {
    const stage = f.round?.stage
    if (stage && stage !== 'group') knockout.push(f)
    else group.push(f)
  }
  const groupMap = new Map()
  for (const f of group) {
    const key = f.matchday ?? 'x'
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key).push(f)
  }
  const groupRounds = [...groupMap.entries()].map(([matchday, items]) => ({
    key: `m${matchday}`,
    matchday,
    items: items.sort((a, b) => (a.group?.name || '').localeCompare(b.group?.name || '', 'ar') || a.id - b.id),
  }))
  const koMap = new Map()
  for (const f of knockout) {
    const key = f.round?.id ?? f.round?.name ?? 'ko'
    if (!koMap.has(key)) koMap.set(key, [])
    koMap.get(key).push(f)
  }
  const koRounds = [...koMap.entries()].map(([key, items]) => ({
    key,
    name: items[0]?.round?.name || '\u2014',
    items: items.sort((a, b) => a.id - b.id),
  }))
  return { groupRounds, koRounds }
}

function FixturesTable({ items, showGroup, showRound }) {
  return (
    <View style={styles.table}>
      <View style={[styles.tr, { borderBottomWidth: 2, borderBottomColor: C.line }]}>
        <Text style={[styles.th, styles.thCenter, { width: '7%' }]}>{t('committee.export.matchNumber')}</Text>
        {showGroup && <Text style={[styles.th, { width: '10%' }]}>{t('committee.export.group')}</Text>}
        {showRound && <Text style={[styles.th, { width: '10%' }]}>{t('committee.export.round')}</Text>}
        <Text style={[styles.th, { width: '18%' }]}>{t('committee.export.home')}</Text>
        <Text style={[styles.th, styles.thCenter, { width: '12%' }]}>{t('committee.export.score')}</Text>
        <Text style={[styles.th, { width: '18%' }]}>{t('committee.export.away')}</Text>
        <Text style={[styles.th, { width: '12%' }]}>{t('committee.export.date')}</Text>
        {!showGroup && !showRound && <Text style={[styles.th, { width: '11%' }]}>{t('committee.export.terrain')}</Text>}
        <Text style={[styles.th, { width: '9%' }]}>{t('committee.export.status')}</Text>
      </View>
      {items.map((f, i) => {
        const status = fixtureStatus(f)
        return (
          <View key={f.id ?? i} style={styles.tr} wrap={false}>
            <Text style={[styles.td, styles.tdCenter, { width: '7%' }]}>{i + 1}</Text>
            {showGroup && <Text style={[styles.td, { width: '10%' }]}>{f.group?.name || '\u2014'}</Text>}
            {showRound && <Text style={[styles.td, { width: '10%' }]}>{f.round?.name || '\u2014'}</Text>}
            <Text style={[styles.td, { width: '18%' }]}>{f.home_team?.name || '\u2014'}</Text>
            <Text style={[styles.td, styles.tdCenter, { width: '12%', fontWeight: 800 }]}>{scoreLine(f)}</Text>
            <Text style={[styles.td, { width: '18%' }]}>{f.away_team?.name || '\u2014'}</Text>
            <Text style={[styles.td, { width: '12%' }]}>{fmtDateTime(f.scheduled_at)}</Text>
            {!showGroup && !showRound && <Text style={[styles.td, { width: '11%' }]}>{f.stadium?.name || '\u2014'}</Text>}
            <View style={[styles.td, { width: '9%', alignItems: 'center', justifyContent: 'center' }]}>
              <StatusBadge status={status} />
            </View>
          </View>
        )
      })}
    </View>
  )
}

function FixturesSection({ fixtures }) {
  if ((fixtures || []).length === 0) return null
  const { groupRounds, koRounds } = buildFixtureSections(fixtures)
  return (
    <Section icon={'\u00AB'} title="committee.export.section.fixtures">
      {groupRounds.length === 0 && koRounds.length === 0 ? (
        <Empty label="committee.export.noFixtures" />
      ) : (
        <>
          {groupRounds.map((r) => (
            <View key={r.key} wrap={false}>
              <SubTitle>{t('committee.detail.round', { n: r.matchday })}</SubTitle>
              <FixturesTable items={r.items} showGroup />
            </View>
          ))}
          {koRounds.map((r) => (
            <View key={r.key} wrap={false}>
              <SubTitle>{r.name}</SubTitle>
              <FixturesTable items={r.items} showRound />
            </View>
          ))}
        </>
      )}
    </Section>
  )
}

function EventRow({ event, homeTeam, awayTeam, images }) {
  const type = eventTypeKey(event.type, event.punishment)
  if (!type) return null
  const teamId = event.team_id
  const isHome = teamId === homeTeam?.id
  const isAway = teamId === awayTeam?.id
  const anchor = isHome ? homeTeam : isAway ? awayTeam : null
  return (
    <View style={styles.eventRow} wrap={false}>
      {event.minute != null && (
        <Text style={styles.eventMinute}>
          {event.minute}{event.added_time ? `+${event.added_time}` : ''}'
        </Text>
      )}
      <Text style={styles.eventHalf}>{halfLabel(event.period)}</Text>
      <Text style={styles.eventType}>{t(`committee.export.event.${type}`)}</Text>
      <Text style={styles.eventText}>{event.player?.name || event.description || ''}</Text>
      {event.assist_player?.name && (
        <Text style={styles.eventText}> ({event.assist_player.name})</Text>
      )}
      {anchor && img(images, logoThumb(anchor)) && (
        <Image src={img(images, logoThumb(anchor))} style={styles.eventTeamLogo} />
      )}
    </View>
  )
}

function ResultsSection({ fixtures, eventsMap }) {
  const finished = (fixtures || [])
    .filter((f) => f.match?.status === 'finished')
    .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
  return (
    <Section icon={'\u00D7'} title="committee.export.section.results">
      {finished.length === 0 ? (
        <Empty label="committee.export.noResults" />
      ) : (
        finished.map((f) => {
          const events = eventsMap.get(f.id) || []
          const winner = matchWinner(f)
          const homeEvents = events.filter((e) => e.team_id === f.home_team?.id)
          const awayEvents = events.filter((e) => e.team_id === f.away_team?.id)
          const neutralEvents = events.filter((e) => e.team_id !== f.home_team?.id && e.team_id !== f.away_team?.id)
          return (
            <View key={f.id} style={styles.result} wrap={false}>
              <View style={styles.resultHead}>
                <Text style={styles.resultRound}>
                  {f.round?.name || (f.group?.name ? `${t('committee.export.group')} ${f.group.name}` : t('committee.detail.round', { n: f.matchday }))}
                </Text>
                <Text style={styles.resultDate}>{fmtDateTime(f.scheduled_at)}</Text>
              </View>
              <View style={styles.resultScore}>
                <Text style={[styles.resultTeam, { textAlign: 'right' }]}>{f.home_team?.name || '\u2014'}</Text>
                <Text style={styles.resultNum}>{scoreLine(f)}</Text>
                <Text style={[styles.resultTeam, { textAlign: 'left' }]}>{f.away_team?.name || '\u2014'}</Text>
              </View>
              <View style={styles.resultMeta}>
                <Text>
                  {t('committee.export.winner')}: <Text style={{ fontWeight: 800 }}>{winner || '\u2014'}</Text>
                </Text>
                {f.stadium?.name && <Text>{f.stadium.name}</Text>}
              </View>
              {events.length > 0 && (
                <View style={styles.eventsSection}>
                  <Text style={styles.eventsLabel}>{t('committee.export.events')}:</Text>
                  {homeEvents.length > 0 && (
                    <>
                      <Text style={styles.eventTeamHeader}>{f.home_team?.name}</Text>
                      {homeEvents.map((ev, i) => (
                        <EventRow key={ev.id ?? i} event={ev} homeTeam={f.home_team} awayTeam={f.away_team} images={undefined} />
                      ))}
                    </>
                  )}
                  {awayEvents.length > 0 && (
                    <>
                      <Text style={styles.eventTeamHeader}>{f.away_team?.name}</Text>
                      {awayEvents.map((ev, i) => (
                        <EventRow key={ev.id ?? i} event={ev} homeTeam={f.home_team} awayTeam={f.away_team} images={undefined} />
                      ))}
                    </>
                  )}
                  {neutralEvents.length > 0 && (
                    <>
                      <Text style={styles.eventTeamHeader}>{t('committee.export.events')}</Text>
                      {neutralEvents.map((ev, i) => (
                        <EventRow key={ev.id ?? i} event={ev} homeTeam={f.home_team} awayTeam={f.away_team} images={undefined} />
                      ))}
                    </>
                  )}
                </View>
              )}
            </View>
          )
        })
      )}
    </Section>
  )
}

function StandingsSection({ standings, images }) {
  const groups = standings?.groups || []
  if (groups.length === 0) return null
  const cols = [
    { key: 'played', label: t('committee.detail.col.played'), width: '9%' },
    { key: 'wins', label: t('committee.detail.col.wins'), width: '8%' },
    { key: 'draws', label: t('committee.detail.col.draws'), width: '8%' },
    { key: 'losses', label: t('committee.detail.col.losses'), width: '8%' },
    { key: 'gf', label: t('committee.detail.col.gf'), width: '8%' },
    { key: 'ga', label: t('committee.detail.col.ga'), width: '8%' },
    { key: 'gd', label: t('committee.detail.col.gd'), width: '9%' },
    { key: 'points', label: t('committee.detail.col.points'), width: '8%' },
  ]
  let statW = cols.reduce((a, c) => a + parseFloat(c.width), 0)
  const posW = 6
  const teamW = `${100 - posW - statW}%`
  return (
    <Section icon={'\u00F7'} title="committee.export.section.standings">
      {groups.map((group) => (
        <View key={group.group_id ?? 'unassigned'}>
          <SubTitle>{group.name || t('committee.export.allTeams')}</SubTitle>
          <View style={styles.table}>
            <View style={[styles.tr, { borderBottomWidth: 2, borderBottomColor: C.line }]}>
              <Text style={[styles.th, styles.thCenter, { width: '6%' }]}>{t('committee.export.position')}</Text>
              <Text style={[styles.th, { width: teamW }]}>{t('committee.export.team')}</Text>
              {cols.map((c) => (
                <Text key={c.key} style={[styles.th, styles.thCenter, { width: c.width }]}>
                  {c.label}
                </Text>
              ))}
            </View>
            {(group.rows || []).map((row, i) => (
              <View key={row.team_id ?? i} style={styles.tr} wrap={false}>
                <Text style={[styles.td, styles.tdCenter, { width: '6%' }]}>{i + 1}</Text>
                <View style={[styles.teamCell, { width: teamW }]}>
                  {img(images, logoThumb(row.team)) && <Image src={img(images, logoThumb(row.team))} style={styles.teamLogo} />}
                  <Text style={styles.rowTeam}>{row.team?.name || '\u2014'}</Text>
                </View>
                <Text style={[styles.td, styles.tdCenter, { width: '9%' }]}>{row.played}</Text>
                <Text style={[styles.td, styles.tdCenter, { width: '8%' }]}>{row.wins}</Text>
                <Text style={[styles.td, styles.tdCenter, { width: '8%' }]}>{row.draws}</Text>
                <Text style={[styles.td, styles.tdCenter, { width: '8%' }]}>{row.losses}</Text>
                <Text style={[styles.td, styles.tdCenter, { width: '8%' }]}>{row.goals_for}</Text>
                <Text style={[styles.td, styles.tdCenter, { width: '8%' }]}>{row.goals_against}</Text>
                <Text style={[styles.td, styles.tdCenter, { width: '9%' }]}>{row.goal_difference >= 0 ? '+' : ''}{row.goal_difference}</Text>
                <Text style={[styles.td, styles.tdCenter, { width: '8%', fontWeight: 800 }]}>{row.points}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </Section>
  )
}

function RankTable({ titleKey, items, emptyKey, countLabel }) {
  const list = items || []
  return (
    <View>
      <SubTitle>{t(titleKey)}</SubTitle>
      {list.length === 0 ? (
        <Empty label={emptyKey} />
      ) : (
        <View style={styles.table}>
          <View style={[styles.tr, { borderBottomWidth: 2, borderBottomColor: C.line }]}>
            <Text style={[styles.th, styles.thCenter, { width: '10%' }]}>{t('committee.export.position')}</Text>
            <Text style={[styles.th, { width: '40%' }]}>{t('committee.export.player')}</Text>
            <Text style={[styles.th, { width: '35%' }]}>{t('committee.export.team')}</Text>
            <Text style={[styles.th, styles.thCenter, { width: '15%' }]}>{countLabel || t('committee.export.goals')}</Text>
          </View>
          {list.map((row, i) => (
            <View key={row.player_id ?? i} style={styles.tr} wrap={false}>
              <Text style={[styles.td, styles.tdCenter, { width: '10%' }]}>{i + 1}</Text>
              <Text style={[styles.td, { width: '40%' }]}>{row.name || '\u2014'}</Text>
              <Text style={[styles.td, { width: '35%' }]}>{row.team_name || '\u2014'}</Text>
              <Text style={[styles.td, styles.tdCenter, { width: '15%' }]}>{row.count}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function Highlights({ statistics }) {
  const s = statistics || {}
  const items = []
  if (s.champion) items.push({ label: t('committee.export.champion'), value: s.champion.name })
  if (s.best_attack) items.push({ label: t('committee.export.bestAttack'), value: `${s.best_attack.name} (${s.best_attack.goals})` })
  if (s.best_defense) items.push({ label: t('committee.export.bestDefense'), value: `${s.best_defense.name} (${s.best_defense.goals_against})` })
  if (s.biggest_win) {
    items.push({
      label: t('committee.export.biggestWin'),
      value: `${s.biggest_win.home_team?.name || ''} ${s.biggest_win.home_score} - ${s.biggest_win.away_score} ${s.biggest_win.away_team?.name || ''}`,
    })
  }
  if (items.length === 0) return null
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <InfoItem key={item.label} label={item.label} value={item.value} />
      ))}
    </View>
  )
}

function ScorersSection({ statistics }) {
  const s = statistics || {}
  const hasData = (s.summary?.matches_played ?? 0) > 0 || (s.top_scorers || []).length > 0
  if (!hasData) return null
  return (
    <Section icon={'\u00B7'} title="committee.export.section.scorers">
      <Highlights statistics={s} />
      <RankTable titleKey="committee.export.goals" items={s.top_scorers} emptyKey="committee.export.noScorers" countLabel={t('committee.export.goals')} />
      <RankTable titleKey="committee.export.assists" items={s.top_assists} emptyKey="committee.export.noScorers" countLabel={t('committee.export.goals')} />
      <RankTable titleKey="committee.export.yellowCards" items={s.yellow_cards} emptyKey="committee.export.noScorers" countLabel={t('committee.export.goals')} />
      <RankTable titleKey="committee.export.redCards" items={s.red_cards} emptyKey="committee.export.noScorers" countLabel={t('committee.export.goals')} />
    </Section>
  )
}

function NewsSection({ news, images }) {
  const list = news || []
  if (list.length === 0) return null
  return (
    <Section icon={'\u00A7'} title="committee.export.section.news">
      {list.map((item) => (
        <View key={item.id} style={styles.newsItem} wrap={false}>
          {img(images, coverThumb(item)) && <Image src={img(images, coverThumb(item))} style={styles.newsImg} />}
          <View style={styles.newsBody}>
            <Text style={styles.newsTitle}>{item.title || '\u2014'}</Text>
            <Text style={styles.newsDate}>{fmtDateTime(item.published_at)}</Text>
            <Text style={styles.newsContent}>{item.content || ''}</Text>
          </View>
        </View>
      ))}
    </Section>
  )
}

function GallerySection({ gallery, images }) {
  const list = gallery || []
  if (list.length === 0) return null
  return (
    <Section icon={'\u00B0'} title="committee.export.section.gallery">
      <View style={styles.galleryRow}>
        {list.map((imgSrc) => {
          const src = img(images, imgSrc.thumbnail_url || imgSrc.image_url)
          return src ? (
            <View key={imgSrc.id} style={styles.galleryItem} wrap={false}>
              <Image src={src} style={styles.galleryImg} />
              {imgSrc.caption && <Text style={styles.galleryCaption}>{imgSrc.caption}</Text>}
            </View>
          ) : null
        })}
      </View>
    </Section>
  )
}

function LogoRow({ name, logoUrl, level, link, images }) {
  return (
    <View style={styles.partner}>
      <View style={styles.partnerBox}>
        {img(images, logoUrl) && <Image src={img(images, logoUrl)} style={styles.partnerLogo} />}
        <View style={styles.partnerBody}>
          <Text style={styles.partnerName}>{name || '\u2014'}</Text>
          {level && <Text style={styles.partnerLevel}>{level}</Text>}
          {link && <Text style={styles.partnerLink}>{link}</Text>}
        </View>
      </View>
    </View>
  )
}

function PartnersSection({ sponsors, partners, images }) {
  const s = sponsors || []
  const p = partners || []
  if (s.length === 0 && p.length === 0) return null
  return (
    <Section icon={'\u00A9'} title="committee.export.section.sponsors">
      {s.length === 0 && p.length === 0 ? (
        <Empty label="committee.export.noSponsors" />
      ) : (
        <View style={styles.partnersRow}>
          {s.map((sp) => (
            <LogoRow key={sp.id} name={sp.name} logoUrl={sp.logo_url} level={sp.level} link={sp.link} images={images} />
          ))}
          {p.map((pt) => (
            <LogoRow key={pt.id} name={pt.name} logoUrl={pt.logo_url} link={pt.link} images={images} />
          ))}
        </View>
      )}
    </Section>
  )
}

function ContactSection({ contact }) {
  const c = contact || {}
  const rows = [
    { key: 'phone', value: c.phone },
    { key: 'email', value: c.email },
    { key: 'whatsapp', value: c.whatsapp_number },
    { key: 'locationContact', value: c.location },
  ]
  const socials = [
    { key: 'facebook', value: c.facebook_url },
    { key: 'instagram', value: c.instagram_url },
    { key: 'tiktok', value: c.tiktok_url },
    { key: 'youtube', value: c.youtube_url },
  ].filter((s) => s.value)
  const hasRows = rows.some((r) => r.value)
  if (!hasRows && socials.length === 0) return null
  return (
    <Section icon={'\u00AE'} title="committee.export.section.contact">
      <View style={styles.grid}>
        {rows.map((row) => (
          <InfoItem key={row.key} label={`committee.export.${row.key}`} value={row.value} />
        ))}
        {socials.map((s) => (
          <InfoItem key={s.key} label={s.key} value={s.value} />
        ))}
      </View>
    </Section>
  )
}

export default function TournamentPdfDocument({ data, images, appName }) {
  const lang = currentLang()
  const { tournament, teams, fixtures, standings, statistics, news, gallery, sponsors, partners, contact, eventsMap } = data || {}

  if (!tournament) return null

  const brand = appName || t('common.appName')

  const logo = img(images, tournament.logo_url)
  const statusKey = statusLabels[tournament.status] ? t(statusLabels[tournament.status]) : tournament.status
  const now = new Intl.DateTimeFormat(locale(), {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContent}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.headerH1}>{tournament.name}</Text>
            <Text style={styles.headerSub}>
              {[tournament.edition, tournament.category].filter(Boolean).join(' \u2014 ')}
              {tournament.organizer?.name ? ` \u2022 ${tournament.organizer.name}` : ''}
            </Text>
            <Text style={styles.headerSub2}>
              {tournament.location ? `${tournament.location} \u2022 ` : ''}
              {fmtDate(tournament.start_date)}
              {tournament.end_date ? ` \u2014 ${fmtDate(tournament.end_date)}` : ''} \u2022 {statusKey}
            </Text>
          </View>
          {logo ? (
            <Image src={logo} style={styles.headerLogoBox} />
          ) : (
            <View style={styles.headerLogoBox}>
              <Text style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{tournament.name?.charAt(0) || 'T'}</Text>
            </View>
          )}
        </View>

        <DetailsSection tournament={tournament} />
        <TeamsSection teams={teams} images={images} />
        <FixturesSection fixtures={fixtures} />
        <ResultsSection fixtures={fixtures} eventsMap={eventsMap} />
        <StandingsSection standings={standings} images={images} />
        <ScorersSection statistics={statistics} />
        <NewsSection news={news} images={images} />
        <GallerySection gallery={gallery} images={images} />
        <PartnersSection sponsors={sponsors} partners={partners} images={images} />
        <ContactSection contact={contact} />
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerApp}>{brand}</Text>
          <Text>
            {t('committee.export.generatedOn')}: {now}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
