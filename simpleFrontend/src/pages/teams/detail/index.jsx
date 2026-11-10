import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, Home, Image as ImageIcon, Megaphone, ShieldAlert, ShieldOff } from 'lucide-react'
import SEO from '../../../components/system/SEO'
import MatchDetailModal from '../../tournaments/components/MatchDetailModal'
import { useTeamFullData } from './useTeamFullData'
import TeamHeader from './header'
import TeamStatsGrid from './statsGrid'
import TeamMatchHistory from './matchHistory'
import TeamTournamentHistory from './tournamentHistory'
import TeamRosterSection from './rosterSection'
import TeamShareModal from './shareModal'

function TeamSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-56 w-full rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }, (_, idx) => (
          <div
            key={idx}
            className="h-24 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]"
          />
        ))}
      </div>
      <div className="h-52 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]" />
      <div className="h-44 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]" />
    </div>
  )
}

function TeamNotFound({ onBack }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-16 px-4 text-center shadow-2xs">
      <div className="relative mb-5">
        <div className="grid size-20 place-items-center rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[#D93636] dark:text-[#FF6868]">
          <ShieldOff className="size-10" />
        </div>
        <span className="absolute -bottom-1 -end-1 grid size-7 place-items-center rounded-full border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#65706A] dark:text-[#B2B9B3]">
          <ShieldAlert className="size-4" />
        </span>
      </div>

      <h1 className="text-xl sm:text-2xl font-black text-[#111313] dark:text-[#F5F7F2]">
        الفريق غير موجود
      </h1>
      <p className="mt-2 text-xs sm:text-sm text-[#65706A] dark:text-[#B2B9B3] max-w-md">
        عذراً، لم نتمكن من العثور على ملف الفريق المطلوب. قد يكون المعرّف غير صحيح أو تم تحديث بيانات الفريق.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] hover:bg-[#E1E5DF]/50 dark:hover:bg-[#303832] px-5 py-2.5 text-xs font-black text-[#111313] dark:text-[#F5F7F2] transition-colors cursor-pointer"
        >
          <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
          <span>العودة للصفحة السابقة</span>
        </button>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#B8F000] dark:bg-[#D0FF38] hover:brightness-95 px-5 py-2.5 text-xs font-black text-[#111313] transition-all"
        >
          <Home className="size-4" />
          <span>الرئيسية</span>
        </Link>
      </div>
    </div>
  )
}

export default function PublicTeamDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shareOpen, setShareOpen] = useState(false)
  const [openMatch, setOpenMatch] = useState(null)

  const {
    loading,
    notFound,
    isPrivate,
    error,
    team,
    stats,
    squad,
    matches,
    tournaments,
    weeklyBookings,
    announcements,
    gallery,
    form,
  } = useTeamFullData(id)

  useEffect(() => {
    document.body.style.overflow = ''
    setShareOpen(false)
    setOpenMatch(null)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [id])

  const teamName = team?.name || 'ملف الفريق'
  const pageTitle = `${teamName} — أجي نقصرو`
  const pageDesc = team
    ? `شاهد ملف وإحصائيات وسجل مباريات فريق ${teamName} الرسمية في منصة أجي نقصرو لكرة القدم.`
    : 'ملف الفريق وإحصائياته الرسمية وسجل مبارياته ومشاركاته في منصة أجي نقصرو.'

  return (
    <>
      <SEO title={pageTitle} description={pageDesc} image={team?.logo_url || undefined} />

      <main className="min-h-screen bg-[#F7F8F5] dark:bg-[#101211] text-[#111313] dark:text-[#F5F7F2] py-5 sm:py-8 px-3 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="مسار التنقل"
            className="flex items-center gap-2 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] min-w-0"
          >
            <Link to="/" className="hover:text-[#179955] dark:hover:text-[#D0FF38] transition-colors flex items-center gap-1 shrink-0">
              <Home className="size-3.5" />
              <span>الرئيسية</span>
            </Link>
            <ChevronLeft className="size-3.5 shrink-0 rtl:rotate-0 ltr:rotate-180" />
            <Link to="/tournaments" className="hover:text-[#179955] dark:hover:text-[#D0FF38] transition-colors shrink-0">
              البطولات والفرق
            </Link>
            <ChevronLeft className="size-3.5 shrink-0 rtl:rotate-0 ltr:rotate-180" />
            <span className="text-[#111313] dark:text-[#F5F7F2] truncate" dir="auto">
              {loading ? '...' : teamName}
            </span>
          </nav>

          {loading ? (
            <TeamSkeleton />
          ) : notFound || error || !team ? (
            <TeamNotFound onBack={() => navigate(-1)} />
          ) : (
            <>
              <TeamHeader
                team={team}
                form={form}
                isPrivate={isPrivate}
                onShareClick={() => setShareOpen(true)}
              />

              <TeamStatsGrid stats={stats} weeklyBookings={weeklyBookings} />

              <TeamMatchHistory matches={matches} onOpenMatch={setOpenMatch} />

              <TeamTournamentHistory tournaments={tournaments} />

              <TeamRosterSection squad={squad} isPrivate={isPrivate} />

              {(announcements.length > 0 || gallery.length > 0) && (
                <section className="grid gap-4 md:grid-cols-2">
                  {announcements.length > 0 && (
                    <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 sm:p-5 shadow-2xs space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="grid size-8 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]">
                          <Megaphone className="size-4" />
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
                          أخبار وإعلانات الفريق
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {announcements.slice(0, 4).map((a) => (
                          <div
                            key={a.id || a.title}
                            className="rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3"
                          >
                            {a.title && (
                              <p className="text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                                {a.title}
                              </p>
                            )}
                            {a.content && (
                              <p className="mt-1 text-xs text-[#65706A] dark:text-[#B2B9B3] leading-relaxed">
                                {a.content}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {gallery.length > 0 && (
                    <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 sm:p-5 shadow-2xs space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="grid size-8 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]">
                          <ImageIcon className="size-4" />
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
                          معرض الصور
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {gallery.slice(0, 6).map((g, idx) => (
                          <img
                            key={g.id || idx}
                            src={g.image_url || g.url}
                            alt={g.caption || team.name}
                            className="h-24 w-full rounded-xl object-cover border border-[#E1E5DF] dark:border-[#303832]"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              <MatchDetailModal
                open={Boolean(openMatch)}
                onClose={() => setOpenMatch(null)}
                tournamentKey={openMatch?.tournamentKey}
                fixture={openMatch?.fixture}
              />

              <TeamShareModal
                isOpen={shareOpen}
                onClose={() => setShareOpen(false)}
                team={team}
                stats={stats}
              />
            </>
          )}
        </div>
      </main>
    </>
  )
}
