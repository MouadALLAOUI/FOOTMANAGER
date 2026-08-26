import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  MapPin,
  Building2,
  Users,
  User,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import DataTable from '../../../components/admin/DataTable'
import {
  PageHeader,
  Button,
  Field,
  Input,
  StatusBadge,
  cn,
} from '../../../components/admin/ui'
import { Modal } from '../../../components/dashboard/ui'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import { toast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import SectionError from '../../../components/errors/SectionError'

const EMPTY_FORM = {
  name: '',
  name_ar: '',
  name_fr: '',
  name_en: '',
  sort_order: 0,
}

export default function Cities() {
  const { t } = useTranslation()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const confirm = useConfirm()

  const params = useMemo(() => {
    const p = { page, per_page: 15 }
    if (search) p.search = search
    if (statusFilter !== 'all') p.status = statusFilter
    return p
  }, [page, search, statusFilter])

  const { data, loading, errorState, refetch } = useApi(
    () => api.get('/admin/cities', { params }).then((r) => r.data),
    [params],
    { keepPrevious: true },
  )

  const cities = data?.data || []
  const total = data?.total || 0
  const lastPage = data?.last_page || 1
  const perPage = data?.per_page || 15

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const activeCount = useMemo(() => {
    if (!data?.total) return 0
    if (statusFilter === 'active') return total
    return undefined
  }, [data, total, statusFilter])

  const hiddenCount = useMemo(() => {
    if (!data?.total) return 0
    if (statusFilter === 'hidden') return total
    return undefined
  }, [data, total, statusFilter])

  const filterTabs = useMemo(() => {
    const tabs = [
      { value: 'all', label: 'الكل' },
      { value: 'active', label: 'نشطة' },
      { value: 'hidden', label: 'مخفي' },
    ]
    if (activeCount !== undefined) {
      tabs[1].count = activeCount
    }
    if (hiddenCount !== undefined) {
      tabs[2].count = hiddenCount
    }
    return tabs
  }, [activeCount, hiddenCount])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setFormOpen(true)
  }

  const openEdit = (city) => {
    setEditing(city)
    setForm({
      name: city.name || '',
      name_ar: city.name_ar || '',
      name_fr: city.name_fr || '',
      name_en: city.name_en || '',
      sort_order: city.sort_order || 0,
    })
    setErrors({})
    setFormOpen(true)
  }

  const submitForm = async () => {
    setBusy(true)
    setErrors({})
    try {
      if (editing) {
        const res = await api.put(`/admin/cities/${editing.id}`, form)
        toast.success(res.data.message || 'تم تحديث المدينة بنجاح')
      } else {
        const res = await api.post('/admin/cities', form)
        toast.success(res.data.message || 'تمت إضافة المدينة بنجاح')
      }
      setFormOpen(false)
      refetch()
    } catch (e) {
      if (e.response?.status === 422 && e.response?.data?.errors) {
        setErrors(e.response.data.errors)
      }
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = useCallback(
    (city) => {
      const action = async () => {
        try {
          const res = await api.patch(`/admin/cities/${city.id}/toggle-active`)
          toast.success(res.data.message)
          refetch()
        } catch (e) {
          toastApiError(e, t)
        }
      }

      if (city.is_active) {
        confirm.run(action, {
          title: 'إخفاء المدينة',
          description: `هل أنت متأكد من إخفاء "${city.name}"؟ لن تظهر المدينة في القوائم المعتادة.`,
          confirmLabel: 'إخفاء',
          tone: 'danger',
          icon: EyeOff,
        })
      } else {
        confirm.run(action, {
          title: 'إظهار المدينة',
          description: `هل تريد إظهار "${city.name}" مرة أخرى؟`,
          confirmLabel: 'إظهار',
          tone: 'default',
          icon: Eye,
        })
      }
    },
    [confirm, refetch, t],
  )

  const deleteCity = useCallback(
    (city) => {
      const action = async () => {
        try {
          const res = await api.delete(`/admin/cities/${city.id}`)
          toast.success(res.data.message || 'تم حذف المدينة بنجاح')
          refetch()
        } catch (e) {
          toastApiError(e, t)
        }
      }

      confirm.run(action, {
        title: 'حذف المدينة',
        description: `هل أنت متأكد من حذف "${city.name}" نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`,
        confirmLabel: 'حذف',
        tone: 'danger',
        icon: Trash2,
      })
    },
    [confirm, refetch, t],
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'المدينة',
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-green-500/15 to-emerald-500/15">
              <MapPin className="size-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{row.name}</p>
              {row.name_ar && row.name_ar !== row.name && (
                <p className="truncate text-xs text-slate-500">{row.name_ar}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'is_active',
        label: 'الحالة',
        render: (row) => (
          <StatusBadge status={row.is_active ? 'active' : 'hidden'} />
        ),
      },
      {
        key: 'stadiums_count',
        label: 'الملاعب',
        render: (row) => (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Building2 className="size-3.5 text-slate-400" />
            <span className="text-sm font-semibold">{row.stadiums_count || 0}</span>
          </div>
        ),
      },
      {
        key: 'teams_count',
        label: 'الفرق',
        render: (row) => (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Users className="size-3.5 text-slate-400" />
            <span className="text-sm font-semibold">{row.teams_count || 0}</span>
          </div>
        ),
      },
      {
        key: 'players_count',
        label: 'اللاعبون',
        render: (row) => (
          <div className="flex items-center gap-1.5 text-slate-600">
            <User className="size-3.5 text-slate-400" />
            <span className="text-sm font-semibold">{row.players_count || 0}</span>
          </div>
        ),
      },
      {
        key: 'actions',
        label: '',
        className: 'w-40',
        render: (row) => (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="!h-8 !px-2.5"
              onClick={() => openEdit(row)}
              title={t('common.edit', 'تعديل')}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant={row.is_active ? 'softAmber' : 'soft'}
              size="sm"
              className="!h-8 !px-2.5"
              onClick={() => toggleActive(row)}
              title={row.is_active ? 'إخفاء' : 'إظهار'}
            >
              {row.is_active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
            <Button
              variant="softRed"
              size="sm"
              className="!h-8 !px-2.5"
              onClick={() => deleteCity(row)}
              title={t('common.delete', 'حذف')}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [t, openEdit, toggleActive, deleteCity],
  )

  const formErrors = (field) => errors[field]?.[0] || null

  return (
    <div>
      <PageHeader
        title="المدن"
        subtitle="إدارة المدن والمواقع الجغرافية"
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            إضافة مدينة
          </Button>
        }
      />

      {errorState ? (
        <SectionError state={errorState} onRetry={refetch} />
      ) : (
        <DataTable
          rows={cities}
          loading={loading}
          columns={columns}
          rowKey="id"
          filterTabs={filterTabs}
          tabValue={statusFilter}
          onTabChange={setStatusFilter}
          search={search}
          onSearch={setSearch}
          searchPlaceholder="بحث عن مدينة..."
          page={page}
          lastPage={lastPage}
          total={total}
          perPage={perPage}
          onPageChange={setPage}
          emptyTitle="لا توجد مدن"
          emptyDescription="أضف أول مدينة لإدارة المواقع الجغرافية."
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'تعديل المدينة' : 'إضافة مدينة جديدة'}
        subtitle={editing ? `تعديل بيانات "${editing.name}"` : 'أضف مدينة جديدة للمنصة'}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {t('common.cancel', 'إلغاء')}
            </Button>
            <Button loading={busy} onClick={submitForm}>
              {busy ? 'جارٍ الحفظ...' : t('common.save', 'حفظ')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="الاسم (افتراضي)" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: الدار البيضاء"
              className={cn(formErrors('name') && '!border-rose-400')}
            />
            {formErrors('name') && (
              <span className="mt-1 block text-xs text-rose-500">{formErrors('name')}</span>
            )}
          </Field>

          <Field label="الاسم بالعربية">
            <Input
              value={form.name_ar}
              onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
              placeholder="الدار البيضاء"
            />
          </Field>

          <Field label="الاسم بالفرنسية">
            <Input
              value={form.name_fr}
              onChange={(e) => setForm((f) => ({ ...f, name_fr: e.target.value }))}
              placeholder="Casablanca"
            />
          </Field>

          <Field label="الاسم بالإنجليزية">
            <Input
              value={form.name_en}
              onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
              placeholder="Casablanca"
            />
          </Field>

          <Field label="الترتيب" hint="رقم أصغر يظهر أولاً">
            <Input
              type="number"
              min="0"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              className="w-32"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.close}
        onConfirm={confirm.confirm}
        title={confirm.options.title}
        description={confirm.options.description}
        confirmLabel={confirm.options.confirmLabel}
        tone={confirm.options.tone || 'danger'}
        icon={confirm.options.icon}
        loading={confirm.loading}
      />
    </div>
  )
}
