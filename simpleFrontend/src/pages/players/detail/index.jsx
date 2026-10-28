import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, Home, Search, ShieldAlert, UserX } from 'lucide-react'
import api from '../../../api/client'
import SEO from '../../../components/system/SEO'
import PlayerHeader from './header'
import PlayerStatsGrid from './statsGrid'
import PlayerActiveTournaments from './activeTournaments'
import PlayerTeamCard from './teamCard'
import PlayerShareModal from './shareModal'

function PlayerSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header Skeleton */}
      <div className="h-56 w-full rounded-3xl bg-slate-900/80 border border-slate-800" />
      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800" />
      </div>
      {/* Tournaments Skeleton */}
      <div className="h-44 rounded-3xl bg-slate-900/60 border border-slate-800" />
    </div>
  )
}

function PlayerNotFound({ onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-5">
        <div className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-rose-400 shadow-xl">
          <UserX className="size-10 text-rose-400" />
        </div>
        <span className="absolute -bottom-1 -end-1 grid size-7 place-items-center rounded-full bg-slate-950 border border-slate-800 text-slate-400">
          <ShieldAlert className="size-4" />
        </span>
      </div>

      <h1 className="text-xl sm:text-2xl font-black text-white">
        اللاعب غير موجود
      </h1>
      <p className="mt-2 text-sm text-slate-400 max-w-md">
        عذراً، لم نتمكن من العثور على الملف الشخصي المطلوب. قد يكون المعرّف غير صحيح أو تم تحديث بيانات اللاعب.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
        >
          <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
          <span>العودة للصفحة السابقة</span>
        </button>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white transition-colors shadow-lg shadow-emerald-950/40"
        >
          <Home className="size-4" />
          <span>الرئيسية</span>
        </Link>
      </div>
    </div>
  )
}

export default function PublicPlayerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [player, setPlayer] = useState(null)
  const [stats, setStats] = useState(null)
  const [tournaments, setTournaments] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setNotFound(false)

    api
      .get(`/v1/players/${id}/profile`)
      .then((res) => {
        const d = res.data || {}
        if (!d.player) {
          setNotFound(true)
        } else {
          setPlayer(d.player)
          setStats(d.stats || {})
          setTournaments(d.current_tournaments || [])
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setNotFound(true)
        } else {
          // Attempt fallback route without /profile
          api
            .get(`/v1/players/${id}`)
            .then((res2) => {
              const d2 = res2.data || {}
              if (!d2.player) {
                setNotFound(true)
              } else {
                setPlayer(d2.player)
                setStats(d2.stats || {})
                setTournaments(d2.current_tournaments || [])
              }
            })
            .catch(() => {
              setNotFound(true)
            })
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  const playerName = player?.name || 'الملف الشخصي للاعب'
  const pageTitle = `${playerName} — أجي نقصرو`
  const pageDesc = player
    ? `شاهد بطاقة وإحصائيات اللاعب ${playerName} الرسمية في منصة أجي نقصرو لكرة القدم.`
    : 'الملف الشخصي للاعب وإحصائياته الرسمية المعتمدة في منصة أجي نقصرو.'

  return (
    <>
      <SEO title={pageTitle} description={pageDesc} />

      <main className="min-h-screen bg-[#070B14] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 text-slate-100">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Breadcrumb Navigation */}
          <nav aria-label="مسار التنقل" className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Link to="/" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              <Home className="size-3.5" />
              <span>الرئيسية</span>
            </Link>
            <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180 text-slate-600" />
            <Link to="/matches" className="hover:text-emerald-400 transition-colors">
              اللاعبون
            </Link>
            <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180 text-slate-600" />
            <span className="text-slate-200 truncate">{loading ? '...' : playerName}</span>
          </nav>

          {/* Body Content */}
          {loading ? (
            <PlayerSkeleton />
          ) : notFound ? (
            <PlayerNotFound onBack={() => navigate(-1)} />
          ) : (
            <>
              {/* Header */}
              <PlayerHeader
                player={player}
                onShareClick={() => setShareOpen(true)}
              />

              {/* Verified Performance Stats Grid */}
              <PlayerStatsGrid stats={stats} />

              {/* Active Tournaments Section */}
              <PlayerActiveTournaments tournaments={tournaments} />

              {/* Team Information Card */}
              <PlayerTeamCard player={player} />

              {/* Share 9:16 Vertical Card Modal */}
              <PlayerShareModal
                isOpen={shareOpen}
                onClose={() => setShareOpen(false)}
                player={player}
                stats={stats}
              />
            </>
          )}
        </div>
      </main>
    </>
  )
}
