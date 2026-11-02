import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  Trash2,
  Lock,
  Trophy,
  Users,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
  AlertCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { PageHeader, Button, Badge } from '../../../components/admin/ui'
import DataTable from '../../../components/admin/DataTable'
import { TeamAvatar } from '../../tournaments/shared'
import { toast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import StatsCards from './statsCards'
import DeleteTeamModal from './deleteTeamModal'

export default function AdminTeams() {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [stats, setStats] = useState({ total: 0, free: 0, manager: 0 })
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 })

  const [typeTab, setTypeTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('id')
  const [sortDir, setSortDir] = useState('desc')

  const [selected, setSelected] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/teams', {
        params: {
          type: typeTab,
          search: search.trim() || undefined,
          page,
          per_page: 15,
          sort_by: sortBy,
          sort_dir: sortDir,
        },
      })
      setTeams(res.data.teams || [])
      setPagination(res.data.pagination || { current_page: 1, last_page: 1, per_page: 15, total: 0 })
      if (res.data.stats) {
        setStats(res.data.stats)
      }
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setLoading(false)
    }
  }, [typeTab, search, page, sortBy, sortDir, t])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const handleDeleteSingle = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      const res = await api.delete(`/admin/teams/${deleteTarget.id}`)
      toast.success(res.data.message || t('adminTeams.deleteSuccess', 'تم حذف الفريق بنجاح'))
      setDeleteTarget(null)
      setSelected((prev) => prev.filter((id) => id !== deleteTarget.id))
      fetchTeams()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setDeleteBusy(false)
    }
  }

  const handleDeleteBulk = async () => {
    if (selected.length === 0) return
    setDeleteBusy(true)
    try {
      const res = await api.post('/admin/teams/bulk-delete', { ids: selected })
      toast.success(res.data.message || t('adminTeams.deleteSuccess', 'تم حذف الفرق بنجاح'))
      setBulkOpen(false)
      setSelected([])
      fetchTeams()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setDeleteBusy(false)
    }
  }

  // Selected teams that are free (eligible for deletion)
  const selectedFreeTeams = teams.filter((team) => selected.includes(team.id) && team.is_free)

  const filterTabs = [
    { value: 'all', label: t('adminTeams.allTeams', 'كل الفرق'), count: stats.total },
    { value: 'free', label: t('adminTeams.freeTeams', 'فرق حرة (للحذف)'), count: stats.free },
    { value: 'manager', label: t('adminTeams.managerTeams', 'فرق المسيرين (محمية)'), count: stats.manager },
  ]

  const columns = [
    {
      key: 'name',
      label: t('adminTeams.team', 'الفريق'),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <TeamAvatar team={row} className="size-10 shrink-0 rounded-2xl shadow-xs" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">{row.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
              {row.association_name && <span>{row.association_name} •</span>}
              <span>ID: #{row.id}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: t('adminTeams.type', 'نوع الفريق'),
      render: (row) => (
        <div>
          {row.is_free ? (
            <Badge tone="amber" className="gap-1 bg-amber-50 text-amber-700 ring-amber-200">
              <Sparkles className="size-3" />
              {t('adminTeams.freeTeamBadge', 'فريق حر')}
            </Badge>
          ) : (
            <Badge tone="green" className="gap-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
              <UserRound className="size-3" />
              {t('adminTeams.managerTeamBadge', 'فريق مسير')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'manager',
      label: t('adminTeams.manager', 'المسير'),
      render: (row) => {
        const managerName = row.manager?.name || row.manager_name
        const managerPhone = row.manager?.phone || row.manager_phone
        if (!managerName) {
          return (
            <span className="text-xs text-slate-400 font-medium">
              {t('adminTeams.noManager', '—')}
            </span>
          )
        }
        return (
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-800">{managerName}</p>
            {managerPhone && (
              <span className="dir-ltr inline-flex items-center gap-1 text-[11px] text-slate-500 font-semibold mt-0.5">
                <Phone className="size-2.5 text-slate-400" />
                {managerPhone}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'city',
      label: t('adminTeams.city', 'المدينة'),
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
          {row.city ? (
            <>
              <MapPin className="size-3.5 text-slate-400" />
              <span>{row.city}</span>
            </>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'tournaments_count',
      label: t('adminTeams.tournaments', 'البطولات والمباريات'),
      render: (row) => (
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1" title="عدد مشاركات البطولات">
            <Trophy className="size-3.5 text-amber-500" />
            <span className="font-bold">{row.tournaments_count || 0}</span>
          </span>
          <span className="inline-flex items-center gap-1" title="المباريات الملعوبة">
            <Users className="size-3.5 text-slate-400" />
            <span className="font-bold">{row.players_count || 0} لاعب</span>
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: t('adminTeams.actions', 'الإجراءات'),
      render: (row) => {
        if (row.is_free) {
          return (
            <Button
              size="sm"
              variant="dangerSoft"
              onClick={() => setDeleteTarget(row)}
              className="gap-1.5"
              title={t('adminTeams.deleteFreeTeam', 'حذف الفريق الحر نهائياً')}
            >
              <Trash2 className="size-3.5" />
              <span>{t('adminTeams.deleteTeam', 'حذف')}</span>
            </Button>
          )
        }
        return (
          <span
            className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-400 ring-1 ring-slate-200/50 cursor-not-allowed"
            title={t('adminTeams.cannotDeleteManagerTeam', 'فرق المسيرين محمية ولا يمكن حذفها من هنا')}
          >
            <Lock className="size-3" />
            <span>محمي</span>
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('adminTeams.title', 'إدارة الفرق')}
        subtitle={t('adminTeams.subtitle', 'عرض وإدارة الفرق المسجلة، وحذف الفرق الحرة لمنع ظهورها في اختيار فرق البطولات')}
        actions={
          selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                محدد: {selected.length} (منها {selectedFreeTeams.length} فرق حرة قابلة للحذف)
              </span>
              <Button
                variant="danger"
                size="sm"
                disabled={selectedFreeTeams.length === 0}
                onClick={() => setBulkOpen(true)}
              >
                <Trash2 className="size-4" />
                {t('adminTeams.bulkDelete', 'حذف الفرق الحرة المحددة')}
              </Button>
            </div>
          )
        }
      />

      {/* Top Banner Notice */}
      <div className="rounded-2xl border border-blue-200/60 bg-blue-50/70 p-4 text-xs font-bold text-blue-900 flex items-start gap-3">
        <AlertCircle className="size-5 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <p className="font-black text-blue-950 mb-0.5">ملاحظة تنظيمية للبطولات والفرق</p>
          <p className="text-blue-800/90 font-normal leading-relaxed">
            الفرق التي تم إنشاؤها كفرق حرة (بدون حساب مسير) أثناء تنظيم البطولات يمكن حذفها نهائياً من هنا لكي لا تظهر مجدداً في نافذة &quot;إضافة فرق&quot; الخاصة بالبطولات. فرق المسيرين المسجلين محمية بالكامل لمنع التأثير على حساباتهم.
          </p>
        </div>
      </div>

      <StatsCards
        stats={stats}
        activeTab={typeTab}
        onSelectTab={(tab) => {
          setTypeTab(tab)
          setPage(1)
          setSelected([])
        }}
      />

      <DataTable
        rows={teams}
        loading={loading}
        columns={columns}
        rowKey="id"
        filterTabs={filterTabs}
        tabValue={typeTab}
        onTabChange={(v) => {
          setTypeTab(v)
          setPage(1)
          setSelected([])
        }}
        search={search}
        onSearch={(v) => {
          setSearch(v)
          setPage(1)
        }}
        searchPlaceholder={t('adminTeams.searchPlaceholder', 'ابحث باسم الفريق، المدينة، المسير، أو الهاتف...')}
        sortKey={sortBy}
        sortDir={sortDir}
        onSort={(key) => {
          if (sortBy === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
          } else {
            setSortBy(key)
            setSortDir('asc')
          }
        }}
        page={page}
        lastPage={pagination.last_page}
        total={pagination.total}
        perPage={pagination.per_page}
        onPageChange={setPage}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        emptyTitle={t('adminTeams.emptyTitle', 'لا توجد فرق')}
        emptyDescription={t('adminTeams.emptyDesc', 'لم يتم العثور على أي فرق تطابق معايير البحث.')}
      />

      {/* Delete Single Free Team Confirmation */}
      <DeleteTeamModal
        open={Boolean(deleteTarget)}
        team={deleteTarget}
        loading={deleteBusy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSingle}
      />

      {/* Delete Bulk Free Teams Confirmation */}
      <DeleteTeamModal
        open={bulkOpen}
        isBulk
        selectedCount={selectedFreeTeams.length}
        loading={deleteBusy}
        onClose={() => setBulkOpen(false)}
        onConfirm={handleDeleteBulk}
      />
    </div>
  )
}
