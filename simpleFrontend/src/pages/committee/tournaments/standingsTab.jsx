import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Empty, Skeleton } from '../../../components/dashboard/ui'
import { Trophy, Grid3X3, Image as ImageIcon } from 'lucide-react'
import { StandingsTable } from '../../tournaments/shared'
import LeagueResultsMatrixExportModal from './export/LeagueResultsMatrixExportModal'

export default function StandingsTab({ tournament, refreshKey }) {
  const { t } = useTranslation()
  const [matrixModalOpen, setMatrixModalOpen] = useState(false)

  const { data, loading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/standings`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (!data?.groups?.length) {
    return <Empty icon={Trophy} title={t('committee.detail.noStandings')} description={t('committee.detail.noStandingsDesc')} />
  }

  const isLeague = tournament?.tournament_format === 'league'

  return (
    <div className="space-y-4">
      {isLeague && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Grid3X3 className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">
                مصفوفة نتائج مواجهات الدوري
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تصدير ومشاركة صورة شاملة لشبكة نتائج المباريات المباشرة بين كافة الأندية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMatrixModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all shrink-0 self-end sm:self-auto"
          >
            <ImageIcon className="size-4" />
            <span>تصدير صورة المصفوفة</span>
          </button>
        </div>
      )}

      <StandingsTable groups={data.groups} />

      {matrixModalOpen && (
        <LeagueResultsMatrixExportModal
          tournament={tournament}
          standingsData={data}
          onClose={() => setMatrixModalOpen(false)}
        />
      )}
    </div>
  )
}
