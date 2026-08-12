import { useState } from 'react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { Card, Spinner, StatusBadge, Button, Empty, inputClass } from './ui'

const tabs = ['pending', 'approved', 'rejected', 'blocked', 'all']

export default function ApprovalList({ endpoint, dataKey, searchable = true }) {
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const { data, loading, refetch } = useApi(() =>
    api.get(endpoint, { params: { status: status === 'all' ? 'all' : status, search } }).then((r) => r.data),
    [endpoint, status, search],
  )

  const list = data?.[dataKey] || []

  const act = async (id, action) => {
    setBusyId(id)
    try {
      await api.put(`${endpoint}/${id}/${action}`)
      refetch()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setStatus(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${status === t ? 'bg-green-500 text-white' : 'text-white/50 hover:text-white'}`}
            >
              {t === 'pending' && 'بانتظار الموافقة'}
              {t === 'approved' && 'مفعلون'}
              {t === 'rejected' && 'مرفوضون'}
              {t === 'blocked' && 'محظورون'}
              {t === 'all' && 'الكل'}
            </button>
          ))}
        </div>
        {searchable && (
          <input
            className={inputClass}
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Card>
          <Empty title="لا توجد حسابات في هذه الحالة" />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((u) => (
            <Card key={u.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-white/5 text-base font-extrabold text-white">
                    {u.name?.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-white">{u.name}</p>
                    <p className="text-[11px] text-white/50" dir="ltr">{u.phone}</p>
                    <p className="text-[11px] text-white/40" dir="ltr">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={u.status} />
                  {u.status === 'pending' && (
                    <>
                      <Button className="!px-3 !py-1.5 text-xs" disabled={busyId === u.id} onClick={() => act(u.id, 'approve')}>
                        قبول
                      </Button>
                      <Button variant="outline" className="!px-3 !py-1.5 text-xs !text-red-400" disabled={busyId === u.id} onClick={() => act(u.id, 'reject')}>
                        رفض
                      </Button>
                    </>
                  )}
                  {u.status === 'approved' && (
                    <Button variant="outline" className="!px-3 !py-1.5 text-xs !text-red-400" disabled={busyId === u.id} onClick={() => act(u.id, 'block')}>
                      حظر
                    </Button>
                  )}
                  {u.status === 'blocked' && (
                    <Button variant="outline" className="!px-3 !py-1.5 text-xs !text-green-400" disabled={busyId === u.id} onClick={() => act(u.id, 'unblock')}>
                      إلغاء الحظر
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
