import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Edit3, Trash2, Shield, Eye, EyeOff, Check, X } from 'lucide-react'
import api from '../../../api/client'
import { PageHeader, Button, StatusBadge, Avatar, Skeleton } from '../../../components/admin/ui'
import { toast } from '../../../components/ui/Toast'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import { toastApiError } from '../../../lib/errors'

function PermissionBadge({ slug }) {
  return (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
      {slug}
    </span>
  )
}

function SubAdminForm({ permissions, onSubmit, onCancel, loading, initial }) {
  const [name, setName] = useState(initial?.name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [password, setPassword] = useState('')
  const [selectedPerms, setSelectedPerms] = useState(initial?.permissions || [])

  const groups = {}
  permissions.forEach((p) => {
    if (!groups[p.group]) groups[p.group] = []
    groups[p.group].push(p)
  })

  const togglePerm = (slug) => {
    setSelectedPerms((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { name, email: email || null, phone, permissions: selectedPerms }
    if (!initial && password) payload.password = password
    if (initial && password) payload.password = password
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">الاسم</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">البريد الإلكتروني</label>
        <input
          type="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">الهاتف</label>
        <input
          type="text"
          dir="ltr"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">
          {initial ? 'كلمة المرور الجديدة (اترك فارغاً للاحتفاظ بالحالية)' : 'كلمة المرور'}
        </label>
        <input
          type="password"
          required={!initial}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold text-slate-600">الصلاحيات</label>
        <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-slate-100 p-3">
          {Object.entries(groups).map(([group, perms]) => (
            <div key={group}>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {perms.map((p) => {
                  const active = selectedPerms.includes(p.slug)
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => togglePerm(p.slug)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                        active
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {active && <Check className="size-3" />}
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {selectedPerms.length === 0 && (
          <p className="mt-1.5 text-[11px] font-bold text-red-500">اختر صلاحية واحدة على الأقل</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" loading={loading} disabled={selectedPerms.length === 0}>
          {initial ? 'حفظ التغييرات' : 'إنشاء الحساب'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>إلغاء</Button>
      </div>
    </form>
  )
}

export default function SubAdmins() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewPerms, setViewPerms] = useState(null)

  const { data: permsData } = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => api.get('/admin/permissions').then((r) => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sub-admins'],
    queryFn: () => api.get('/admin/sub-admins').then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (payload) => api.post('/admin/sub-admins', payload),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'sub-admins'] })
      setShowForm(false)
    },
    onError: (e) => toastApiError(e, t),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/admin/sub-admins/${id}`, payload),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'sub-admins'] })
      setEditing(null)
    },
    onError: (e) => toastApiError(e, t),
  })

  const updatePermsMut = useMutation({
    mutationFn: ({ id, permissions }) => api.put(`/admin/sub-admins/${id}/permissions`, { permissions }),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'sub-admins'] })
    },
    onError: (e) => toastApiError(e, t),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => api.put(`/admin/sub-admins/${id}/status`, { status }),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'sub-admins'] })
    },
    onError: (e) => toastApiError(e, t),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/admin/sub-admins/${id}`),
    onSuccess: (res) => {
      toast.success(res.data.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'sub-admins'] })
    },
    onError: (e) => toastApiError(e, t),
  })

  const subAdmins = data?.sub_admins || []
  const permissions = permsData?.permissions || []

  const handleDelete = (sa) => {
    confirm.run(() => deleteMut.mutate(sa.id), {
      title: 'حذف المسؤول الفرعي؟',
      description: `سيتم حذف حساب «${sa.name}» نهائياً.`,
      confirmLabel: 'حذف',
    })
  }

  const handleStatus = (sa) => {
    const newStatus = sa.status === 'approved' ? 'blocked' : 'approved'
    const label = newStatus === 'blocked' ? 'حظر' : 'تفعيل'
    confirm.run(() => statusMut.mutate({ id: sa.id, status: newStatus }), {
      title: `${label} المسؤول الفرعي؟`,
      description: `سيتم ${label} حساب «${sa.name}».`,
      confirmLabel: label,
    })
  }

  return (
    <div>
      <PageHeader
        title="المسؤولون الفرعيون"
        subtitle="إدارة حسابات المسؤولين الفرعيين وصلاحياتهم"
        action={
          <Button onClick={() => { setShowForm(true); setEditing(null) }}>
            <UserPlus className="size-4" />
            إضافة مسؤول فرعي
          </Button>
        }
      />

      {(showForm || editing) && (
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-black text-slate-900">
            {editing ? 'تعديل المسؤول الفرعي' : 'إضافة مسؤول فرعي جديد'}
          </h3>
          <SubAdminForm
            permissions={permissions}
            initial={editing}
            loading={createMut.isPending || updateMut.isPending}
            onSubmit={(payload) => {
              if (editing) {
                updateMut.mutate({ id: editing.id, ...payload })
              } else {
                createMut.mutate(payload)
              }
            }}
            onCancel={() => { setShowForm(false); setEditing(null) }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}
        </div>
      ) : subAdmins.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <UserPlus className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">{t('emptyStates.noSubAdmins')}</p>
          <p className="mt-1 text-xs text-slate-400">{t('emptyStates.noSubAdminsDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subAdmins.map((sa) => (
            <div key={sa.id} className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-4 transition-shadow hover:shadow-md">
              <Avatar name={sa.name} className="size-12" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{sa.name}</p>
                  <StatusBadge status={sa.status} />
                </div>
                <p className="mt-0.5 text-xs text-slate-400" dir="ltr">{sa.phone}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {sa.permissions.slice(0, 5).map((slug) => (
                    <PermissionBadge key={slug} slug={slug} />
                  ))}
                  {sa.permissions.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setViewPerms(sa)}
                      className="text-[11px] font-bold text-green-600 hover:text-green-700"
                    >
                      +{sa.permissions.length - 5} المزيد
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setViewPerms(sa)}>
                  <Eye className="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(sa); setShowForm(false) }}>
                  <Edit3 className="size-3.5" />
                </Button>
                <Button size="sm" variant={sa.status === 'approved' ? 'softRed' : 'soft'} onClick={() => handleStatus(sa)}>
                  {sa.status === 'approved' ? 'حظر' : 'تفعيل'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(sa)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewPerms && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewPerms(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">صلاحيات {viewPerms.name}</h3>
              <button onClick={() => setViewPerms(null)} className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              {viewPerms.permissions.map((slug) => (
                <div key={slug} className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2">
                  <Shield className="size-3.5 text-green-600" />
                  <span className="text-sm font-bold text-green-700">{slug}</span>
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full" variant="ghost" onClick={() => setViewPerms(null)}>إغلاق</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title={confirm.options.title}
        description={confirm.options.description}
        confirmLabel={confirm.options.confirmLabel}
        onConfirm={confirm.confirm}
        onClose={confirm.close}
      />
    </div>
  )
}
