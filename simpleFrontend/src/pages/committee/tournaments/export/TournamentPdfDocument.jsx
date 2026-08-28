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

const t = (key, opts) => i18n.t(key, opts)

function currentLang() {
  return (i18n.resolvedLanguage || i18n.language || 'ar').startsWith('en') ? 'en' : 'ar'
}

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
  const lang = currentLang()
  return new Intl.DateTimeFormat(lang.startsWith('ar') ? 'ar-MA' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
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

function fixtureStatus(f) {
  const m = f.match
  if (f.status === 'cancelled' || m?.status === 'cancelled') return 'cancelled'
  if (f.status === 'postponed' || m?.status === 'postponed') return 'postponed'
  if (m?.status === 'finished') return 'finished'
  if (m && LIVE_STATUSES.has(m.status)) return 'live'
  return 'scheduled'
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

function eventTypeKey(type) {
  if (type === 'own_goal') return 'ownGoal'
  if (type === 'yellow_card' || type === 'second_yellow') return 'yellow'
  if (type === 'red_card') return 'red'
  if (type === 'assist') return 'assist'
  if (type === 'goal' || type === 'penalty_goal') return 'goal'
  return null
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
    borderBottomColor: C.line,
    paddingBottom: 5,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: C.greenLight,
    color: C.green,
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 9,
    fontWeight: 800,
    marginLeft: 6,
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
  resultEvents: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 4, marginTop: 5, flexDirection: 'row', flexWrap: 'wrap' },
  eventsLabel: { fontSize: 6.8, fontWeight: 700, color: C.muted, marginLeft: 6 },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.line,
    borderRadius: 4,
    backgroundColor: C.chipBg,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 0,
    marginLeft: 4,
    marginBottom: 3,
  },
  eventMinute: { fontSize: 6.5, fontWeight: 800, color: C.green, marginLeft: 3 },
  eventLabel: { fontSize: 6.5, color: C.muted },
  eventPlayer: { fontSize: 6.8, fontWeight: 700, marginLeft: 3 },

  newsItem: { flexDirection: 'row', borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 7, marginBottom: 6 },
  newsImg: { width: 54, height: 40, borderRadius: 5, marginRight: 8 },
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
  partnerLogo: { width: 26, height: 26, borderRadius: 5, marginRight: 7, objectFit: 'contain', borderWidth: 0.5, borderColor: '#eef2f7', backgroundColor: '#f8fafc' },
  partnerBody: { flex: 1 },
  partnerName: { fontSize: 8.5, fontWeight: 700 },
  partnerLevel: { fontSize: 7, color: C.green, fontWeight: 600, marginTop: 1 },
  partnerLink: { fontSize: 7, color: C.muted, marginTop: 1 },

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

function InfoItem({ label, value }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>{t(label)}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  )
}

function Section({ icon, title, children, style }) {
  return (
    <View style={[styles.section, style]} wrap={false}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Text>{icon}</Text>
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

function DetailsSection({ tournament }) {
  const start = fmtDate(tournament.start_date)
  const end = fmtDate(tournament.end_date)
  const statusKey = statusLabels[tournament.status] ? t(statusLabels[tournament.status]) : tournament.status
  return (
    <Section icon="ℹ" title="committee.export.section.details">
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
        <InfoItem label="committee.export.capacity" value={tournament.teams_count || '—'} />
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
    <Section icon="ƒ" title="committee.export.section.teams">
      <View style={styles.table}>
        <View style={[styles.tr, { borderBottomWidth: 2, borderBottomColor: C.line }]}>
          <Text style={[styles.th, styles.thCenter, { width: '10%' }]}>{t('committee.export.position')}</Text>
          <Text style={[styles.th, { width: '45%' }]}>{t('committee.export.team')}</Text>
          <Text style={[styles.th, { width: '30%' }]}>{t('committee.export.city')}</Text>
          <Text style={[styles.th, { width: '15%' }]}>{t('committee.export.group')}</Text>
        </View>
        {list.map((p, i) => (
          <View key={p.id ?? i} style={styles.tr}>
            <Text style={[styles.td, styles.tdCenter, { width: '10%' }]}>{i + 1}</Text>
            <View style={[styles.teamCell, { width: '45%' }]}>
              {img(images, logoThumb(p.team)) && <Image src={img(images, logoThumb(p.team))} style={styles.teamLogo} />}
              <Text style={styles.rowTeam}>{p.team?.name || '—'}</Text>
            </View>
            <Text style={[styles.td, { width: '30%' }]}>{p.team?.city || '—'}</Text>
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
    name: items[0]?.round?.name || '—',
    items: items.sort((a, b) => a.id - b.id),
  }))
  return { groupRounds, koRounds }
}

function FixturesTable({ items, showGroup, showRound }) {
  return (
    <View style={styles.table}>
      <View style={[styles.tr, { borderBottomWidth: 2, borderBottomColor: C.line }]}>
        <Text style={[styles.th, styles.thCenter, { width: '8%' }]}>{t('committee.export.matchNumber')}</Text>
        {showGroup && <Text style={[styles.th, { width: '12%' }]}>{t('committee.export.group')}</Text>}
        {showRound && <Text style={[styles.th, { width: '14%' }]}>{t('committee.export.round')}</Text>}
        <Text style={[styles.th, { width: '22%' }]}>{t('committee.export.home')}</Text>
        <Text style={[styles.th, styles.thCenter, { width: '12%' }]}>{t('committee.export.score')}</Text>
        <Text style={[styles.th, { width: '22%' }]}>{t('committee.export.away')}</Text>
        <Text style={[styles.th, { width: '16%' }]}>{t('committee.export.date')}</Text>
        {!showGroup && !showRound && <Text style={[styles.th, { width: '14%' }]}>{t('committee.export.terrain')}</Text>}
        <Text style={[styles.th, { width: '10%' }]}>{t('committee.export.status')}</Text>
      </View>
      {items.map((f, i) => (
        <View key={f.id ?? i} style={styles.tr}>
          <Text style={[styles.td, styles.tdCenter, { width: '8%' }]}>{i + 1}</Text>
          {showGroup && <Text style={[styles.td, { width: '12%' }]}>{f.group?.name || '—'}</Text>}
          {showRound && <Text style={[styles.td, { width: '14%' }]}>{f.round?.name || '—'}</Text>}
          <Text style={[styles.td, { width: '22%' }]}>{f.home_team?.name || '—'}</Text>
          <Text style={[styles.td, styles.tdCenter, { width: '12%', fontWeight: 800 }]}>{scoreLine(f)}</Text>
          <Text style={[styles.td, { width: '22%' }]}>{f.away_team?.name || '—'}</Text>
          <Text style={[styles.td, { width: '16%' }]}>{fmtDateTime(f.scheduled_at)}</Text>
          {!showGroup && !showRound && <Text style={[styles.td, { width: '14%' }]}>{f.stadium?.name || '—'}</Text>}
          <Text style={[styles.td, { width: '10%' }]}>{t(`committee.detail.matchStatus.${fixtureStatus(f)}`)}</Text>
        </View>
      ))}
    </View>
  )
}

function FixturesSection({ fixtures }) {
  if ((fixtures || []).length === 0) return null
  const { groupRounds, koRounds } = buildFixtureSections(fixtures)
  return (
    <Section icon="Š" title="committee.export.section.fixtures">
      {groupRounds.length === 0 && koRounds.length === 0 ? (
        <Empty label="committee.export.noFixtures" />
      ) : (
        <>
          {groupRounds.map((r) => (
            <View key={r.key}>
              <SubTitle>{t('committee.detail.round', { n: r.matchday })}</SubTitle>
              <FixturesTable items={r.items} showGroup />
            </View>
          ))}
          {koRounds.map((r) => (
            <View key={r.key}>
              <SubTitle>{r.name}</SubTitle>
              <FixturesTable items={r.items} showRound />
            </View>
          ))}
        </>
      )}
    </Section>
  )
}

function EventChip({ event }) {
  const type = eventTypeKey(event.type)
  if (!type) return null
  return (
    <View style={styles.event}>
      {event.minute != null && (
        <Text style={styles.eventMinute}>
          {event.minute}
          {event.added_time ? `+${event.added_time}` : ''}'
        </Text>
      )}
      <Text style={styles.eventLabel}>{t(`committee.export.event.${type}`)}</Text>
      <Text style={styles.eventPlayer}>{event.player?.name || event.description || ''}</Text>
      {event.assist_player?.name && <Text style={styles.eventPlayer}>({event.assist_player.name})</Text>}
    </View>
  )
}

function ResultsSection({ fixtures, eventsMap }) {
  const finished = (fixtures || [])
    .filter((f) => f.match?.status === 'finished')
    .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
  if (finished.length === 0) return null
  return (
    <Section icon="Ó" title="committee.export.section.results">
      {finished.map((f) => {
        const events = eventsMap.get(f.id) || []
        const winner = matchWinner(f)
        return (
          <View key={f.id} style={styles.result} wrap={false}>
            <View style={styles.resultHead}>
              <Text style={styles.resultRound}>
                {f.round?.name || (f.group?.name ? `${t('committee.export.group')} ${f.group.name}` : t('committee.detail.round', { n: f.matchday }))}
              </Text>
              <Text style={styles.resultDate}>{fmtDateTime(f.scheduled_at)}</Text>
            </View>
            <View style={styles.resultScore}>
              <Text style={[styles.resultTeam, { justifyContent: 'flex-start' }]}>{f.home_team?.name || '—'}</Text>
              <Text style={styles.resultNum}>{scoreLine(f)}</Text>
              <Text style={[styles.resultTeam, { justifyContent: 'flex-end', textAlign: 'left' }]}>{f.away_team?.name || '—'}</Text>
            </View>
            <View style={styles.resultMeta}>
              <Text>
                {t('committee.export.winner')}: <Text style={{ fontWeight: 800 }}>{winner || '—'}</Text>
              </Text>
              {f.stadium?.name && <Text>{f.stadium.name}</Text>}
            </View>
            {events.length > 0 && (
              <View style={styles.resultEvents}>
                <Text style={styles.eventsLabel}>{t('committee.export.events')}:</Text>
                {events.map((ev, i) => (
                  <EventChip key={ev.id ?? i} event={ev} />
                ))}
              </View>
            )}
          </View>
        )
      })}
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
  const teamW = `${100 - statW}%`
  return (
    <Section icon="‡" title="committee.export.section.standings">
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
              <View key={row.team_id ?? i} style={styles.tr}>
                <Text style={[styles.td, styles.tdCenter, { width: '6%' }]}>{i + 1}</Text>
                <View style={[styles.teamCell, { width: teamW }]}>
                  {img(images, logoThumb(row.team)) && <Image src={img(images, logoThumb(row.team))} style={styles.teamLogo} />}
                  <Text style={styles.rowTeam}>{row.team?.name || '—'}</Text>
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

function RankTable({ titleKey, items, emptyKey }) {
  const list = items || []
  return (
    <View>
      <SubTitle>{t(titleKey)}</SubTitle>
      {list.length === 0 ? (
        <Empty label={emptyKey} />
      ) : (
        <View style={styles.table}>
          <View style={[styles.tr, { borderBottomWidth: 2, borderBottomColor: C.line }]}>
            <Text style={[styles.th, styles.thCenter, { width: '12%' }]}>{t('committee.export.position')}</Text>
            <Text style={[styles.th, { width: '46%' }]}>{t('committee.export.player')}</Text>
            <Text style={[styles.th, { width: '30%' }]}>{t('committee.export.team')}</Text>
            <Text style={[styles.th, styles.thCenter, { width: '12%' }]}>{t('committee.export.goals')}</Text>
          </View>
          {list.map((row, i) => (
            <View key={row.player_id ?? i} style={styles.tr}>
              <Text style={[styles.td, styles.tdCenter, { width: '12%' }]}>{i + 1}</Text>
              <Text style={[styles.td, { width: '46%' }]}>{row.name || '—'}</Text>
              <Text style={[styles.td, { width: '30%' }]}>{row.team_name || '—'}</Text>
              <Text style={[styles.td, styles.tdCenter, { width: '12%' }]}>{row.count}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function CardTable({ titleKey, items, emptyKey }) {
  return <RankTable titleKey={titleKey} items={items} emptyKey={emptyKey} />
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
    <Section icon="ß" title="committee.export.section.scorers">
      <Highlights statistics={s} />
      <RankTable titleKey="committee.export.goals" items={s.top_scorers} emptyKey="committee.export.noScorers" />
      <RankTable titleKey="committee.export.assists" items={s.top_assists} emptyKey="committee.export.noScorers" />
      <CardTable titleKey="committee.export.yellowCards" items={s.yellow_cards} emptyKey="committee.export.noScorers" />
      <CardTable titleKey="committee.export.redCards" items={s.red_cards} emptyKey="committee.export.noScorers" />
    </Section>
  )
}

function NewsSection({ news, images }) {
  const list = news || []
  if (list.length === 0) return null
  return (
    <Section icon="„" title="committee.export.section.news">
      {list.length === 0 ? (
        <Empty label="committee.export.noNews" />
      ) : (
        list.map((item) => (
          <View key={item.id} style={styles.newsItem} wrap={false}>
            {img(images, coverThumb(item)) && <Image src={img(images, coverThumb(item))} style={styles.newsImg} />}
            <View style={styles.newsBody}>
              <Text style={styles.newsTitle}>{item.title || '—'}</Text>
              <Text style={styles.newsDate}>{fmtDateTime(item.published_at)}</Text>
              <Text style={styles.newsContent}>{item.content || ''}</Text>
            </View>
          </View>
        ))
      )}
    </Section>
  )
}

function GallerySection({ gallery, images }) {
  const list = gallery || []
  if (list.length === 0) return null
  return (
    <Section icon="≈" title="committee.export.section.gallery">
      {list.length === 0 ? (
        <Empty label="committee.export.noGallery" />
      ) : (
        <View style={styles.galleryRow}>
          {list.map((imgSrc) => {
            const src = img(images, imgSrc.thumbnail_url || imgSrc.image_url)
            return src ? (
              <View key={imgSrc.id} style={styles.galleryItem}>
                <Image src={src} style={styles.galleryImg} />
                {imgSrc.caption && <Text style={styles.galleryCaption}>{imgSrc.caption}</Text>}
              </View>
            ) : null
          })}
        </View>
      )}
    </Section>
  )
}

function LogoRow({ name, logoUrl, level, link, images }) {
  return (
    <View style={styles.partner}>
      <View style={styles.partnerBox}>
        {img(images, logoUrl) && <Image src={img(images, logoUrl)} style={styles.partnerLogo} />}
        <View style={styles.partnerBody}>
          <Text style={styles.partnerName}>{name || '—'}</Text>
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
    <Section icon="¶" title="committee.export.section.sponsors">
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
    <Section icon="≈" title="committee.export.section.contact">
      {!hasRows && socials.length === 0 ? (
        <Empty label="committee.export.noContact" />
      ) : (
        <View style={styles.grid}>
          {rows.map((row) => (
            <InfoItem key={row.key} label={`committee.export.${row.key}`} value={row.value} />
          ))}
          {socials.map((s) => (
            <InfoItem key={s.key} label={s.key} value={s.value} />
          ))}
        </View>
      )}
    </Section>
  )
}

export default function TournamentPdfDocument({ data, images }) {
  const lang = currentLang()
  const { tournament, teams, fixtures, standings, statistics, news, gallery, sponsors, partners, contact, eventsMap } = data || {}

  if (!tournament) return null

  const logo = img(images, tournament.logo_url)
  const statusKey = statusLabels[tournament.status] ? t(statusLabels[tournament.status]) : tournament.status
  const now = new Intl.DateTimeFormat(lang.startsWith('ar') ? 'ar-MA' : 'en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.headerH1}>{tournament.name}</Text>
            <Text style={styles.headerSub}>
              {[tournament.edition, tournament.category].filter(Boolean).join(' — ')}
              {tournament.organizer?.name ? ` • ${tournament.organizer.name}` : ''}
            </Text>
            <Text style={styles.headerSub2}>
              {tournament.location ? `${tournament.location} • ` : ''}
              {fmtDate(tournament.start_date)}
              {tournament.end_date ? ` — ${fmtDate(tournament.end_date)}` : ''} • {statusKey}
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
