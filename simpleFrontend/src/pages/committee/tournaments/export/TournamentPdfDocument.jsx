import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
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

function fmtDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ar-MA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

function img(images, url) {
  return url && images?.has(url) ? url : null
}

const C = {
  emerald: '#059669',
  emeraldDark: '#065f46',
  emeraldLight: '#ecfdf5',
  emeraldBorder: '#a7f3d0',
  gold: '#d97706',
  goldBg: '#fef3c7',
  goldBorder: '#fde68a',
  silverBg: '#f1f5f9',
  silverBorder: '#cbd5e1',
  bronzeBg: '#ffedd5',
  bronzeBorder: '#fed7aa',
  dark: '#0f172a',
  text: '#1e293b',
  muted: '#64748b',
  light: '#f8fafc',
  line: '#e2e8f0',
  cardBg: '#ffffff',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: 'NotoKufiArabic',
    fontSize: 9,
    color: C.text,
    backgroundColor: '#ffffff',
  },
  // Fixed header & footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
    fontSize: 8,
    color: C.muted,
  },
  footerBrand: {
    fontWeight: 700,
    color: C.emerald,
  },

  // Cover / Overview Section
  coverHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: C.emerald,
    paddingBottom: 16,
    marginBottom: 20,
  },
  coverLogoBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: C.light,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverTitleCol: {
    flex: 1,
    alignItems: 'flex-end',
    paddingLeft: 16,
  },
  platformPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: C.emeraldLight,
    borderWidth: 1,
    borderColor: C.emeraldBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  platformPillText: {
    fontSize: 8,
    fontWeight: 800,
    color: C.emeraldDark,
  },
  tournamentTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: C.dark,
    textAlign: 'right',
  },
  tournamentMeta: {
    fontSize: 9,
    color: C.muted,
    marginTop: 4,
    textAlign: 'right',
  },

  // Status Banner
  statusBannerCompleted: {
    backgroundColor: C.emeraldLight,
    borderWidth: 1,
    borderColor: C.emeraldBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 18,
    alignItems: 'center',
  },
  statusBannerProgress: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 18,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: 10,
    fontWeight: 800,
    color: C.dark,
  },

  // Stat Counter Grid (Row-reverse for RTL)
  statsGrid: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '23%',
    backgroundColor: C.light,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 800,
    color: C.dark,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: C.muted,
    marginTop: 2,
    textAlign: 'center',
  },

  // Honors Section (Champion & Runner-up)
  honorsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  championCard: {
    width: '48%',
    backgroundColor: C.goldBg,
    borderWidth: 1.5,
    borderColor: C.goldBorder,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  runnerUpCard: {
    width: '48%',
    backgroundColor: C.silverBg,
    borderWidth: 1.5,
    borderColor: C.silverBorder,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  honorBadgeText: {
    fontSize: 9,
    fontWeight: 800,
    color: C.gold,
    marginBottom: 6,
  },
  runnerUpBadgeText: {
    fontSize: 9,
    fontWeight: 800,
    color: C.muted,
    marginBottom: 6,
  },
  honorTeamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  honorTeamName: {
    fontSize: 13,
    fontWeight: 800,
    color: C.dark,
    textAlign: 'center',
  },

  // Section Heading
  sectionHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: C.emerald,
    paddingBottom: 6,
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: C.dark,
    textAlign: 'right',
  },
  sectionSubtitle: {
    fontSize: 8.5,
    color: C.muted,
    marginRight: 8,
  },

  // Awards Grid
  awardsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  awardItem: {
    width: '31%',
    backgroundColor: C.light,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  awardLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: C.muted,
    marginBottom: 3,
  },
  awardValue: {
    fontSize: 11,
    fontWeight: 800,
    color: C.dark,
    textAlign: 'center',
  },
  awardSub: {
    fontSize: 8,
    fontWeight: 600,
    color: C.emerald,
    marginTop: 2,
  },

  // Standings Table Styles (Row-reverse for native RTL in React-PDF)
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeaderRow: {
    flexDirection: 'row-reverse',
    backgroundColor: '#0f172a',
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 800,
    color: '#ffffff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tableRowTop1: {
    backgroundColor: '#fefce8',
  },
  tableRowTop2: {
    backgroundColor: '#f8fafc',
  },
  tableRowTop3: {
    backgroundColor: '#fff7ed',
  },
  tableCell: {
    fontSize: 8.5,
    color: C.text,
    textAlign: 'center',
  },
  tableCellTeam: {
    fontSize: 9,
    fontWeight: 700,
    color: C.dark,
    textAlign: 'right',
    paddingRight: 6,
  },
  tableCellPts: {
    fontSize: 10,
    fontWeight: 800,
    color: C.emeraldDark,
    textAlign: 'center',
  },

  // Match Cards
  matchCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.light,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  matchTeamHome: {
    width: '38%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  matchTeamAway: {
    width: '38%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchTeamName: {
    fontSize: 9,
    fontWeight: 700,
    color: C.dark,
  },
  matchTeamLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  matchScoreBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  matchScoreNum: {
    fontSize: 11,
    fontWeight: 800,
    color: '#ffffff',
  },
  matchScoreDash: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    marginHorizontal: 4,
  },
  roundHeader: {
    fontSize: 10,
    fontWeight: 800,
    color: C.emeraldDark,
    backgroundColor: C.emeraldLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
    marginTop: 8,
    textAlign: 'right',
  },

  // Scorers Table
  scorersTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 6,
  },
  scorersHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: C.dark,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  scorersRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
})

export default function TournamentPdfDocument({ data, images, appName }) {
  const { tournament, teams = [], fixtures = [], standings, statistics } = data || {}
  if (!tournament) return null

  const isCompleted = tournament.status === 'completed'
  const brand = appName || 'AJI NQSSRO • أجي نقصروا'
  const logo = img(images, tournament.logo_url)

  const finishedMatches = (fixtures || []).filter((f) => f.match?.status === 'finished')

  const totalGoals =
    statistics?.summary?.total_goals ??
    finishedMatches.reduce((s, f) => s + Number(f.match?.home_score ?? 0) + Number(f.match?.away_score ?? 0), 0)

  const goalsPerMatch = finishedMatches.length ? (totalGoals / finishedMatches.length).toFixed(1) : '0.0'

  const standingsRows = standings?.groups?.[0]?.rows || []

  // Champion and Runner-up
  const champion = isCompleted ? (tournament.winner_team || standingsRows[0]?.team || null) : null
  const runnerUp = isCompleted ? (tournament.runner_up_team || standingsRows[1]?.team || null) : null

  // Top Scorer
  const topScorer = (statistics?.scorers || []).length > 0 && statistics.scorers[0].count > 0 ? statistics.scorers[0] : null

  // Best attack & defense
  const bestAttack = statistics?.best_attack || null
  const bestDefense = statistics?.best_defense || null

  // Group finished matches by matchday or round
  const matchesByRound = new Map()
  finishedMatches.forEach((f) => {
    const roundKey = f.round_name || (f.matchday ? `الجولة ${f.matchday}` : 'المباريات الرسمية')
    if (!matchesByRound.has(roundKey)) matchesByRound.set(roundKey, [])
    matchesByRound.get(roundKey).push(f)
  })

  const generatedDate = new Intl.DateTimeFormat('ar-MA', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  return (
    <Document title={`${tournament.name} - ${isCompleted ? 'التقرير الختامي' : 'تقرير البطولة'}`}>
      
      {/* ==================== PAGE 1: OVERVIEW & HONORS ==================== */}
      <Page size="A4" style={styles.page}>
        {/* Cover Header */}
        <View style={styles.coverHeader}>
          {logo ? (
            <Image src={logo} style={styles.coverLogoBox} />
          ) : (
            <View style={styles.coverLogoBox}>
              <Text style={{ fontSize: 24, fontWeight: 800, color: C.emerald }}>
                {tournament.name?.charAt(0) || 'T'}
              </Text>
            </View>
          )}

          <View style={styles.coverTitleCol}>
            <View style={styles.platformPill}>
              <Text style={styles.platformPillText}>AJI NQSSRO • أجي نقصروا</Text>
            </View>
            <Text style={styles.tournamentTitle}>{tournament.name}</Text>
            <Text style={styles.tournamentMeta}>
              {[tournament.edition, tournament.category, tournament.location].filter(Boolean).join(' • ')}
            </Text>
            <Text style={styles.tournamentMeta}>
              {fmtDate(tournament.start_date)}
              {tournament.end_date ? ` — ${fmtDate(tournament.end_date)}` : ''}
            </Text>
          </View>
        </View>

        {/* Status Banner */}
        <View style={isCompleted ? styles.statusBannerCompleted : styles.statusBannerProgress}>
          <Text style={styles.statusBannerText}>
            {isCompleted
              ? 'التقرير الختامي الرسمي — البطولة مكتملة رسمياً ✓'
              : 'تقرير مجريات البطولة — مرحلي (البطولة لا تزال جارية)'}
          </Text>
        </View>

        {/* Big Stat Counters */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{teams.length}</Text>
            <Text style={styles.statLabel}>أندية مشاركة</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{finishedMatches.length}</Text>
            <Text style={styles.statLabel}>مباريات منتهية</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalGoals}</Text>
            <Text style={styles.statLabel}>إجمالي الأهداف</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{goalsPerMatch}</Text>
            <Text style={styles.statLabel}>معدل الأهداف / مباراة</Text>
          </View>
        </View>

        {/* Champion & Runner-up (ONLY when completed) */}
        {isCompleted && champion && (
          <View style={styles.honorsRow}>
            <View style={styles.championCard}>
              <Text style={styles.honorBadgeText}>بطل البطولة 🏆</Text>
              {img(images, champion.logo_url) && (
                <Image src={champion.logo_url} style={styles.honorTeamLogo} />
              )}
              <Text style={styles.honorTeamName}>{champion.name}</Text>
            </View>

            <View style={styles.runnerUpCard}>
              <Text style={styles.runnerUpBadgeText}>وصيف البطولة 🥈</Text>
              {runnerUp && img(images, runnerUp.logo_url) && (
                <Image src={runnerUp.logo_url} style={styles.honorTeamLogo} />
              )}
              <Text style={styles.honorTeamName}>{runnerUp?.name || '—'}</Text>
            </View>
          </View>
        )}

        {/* Verified Awards Section */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>الجوائز والأرقام المميزة المعتمدة</Text>
        </View>

        <View style={styles.awardsGrid}>
          <View style={styles.awardItem}>
            <Text style={styles.awardLabel}>هداف البطولة ⚽</Text>
            <Text style={styles.awardValue}>{topScorer ? topScorer.name : 'قيد التحديد'}</Text>
            {topScorer && (
              <Text style={styles.awardSub}>{topScorer.count} أهداف {topScorer.team?.name ? `(${topScorer.team.name})` : ''}</Text>
            )}
          </View>

          <View style={styles.awardItem}>
            <Text style={styles.awardLabel}>أقوى خط هجوم 🔥</Text>
            <Text style={styles.awardValue}>{bestAttack?.team?.name || 'قيد التحديد'}</Text>
            {bestAttack?.goals_for != null && (
              <Text style={styles.awardSub}>{bestAttack.goals_for} هدفاً مسجلاً</Text>
            )}
          </View>

          <View style={styles.awardItem}>
            <Text style={styles.awardLabel}>أقوى خط دفاع 🛡️</Text>
            <Text style={styles.awardValue}>{bestDefense?.team?.name || 'قيد التحديد'}</Text>
            {bestDefense?.goals_against != null && (
              <Text style={styles.awardSub}>استقبل {bestDefense.goals_against} أهداف</Text>
            )}
          </View>
        </View>

        {/* Highlights summary */}
        {statistics?.summary?.clean_sheets != null && (
          <View style={[styles.statsGrid, { marginTop: 10 }]}>
            <View style={[styles.statCard, { width: '48%' }]}>
              <Text style={styles.statNumber}>{statistics.summary.clean_sheets}</Text>
              <Text style={styles.statLabel}>مباريات بشباك نظيفة (Clean Sheet)</Text>
            </View>
            <View style={[styles.statCard, { width: '48%' }]}>
              <Text style={styles.statNumber}>
                {statistics.summary.biggest_win?.margin
                  ? `${statistics.summary.biggest_win.home_score} - ${statistics.summary.biggest_win.away_score}`
                  : '—'}
              </Text>
              <Text style={styles.statLabel}>أكبر نتيجة فوز مسجلة</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>AJI NQSSRO • ajin9essro.com</Text>
          <Text>{tournament.name} • تاريخ الاستخراج: {generatedDate}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* ==================== PAGE 2: OFFICIAL STANDINGS ==================== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            {isCompleted ? 'جدول الترتيب النهائي المعتمد' : 'جدول الترتيب الحالي للبطولة'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {standingsRows.length} أندية
          </Text>
        </View>

        {standingsRows.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: C.muted }}>لا تتوفر بيانات ترتيب معتمدة حتى الآن</Text>
          </View>
        ) : (
          <View style={styles.table}>
            {/* Header: Row-reverse places '#' on far right, 'pts' on far left */}
            <View style={styles.tableHeaderRow} fixed>
              <Text style={[styles.tableHeaderCell, { width: '6%' }]}>#</Text>
              <Text style={[styles.tableHeaderCell, { width: '36%', textAlign: 'right', paddingRight: 6 }]}>الفريق</Text>
              <Text style={[styles.tableHeaderCell, { width: '7%' }]}>لعب</Text>
              <Text style={[styles.tableHeaderCell, { width: '7%' }]}>فاز</Text>
              <Text style={[styles.tableHeaderCell, { width: '7%' }]}>تعادل</Text>
              <Text style={[styles.tableHeaderCell, { width: '7%' }]}>خسر</Text>
              <Text style={[styles.tableHeaderCell, { width: '7%' }]}>له</Text>
              <Text style={[styles.tableHeaderCell, { width: '7%' }]}>عليه</Text>
              <Text style={[styles.tableHeaderCell, { width: '7%' }]}>فارق</Text>
              <Text style={[styles.tableHeaderCell, { width: '9%' }]}>نقاط</Text>
            </View>

            {standingsRows.map((row, idx) => {
              const rank = idx + 1
              const rowStyle = rank === 1 ? styles.tableRowTop1 : rank === 2 ? styles.tableRowTop2 : rank === 3 ? styles.tableRowTop3 : {}

              return (
                <View key={row.team_id || idx} style={[styles.tableRow, rowStyle]} wrap={false}>
                  <Text style={[styles.tableCell, { width: '6%', fontWeight: rank <= 3 ? 800 : 600 }]}>
                    {rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : rank}
                  </Text>
                  <View style={{ width: '36%', flexDirection: 'row-reverse', alignItems: 'center' }}>
                    {img(images, row.team?.logo_url) && (
                      <Image src={row.team.logo_url} style={{ width: 14, height: 14, borderRadius: 7, marginLeft: 4 }} />
                    )}
                    <Text style={styles.tableCellTeam}>{row.team?.name || '—'}</Text>
                  </View>
                  <Text style={[styles.tableCell, { width: '7%' }]}>{row.played ?? 0}</Text>
                  <Text style={[styles.tableCell, { width: '7%' }]}>{row.wins ?? 0}</Text>
                  <Text style={[styles.tableCell, { width: '7%' }]}>{row.draws ?? 0}</Text>
                  <Text style={[styles.tableCell, { width: '7%' }]}>{row.losses ?? 0}</Text>
                  <Text style={[styles.tableCell, { width: '7%' }]}>{row.goals_for ?? 0}</Text>
                  <Text style={[styles.tableCell, { width: '7%' }]}>{row.goals_against ?? 0}</Text>
                  <Text style={[styles.tableCell, { width: '7%', fontWeight: 700, color: (row.goal_difference ?? 0) >= 0 ? C.emeraldDark : '#e11d48' }]}>
                    {(row.goal_difference ?? 0) >= 0 ? `+${row.goal_difference}` : row.goal_difference}
                  </Text>
                  <Text style={[styles.tableCellPts, { width: '9%' }]}>{row.points ?? 0}</Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Standings Notes */}
        <View style={{ marginTop: 10, padding: 8, backgroundColor: C.light, borderRadius: 6 }}>
          <Text style={{ fontSize: 7.5, color: C.muted, textAlign: 'right' }}>
            * يتم احتساب الترتيب الرسمي استناداً إلى مجموع النقاط، فارق الأهداف، ثم الأهداف المسجلة وفق لائحة البطولة المعتمدة.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>AJI NQSSRO • ajin9essro.com</Text>
          <Text>{tournament.name} • جدول الترتيب</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {/* ==================== PAGE 3+: MATCH RESULTS & TOP SCORERS ==================== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>نتائج المباريات المكتملة والمعتمدة</Text>
          <Text style={styles.sectionSubtitle}>
            {finishedMatches.length} مباراة منتهية
          </Text>
        </View>

        {finishedMatches.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: C.muted }}>لا تتوفر مباريات منتهية حتى الآن</Text>
          </View>
        ) : (
          Array.from(matchesByRound.entries()).map(([roundTitle, roundMatches]) => (
            <View key={roundTitle} style={{ marginBottom: 12 }}>
              <Text style={styles.roundHeader}>{roundTitle}</Text>
              {roundMatches.map((f) => (
                <View key={f.id} style={styles.matchCard} wrap={false}>
                  {/* Home Team (Right) */}
                  <View style={styles.matchTeamHome}>
                    {img(images, f.home_team?.logo_url) && (
                      <Image src={f.home_team.logo_url} style={styles.matchTeamLogo} />
                    )}
                    <Text style={styles.matchTeamName}>{f.home_team?.name || '—'}</Text>
                  </View>

                  {/* Isolated Score Box (Center) */}
                  <View style={styles.matchScoreBox}>
                    <Text style={styles.matchScoreNum}>{f.match?.home_score ?? 0}</Text>
                    <Text style={styles.matchScoreDash}>-</Text>
                    <Text style={styles.matchScoreNum}>{f.match?.away_score ?? 0}</Text>
                  </View>

                  {/* Away Team (Left) */}
                  <View style={styles.matchTeamAway}>
                    <Text style={styles.matchTeamName}>{f.away_team?.name || '—'}</Text>
                    {img(images, f.away_team?.logo_url) && (
                      <Image src={f.away_team.logo_url} style={styles.matchTeamLogo} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {/* Compact Top Scorers Table if available */}
        {(statistics?.scorers || []).length > 0 && (
          <View style={{ marginTop: 14 }} wrap={false}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>قائمة هدافي البطولة ⚽</Text>
            </View>

            <View style={styles.scorersTable}>
              <View style={styles.scorersHeader}>
                <Text style={[styles.tableHeaderCell, { width: '10%' }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: '50%', textAlign: 'right', paddingRight: 6 }]}>اللاعب</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>الفريق</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>الأهداف</Text>
              </View>

              {statistics.scorers.slice(0, 8).map((sc, scIdx) => (
                <View key={sc.player_id || scIdx} style={styles.scorersRow}>
                  <Text style={[styles.tableCell, { width: '10%', fontWeight: scIdx === 0 ? 800 : 500 }]}>
                    {scIdx + 1}
                  </Text>
                  <Text style={[styles.tableCellTeam, { width: '50%' }]}>{sc.name}</Text>
                  <Text style={[styles.tableCell, { width: '25%', textAlign: 'right', color: C.muted }]}>
                    {sc.team?.name || '—'}
                  </Text>
                  <Text style={[styles.tableCellPts, { width: '15%' }]}>{sc.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>AJI NQSSRO • ajin9essro.com</Text>
          <Text>{tournament.name} • نتائج المباريات</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

    </Document>
  )
}
