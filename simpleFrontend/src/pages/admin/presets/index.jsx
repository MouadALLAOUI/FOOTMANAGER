import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ImagePlus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
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

const CATEGORIES = ['team_logo', 'profile_avatar']

const emptyForm = () => ({
  name: '',
  category: 'team_logo',
})

export default function Presets() {
  const { t } = useTranslation()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const fileRef = useRef(null)
  const confirm = useConfirm()

  const params = useMemo(() => {
    const p = { page, per_page: 15 }
    if (search) p.search = search
    if (statusFilter !== 'all') p.status = statusFilter
    if (categoryFilter !== 'all') p.category = categoryFilter
    return p
  }, [page, search, statusFilter, categoryFilter])

  const { data, loading, errorState, refetch } = useApi(
    () => api.get('/admin/presets', { params }).then((r) => r.data),
    [params],
    { keepPrevious: true },
  )

  const presets = data?.data || []
  const total = data?.total || 0
  const lastPage = data?.last_page || 1
  const perPage = data?.per_page || 15

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, categoryFilter])

  const filterTabs = useMemo(
    () => [
      { value: 'all', label: t('dash.all') },
      { value: 'active', label: t('dash.active2') },
      { value: 'hidden', label: t('dash.hidden') },
    ],
    [t],
  )

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setErrors({})
    setImageFile(null)
    setImagePreview(null)
    setFormOpen(true)
  }

  const openEdit = useCallback(
    (preset) => {
      setEditing(preset)
      setForm({
        name: preset.name || '',
        category: preset.category || 'team_logo',
      })
      setErrors({})
      setImageFile(null)
      setImagePreview(null)
      setFormOpen(true)
    },
    [],
  )

  const onPick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const submitForm = async () => {
    setBusy(true)
    setErrors({})
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('category', form.category)
      if (imageFile) fd.append('image', imageFile)

      if (editing) {
        fd.append('_method', 'PUT')
        await api.post(`/admin/presets/${editing.id}`, fd)
        toast.success(t('admin.presets.updated'))
      } else {
        await api.post('/admin/presets', fd)
        toast.success(t('admin.presets.created'))
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
    (preset) => {
      const action = async () => {
        try {
          const res = await api.patch(`/admin/presets/${preset.id}/toggle-active`)
          toast.success(res.data.message)
          refetch()
        } catch (e) {
          toastApiError(e, t)
        }
      }

      if (preset.is_active) {
        confirm.run(action, {
          title: t('admin.presets.hideTitle'),
          description: t('admin.presets.hideConfirm', { name: preset.name }),
          confirmLabel: t('dash.hide'),
          tone: 'danger',
          icon: EyeOff,
        })
      } else {
        confirm.run(action, {
          title: t('admin.presets.showTitle'),
          description: t('admin.presets.showConfirm', { name: preset.name }),
          confirmLabel: t('dash.show'),
          tone: 'default',
          icon: Eye,
        })
      }
    },
    [confirm, refetch, t],
  )

  const deletePreset = useCallback(
    (preset) => {
      const action = async () => {
        try {
          const res = await api.delete(`/admin/presets/${preset.id}`)
          toast.success(res.data.message || t('admin.presets.deleted'))
          refetch()
        } catch (e) {
          toastApiError(e, t)
        }
      }

      confirm.run(action, {
        title: t('admin.presets.deleteTitle'),
        description: t('admin.presets.deleteConfirm', { name: preset.name }),
        confirmLabel: t('common.delete'),
        tone: 'danger',
        icon: Trash2,
      })
    },
    [confirm, refetch, t],
  )

  const columns = useMemo(
    () => [
      {
        key: 'image',
        label: t('admin.presets.image'),
        render: (row) => (
          <div className="flex items-center gap-3">
            <img
              src={row.image_thumbnail_url || row.image_url}
              alt={row.name}
              loading="lazy"
              className="size-10 shrink-0 rounded-xl bg-slate-100 object-contain ring-1 ring-slate-200"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{row.name}</p>
              <p className="truncate text-[11px] text-slate-400">
                {t(`admin.presets.categories.${row.category}`)}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'sort_order',
        label: t('admin.presets.sort'),
        render: (row) => (
          <span className="text-sm font-semibold text-slate-500">{row.sort_order ?? 0}</span>
        ),
      },
      {
        key: 'is_active',
        label: t('dash.status'),
        render: (row) => <StatusBadge status={row.is_active ? 'active' : 'hidden'} />,
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
              title={row.is_active ? t('dash.hide') : t('dash.show')}
            >
              {row.is_active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
            <Button
              variant="softRed"
              size="sm"
              className="!h-8 !px-2.5"
              onClick={() => deletePreset(row)}
              title={t('common.delete', 'حذف')}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [t, openEdit, toggleActive, deletePreset],
  )

  const formErrors = (field) => errors[field]?.[0] || null
  const shownImage = imagePreview || editing?.image_thumbnail_url || editing?.image_url

  return (
    <div>
      <PageHeader
        title={t('admin.presets.title')}
        subtitle={t('admin.presets.subtitle')}
        actions={
          <Button onClick={openCreate}>
            <ImagePlus className="size-4" />
            {t('admin.presets.add')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {['all', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              categoryFilter === cat
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {t(`admin.presets.categories.${cat}`)}
          </button>
        ))}
      </div>

      {errorState ? (
        <SectionError state={errorState} onRetry={refetch} />
      ) : (
        <DataTable
          rows={presets}
          loading={loading}
          columns={columns}
          rowKey="id"
          filterTabs={filterTabs}
          tabValue={statusFilter}
          onTabChange={setStatusFilter}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={t('admin.presets.searchPlaceholder')}
          page={page}
          lastPage={lastPage}
          total={total}
          perPage={perPage}
          onPageChange={setPage}
          emptyTitle={t('admin.presets.emptyTitle')}
          emptyDescription={t('admin.presets.emptyDesc')}
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('admin.presets.editTitle') : t('admin.presets.newTitle')}
        subtitle={editing ? t('admin.presets.editDesc', { name: editing.name }) : t('admin.presets.newDesc')}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {t('common.cancel', 'إلغاء')}
            </Button>
            <Button loading={busy} onClick={submitForm}>
              {busy ? t('dash.saving') : t('common.save', 'حفظ')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative grid size-24 place-items-center overflow-hidden rounded-3xl bg-slate-100 ring-2 ring-slate-200 transition-colors hover:ring-green-400"
              aria-label={t('admin.presets.chooseImage')}
            >
              {shownImage ? (
                <img src={shownImage} alt={form.name} className="size-full object-contain" />
              ) : (
                <span className="flex flex-col items-center gap-1.5 text-slate-400">
                  <ImagePlus className="size-7" />
                  <span className="text-[10px] font-bold">{t('admin.presets.chooseImage')}</span>
                </span>
              )}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={onPick} />
          {formErrors('image') && (
            <p className="text-center text-xs text-rose-500">{formErrors('image')}</p>
          )}

          <Field label={t('admin.presets.name')} required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={cn(formErrors('name') && '!border-rose-400')}
            />
            {formErrors('name') && (
              <span className="mt-1 block text-xs text-rose-500">{formErrors('name')}</span>
            )}
          </Field>

          <Field label={t('admin.presets.category')} required>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`admin.presets.categories.${c}`)}
                </option>
              ))}
            </select>
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