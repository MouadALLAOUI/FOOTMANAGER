import { useTranslation } from 'react-i18next'
import i18n from '../../../../i18n'
import { logoThumb, coverThumb } from '../../../../lib/thumb'
import { LIVE_STATUSES } from '../../../../data/fixtures'
import { statusLabels } from '../../../../components/dashboard/ui'

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

function fmtDate(value, lang) {
  const date = parseDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(lang.startsWith('ar') ? 'ar-MA' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function fmtDateTime(value, lang) {
  const date = parseDate(value)
  if (!date) return ''
  const datePart = new Intl.DateTimeFormat(lang.startsWith('ar') ? 'ar-MA' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
  const timePart = date.toLocaleTimeString(lang.startsWith('ar') ? 'ar-MA' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart} â€” ${timePart}`
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

function SectionHeading({ title, icon }) {
  const { t } = useTranslation()
  return (
    <div className="tm-print-section-heading">
      <span className="tm-print-section-icon">{icon}</span>
      <h2>{t(title)}</h2>
    </div>
  )
}

function EmptyRow({ label }) {
  const { t } = useTranslation()
  return <p className="tm-print-empty">{t(label)}</p>
}

function InfoItem({ label, value }) {
  const { t } = useTranslation()
  return (
    <div className="tm-print-info-item">
      <span className="tm-print-info-label">{t(label)}</span>
      <span className="tm-print-info-value">{value || `â€”`}</span>
    </div>
  )
}

function DetailsSection({ tournament }) {
  const { t } = useTranslation()
  const start = fmtDate(tournament.start_date, currentLang())
  const end = fmtDate(tournament.end_date, currentLang())
  const statusKey = statusLabels[tournament.status] ? t(statusLabels[tournament.status]) : tournament.status
  return (
    <section className="tm-print-section">
      <SectionHeading title="committee.export.section.details" icon="â„¹" />
      <div className="tm-print-grid">
        <InfoItem label="committee.export.organizer" value={tournament.organizer?.name} />
        <InfoItem label="committee.export.location" value={tournament.location} />
        <InfoItem label="committee.export.dates" value={start && end ? `${start} ${t('committee.export.to')} ${end}` : start || end} />
        <InfoItem label="committee.export.format" value={t(`committee.tournaments.formats.${tournament.tournament_format}`)} />
        <InfoItem label="committee.export.status" value={statusKey} />
        <InfoItem
          label="committee.export.registrationPeriod"
          value={`${fmtDateTime(tournament.registration_start_at, currentLang())} ${t('committee.export.to')} ${fmtDateTime(tournament.registration_end_at, currentLang())}`.trim()}
        />
        <InfoItem
          label="committee.export.registrationFee"
          value={tournament.requires_registration_fee ? `${tournament.registration_fee} DH` : t('committee.detail.feeFree')}
        />
        <InfoItem label="committee.export.capacity" value={tournament.teams_count || 'â€”'} />
        <InfoItem
          label="committee.export.points"
          value={`${tournament.points_for_win} / ${tournament.points_for_draw} / ${tournament.points_for_loss}`}
        />
      </div>
      <div className="tm-print-rules">
        <p className="tm-print-rules-label">{t('committee.export.rules')}</p>
        <p className="tm-print-rules-text">{tournament.rules || t('committee.export.noRules')}</p>
      </div>
    </section>
  )
}

function TeamsSection({ teams }) {
  const { t } = useTranslation()
  const list = teams || []
  if (list.length === 0) return null
  return (
    <section className="tm-print-section">
      <SectionHeading title="committee.export.section.teams" icon="Æ’" />
      <table className="tm-print-table">
        <thead>
          <tr>
            <th className="tm-print-th-narrow">{t('committee.export.position')}</th>
            <th>{t('committee.export.team')}</th>
            <th>{t('committee.export.city')}</th>
            <th>{t('committee.export.group')}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, i) => (
            <tr key={p.id ?? i}>
              <td className="tm-print-td-center">{i + 1}</td>
              <td>
                <span className="tm-print-team">
                  {p.team?.logo_url && <img src={logoThumb(p.team)} alt="" className="tm-print-logo-sm" />}
                  <span>{p.team?.name || 'â€”'}</span>
                </span>
              </td>
              <td>{p.team?.city || 'â€”'}</td>
              <td>{p.group?.name || t('committee.export.noGroup')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
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
    name: items[0]?.round?.name || 'â€”',
    items: items.sort((a, b) => a.id - b.id),
  }))
  return { groupRounds, koRounds }
}

function FixturesTable({ items, showGroup, showRound }) {
  const { t } = useTranslation()
  const lang = currentLang()
  return (
    <table className="tm-print-table">
      <thead>
        <tr>
          <th className="tm-print-th-narrow">{t('committee.export.matchNumber')}</th>
          {showGroup && <th>{t('committee.export.group')}</th>}
          {showRound && <th>{t('committee.export.round')}</th>}
          <th>{t('committee.export.home')}</th>
          <th className="tm-print-th-score">{t('committee.export.score')}</th>
          <th>{t('committee.export.away')}</th>
          <th>{t('committee.export.date')}</th>
          <th>{t('committee.export.terrain')}</th>
          <th>{t('committee.export.status')}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((f, i) => (
          <tr key={f.id ?? i}>
            <td className="tm-print-td-center">{i + 1}</td>
            {showGroup && <td>{f.group?.name || 'â€”'}</td>}
            {showRound && <td>{f.round?.name || 'â€”'}</td>}
            <td>{f.home_team?.name || 'â€”'}</td>
            <td className="tm-print-td-score">{scoreLine(f)}</td>
            <td>{f.away_team?.name || 'â€”'}</td>
            <td>{fmtDateTime(f.scheduled_at, lang)}</td>
            <td>{f.stadium?.name || 'â€”'}</td>
            <td>{t(`committee.detail.matchStatus.${fixtureStatus(f)}`)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FixturesSection({ fixtures }) {
  const { t } = useTranslation()
  if ((fixtures || []).length === 0) return null
  const { groupRounds, koRounds } = buildFixtureSections(fixtures)
  return (
    <section className="tm-print-section tm-print-break">
      <SectionHeading title="committee.export.section.fixtures" icon="Å " />
      {groupRounds.length === 0 && koRounds.length === 0 ? (
        <EmptyRow label="committee.export.noFixtures" />
      ) : (
        <>
          {groupRounds.map((r) => (
            <div key={r.key} className="tm-print-subsection">
              <h3>{t('committee.detail.round', { n: r.matchday })}</h3>
              <FixturesTable items={r.items} showGroup />
            </div>
          ))}
          {koRounds.map((r) => (
            <div key={r.key} className="tm-print-subsection">
              <h3>{r.name}</h3>
              <FixturesTable items={r.items} showRound />
            </div>
          ))}
        </>
      )}
    </section>
  )
}

function EventChip({ event }) {
  const { t } = useTranslation()
  const type = eventTypeKey(event.type)
  if (!type) return null
  return (
    <span className={`tm-print-event tm-print-event-${type}`}>
      {event.minute != null && <span className="tm-print-event-minute">{event.minute}{event.added_time ? `+${event.added_time}` : ''}'</span>}
      <span className="tm-print-event-label">{t(`committee.export.event.${type}`)}</span>
      <span className="tm-print-event-player">{event.player?.name || event.description || ''}</span>
      {event.assist_player?.name && <span className="tm-print-event-assist">({event.assist_player.name})</span>}
    </span>
  )
}

function ResultsSection({ fixtures, eventsMap }) {
  const { t } = useTranslation()
  const lang = currentLang()
  const finished = (fixtures || [])
    .filter((f) => f.match?.status === 'finished')
    .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
  if (finished.length === 0) return null
  return (
    <section className="tm-print-section tm-print-break">
      <SectionHeading title="committee.export.section.results" icon="Ã“" />
      <div className="tm-print-results">
        {finished.map((f) => {
          const events = eventsMap.get(f.id) || []
          const winner = matchWinner(f)
          return (
            <div key={f.id} className="tm-print-result">
              <div className="tm-print-result-head">
                <span className="tm-print-result-round">
                  {f.round?.name || (f.group?.name ? `${t('committee.export.group')} ${f.group.name}` : t('committee.detail.round', { n: f.matchday }))}
                </span>
                <span className="tm-print-result-date">{fmtDateTime(f.scheduled_at, lang)}</span>
              </div>
              <div className="tm-print-result-score">
                <span className="tm-print-result-team">{f.home_team?.name || 'â€”'}</span>
                <span className="tm-print-result-num">{scoreLine(f)}</span>
                <span className="tm-print-result-team">{f.away_team?.name || 'â€”'}</span>
              </div>
              <div className="tm-print-result-meta">
                <span className="tm-print-result-winner">{t('committee.export.winner')}: <b>{winner || 'â€”'}</b></span>
                {f.stadium?.name && <span className="tm-print-result-stadium">{f.stadium.name}</span>}
              </div>
              {events.length > 0 && (
                <div className="tm-print-result-events">
                  <span className="tm-print-result-events-label">{t('committee.export.events')}:</span>
                  <div className="tm-print-result-events-list">
                    {events.map((ev, i) => (
                      <EventChip key={ev.id ?? i} event={ev} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function StandingsSection({ standings }) {
  const { t } = useTranslation()
  const groups = standings?.groups || []
  if (groups.length === 0) return null
  const cols = ['played', 'wins', 'draws', 'losses', 'gf', 'ga', 'gd', 'points']
  return (
    <section className="tm-print-section tm-print-break">
      <SectionHeading title="committee.export.section.standings" icon="â€¡" />
      {groups.map((group) => (
        <div key={group.group_id ?? 'unassigned'} className="tm-print-subsection">
          <h3>{group.name || t('committee.export.allTeams')}</h3>
          <table className="tm-print-table">
            <thead>
              <tr>
                <th className="tm-print-th-narrow">{t('committee.export.position')}</th>
                <th>{t('committee.export.team')}</th>
                {cols.map((c) => (
                  <th key={c} className="tm-print-th-narrow">{t(`committee.detail.col.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(group.rows || []).map((row, i) => (
                <tr key={row.team_id ?? i}>
                  <td className="tm-print-td-center">{i + 1}</td>
                  <td>
                    <span className="tm-print-team">
                      {row.team?.logo_url && <img src={logoThumb(row.team)} alt="" className="tm-print-logo-sm" />}
                      <span>{row.team?.name || 'â€”'}</span>
                    </span>
                  </td>
                  <td className="tm-print-td-center">{row.played}</td>
                  <td className="tm-print-td-center">{row.wins}</td>
                  <td className="tm-print-td-center">{row.draws}</td>
                  <td className="tm-print-td-center">{row.losses}</td>
                  <td className="tm-print-td-center">{row.goals_for}</td>
                  <td className="tm-print-td-center">{row.goals_against}</td>
                  <td className="tm-print-td-center">{row.goal_difference >= 0 ? '+' : ''}{row.goal_difference}</td>
                  <td className="tm-print-td-center">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  )
}

function RankTable({ titleKey, items, emptyKey }) {
  const { t } = useTranslation()
  const list = items || []
  return (
    <div className="tm-print-subsection">
      <h3>{t(titleKey)}</h3>
      {list.length === 0 ? (
        <EmptyRow label={emptyKey} />
      ) : (
        <table className="tm-print-table">
          <thead>
            <tr>
              <th className="tm-print-th-narrow">{t('committee.export.position')}</th>
              <th>{t('committee.export.player')}</th>
              <th>{t('committee.export.team')}</th>
              <th className="tm-print-th-narrow">{t('committee.export.goals')}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row, i) => (
              <tr key={row.player_id ?? i}>
                <td className="tm-print-td-center">{i + 1}</td>
                <td>{row.name || 'â€”'}</td>
                <td>{row.team_name || 'â€”'}</td>
                <td className="tm-print-td-center">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function CardTable({ titleKey, items, emptyKey }) {
  const { t } = useTranslation()
  const list = items || []
  return (
    <div className="tm-print-subsection">
      <h3>{t(titleKey)}</h3>
      {list.length === 0 ? (
        <EmptyRow label={emptyKey} />
      ) : (
        <table className="tm-print-table">
          <thead>
            <tr>
              <th className="tm-print-th-narrow">{t('committee.export.position')}</th>
              <th>{t('committee.export.player')}</th>
              <th>{t('committee.export.team')}</th>
              <th className="tm-print-th-narrow">{t('committee.export.goals')}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row, i) => (
              <tr key={row.player_id ?? i}>
                <td className="tm-print-td-center">{i + 1}</td>
                <td>{row.name || 'â€”'}</td>
                <td>{row.team_name || 'â€”'}</td>
                <td className="tm-print-td-center">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Highlights({ statistics }) {
  const { t } = useTranslation()
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
    <div className="tm-print-grid">
      {items.map((item) => (
        <div key={item.label} className="tm-print-info-item">
          <span className="tm-print-info-label">{item.label}</span>
          <span className="tm-print-info-value">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function ScorersSection({ statistics }) {
  const s = statistics || {}
  const hasData = (s.summary?.matches_played ?? 0) > 0 || (s.top_scorers || []).length > 0
  if (!hasData) return null
  return (
    <section className="tm-print-section tm-print-break">
      <SectionHeading title="committee.export.section.scorers" icon="ÃŸ" />
      <Highlights statistics={s} />
      <RankTable titleKey="committee.export.goals" items={s.top_scorers} emptyKey="committee.export.noScorers" />
      <RankTable titleKey="committee.export.assists" items={s.top_assists} emptyKey="committee.export.noScorers" />
      <CardTable titleKey="committee.export.yellowCards" items={s.yellow_cards} emptyKey="committee.export.noScorers" />
      <CardTable titleKey="committee.export.redCards" items={s.red_cards} emptyKey="committee.export.noScorers" />
    </section>
  )
}

function NewsSection({ news }) {
  const lang = currentLang()
  const list = news || []
  if (list.length === 0) return null
  return (
    <section className="tm-print-section tm-print-break">
      <SectionHeading title="committee.export.section.news" icon="â€ž" />
      {list.length === 0 ? (
        <EmptyRow label="committee.export.noNews" />
      ) : (
        <div className="tm-print-news">
          {list.map((item) => (
            <article key={item.id} className="tm-print-news-item">
              {item.cover_thumbnail_url && <img src={coverThumb(item)} alt="" className="tm-print-news-img" />}
              <div>
                <h3>{item.title || 'â€”'}</h3>
                <p className="tm-print-news-date">{fmtDateTime(item.published_at, lang)}</p>
                <p className="tm-print-news-content">{item.content || ''}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function GallerySection({ gallery }) {
  const list = gallery || []
  if (list.length === 0) return null
  return (
    <section className="tm-print-section">
      <SectionHeading title="committee.export.section.gallery" icon="â‰ˆ" />
      {list.length === 0 ? (
        <EmptyRow label="committee.export.noGallery" />
      ) : (
        <div className="tm-print-gallery">
          {list.map((img) => (
            <figure key={img.id} className="tm-print-gallery-item">
              <img src={img.thumbnail_url || img.image_url} alt={img.caption || ''} />
              {img.caption && <figcaption>{img.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </section>
  )
}

function LogoRow({ name, logoUrl, level, link }) {
  return (
    <div className="tm-print-partner">
      {logoUrl && <img src={logoUrl} alt="" className="tm-print-partner-logo" />}
      <div>
        <p className="tm-print-partner-name">{name || 'â€”'}</p>
        {level && <p className="tm-print-partner-level">{level}</p>}
        {link && <p className="tm-print-partner-link">{link}</p>}
      </div>
    </div>
  )
}

function PartnersSection({ sponsors, partners }) {
  const s = sponsors || []
  const p = partners || []
  if (s.length === 0 && p.length === 0) return null
  return (
    <section className="tm-print-section">
      <SectionHeading title="committee.export.section.sponsors" icon="Â¶" />
      {s.length === 0 && p.length === 0 ? (
        <EmptyRow label="committee.export.noSponsors" />
      ) : (
        <div className="tm-print-partners">
          {s.map((sp) => (
            <LogoRow key={sp.id} name={sp.name} logoUrl={sp.logo_url} level={sp.level} link={sp.link} />
          ))}
          {p.map((pt) => (
            <LogoRow key={pt.id} name={pt.name} logoUrl={pt.logo_url} link={pt.link} />
          ))}
        </div>
      )}
    </section>
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
    <section className="tm-print-section">
      <SectionHeading title="committee.export.section.contact" icon="â‰ˆ" />
      {!hasRows && socials.length === 0 ? (
        <EmptyRow label="committee.export.noContact" />
      ) : (
        <div className="tm-print-grid">
          {rows.map((row) => (
            <InfoItem key={row.key} label={`committee.export.${row.key}`} value={row.value} />
          ))}
          {socials.map((s) => (
            <InfoItem key={s.key} label={s.key} value={s.value} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function TournamentExportSheet({ data }) {
  const { t } = useTranslation()
  const lang = currentLang()
  const { tournament, teams, fixtures, standings, statistics, news, gallery, sponsors, partners, contact, eventsMap } = data || {}

  if (!tournament) return null

  const logo = tournament.logo_url
  const statusKey = statusLabels[tournament.status] ? t(statusLabels[tournament.status]) : tournament.status
  const now = new Intl.DateTimeFormat(lang.startsWith('ar') ? 'ar-MA' : 'en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  return (
    <div className="tm-print-sheet">
      <header className="tm-print-header">
        <div className="tm-print-header-logo">
          {logo ? (
            <img src={logo} alt="" />
          ) : (
            <span className="tm-print-header-logo-fallback">{tournament.name?.charAt(0) || 'T'}</span>
          )}
        </div>
        <div className="tm-print-header-title">
          <h1>{tournament.name}</h1>
          <p>
            {[tournament.edition, tournament.category].filter(Boolean).join(' â€” ')}
            {tournament.organizer?.name ? ` â€¢ ${tournament.organizer.name}` : ''}
          </p>
          <p className="tm-print-header-sub">
            {tournament.location ? `${tournament.location} â€¢ ` : ''}
            {fmtDate(tournament.start_date, lang)}{tournament.end_date ? ` â€” ${fmtDate(tournament.end_date, lang)}` : ''} â€¢ {statusKey}
          </p>
        </div>
      </header>

      <DetailsSection tournament={tournament} />
      <TeamsSection teams={teams} />
      <FixturesSection fixtures={fixtures} />
      <ResultsSection fixtures={fixtures} eventsMap={eventsMap} />
      <StandingsSection standings={standings} />
      <ScorersSection statistics={statistics} />
      <NewsSection news={news} />
      <GallerySection gallery={gallery} />
      <PartnersSection sponsors={sponsors} partners={partners} />
      <ContactSection contact={contact} />

      <footer className="tm-print-footer">
        <span>Aji Nkassrou</span>
        <span>{t('committee.export.generatedOn')}: {now}</span>
      </footer>
    </div>
  )
}
