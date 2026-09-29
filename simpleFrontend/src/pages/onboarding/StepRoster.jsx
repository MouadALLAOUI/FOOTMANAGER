import { useState } from 'react'
import { Users, UserPlus, Trash2, ArrowRight, Shield, AlertTriangle } from 'lucide-react'
import { Button, Field, inputClass } from '../../components/dashboard/ui'

const POSITIONS = [
  { id: 'goalkeeper', label: 'حارس' },
  { id: 'defender', label: 'دفاع' },
  { id: 'midfielder', label: 'وسط' },
  { id: 'forward', label: 'هجوم' },
]

export default function StepRoster({ initialPlayers = [], onNext, onBack, onSkip, busy }) {
  const [players, setPlayers] = useState(initialPlayers || [])
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState('forward')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const handleAddPlayer = (e) => {
    e?.preventDefault?.()
    if (!name.trim()) {
      setError('يرجى إدخال اسم اللاعب')
      return
    }

    let numVal = null
    if (number !== '') {
      numVal = parseInt(number, 10)
      if (isNaN(numVal) || numVal < 1 || numVal > 99) {
        setError('رقم القميص يجب أن يكون بين 1 و 99')
        return
      }
    }

    setError('')

    const newPlayer = {
      name: name.trim(),
      number: numVal,
      position: position || 'forward',
      phone: phone.trim() || null,
    }

    setPlayers((prev) => [...prev, newPlayer])
    setName('')
    setNumber('')
    setPhone('')
  }

  const handleRemovePlayer = (index) => {
    setPlayers((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // If user filled in the input fields but didn't press "Add", auto-add it before submitting
    let finalPlayers = [...players]
    if (name.trim()) {
      let numVal = null
      if (number !== '') {
        numVal = parseInt(number, 10)
        if (isNaN(numVal) || numVal < 1 || numVal > 99) {
          setError('رقم القميص يجب أن يكون بين 1 و 99')
          return
        }
      }

      finalPlayers.push({
        name: name.trim(),
        number: numVal,
        position: position || 'forward',
        phone: phone.trim() || null,
      })
    }

    onNext({
      players: finalPlayers,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600">
            <Users className="size-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">لائحة اللاعبين</h1>
          <p className="mt-1 text-xs text-slate-500">
            أضف أسماء لاعبي فريقك الأساسيين (يمكنك دائماً إضافة البقية لاحقاً)
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-rose-50 p-3.5 text-center text-xs font-bold text-rose-600 ring-1 ring-rose-200">
            {error}
          </div>
        )}

        {/* Quick Add Player Box */}
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 text-start">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <UserPlus className="size-4 text-emerald-600" />
            <span>إضافة لاعب جديد:</span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم اللاعب *"
                className={inputClass}
                dir="auto"
              />
            </div>

            <div className="sm:col-span-3">
              <input
                type="number"
                min="1"
                max="99"
                value={number}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '') {
                    setNumber('')
                    return
                  }
                  const n = parseInt(val, 10)
                  if (!isNaN(n)) {
                    if (n > 99) setNumber('99')
                    else if (n < 1) setNumber('1')
                    else setNumber(String(n))
                  }
                }}
                placeholder="الرقم #"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={handleAddPlayer}
                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                <UserPlus className="size-4" />
                إضافة
              </button>
            </div>
          </div>

          {/* Position Selector */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">المركز:</span>
            {POSITIONS.map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => setPosition(pos.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                  position === pos.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
                }`}
              >
                {pos.label}
              </button>
            ))}

            <div className="ms-auto w-full sm:w-44">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="الهاتف (اختياري)"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="mt-6 text-start">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900">
              اللاعبون المضافون ({players.length}):
            </h3>
            {players.length < 8 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                <AlertTriangle className="size-3" />
                يُفضل 8 لاعبين أو أكثر للمباريات
              </span>
            )}
          </div>

          {players.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              لم تتم إضافة أي لاعب بعد. يمكنك كتابة الأسماء أعلاه أو الضغط على "نزيدهم من بعد".
            </div>
          ) : (
            <div className="mt-3 max-h-60 overflow-y-auto space-y-2 pe-1">
              {players.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white p-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                      {p.number || idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-black text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {POSITIONS.find((pos) => pos.id === p.position)?.label || 'لاعب'} {p.phone ? `• ${p.phone}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(idx)}
                    className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    title="حذف اللاعب"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 items-center gap-1.5 rounded-xl px-4 text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
              رجوع
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="flex h-11 items-center rounded-xl px-3 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              نزيدهم من بعد
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={busy}
            className="w-full sm:w-auto"
          >
            إتمام وإنهاء الإعداد 🚀
          </Button>
        </div>
      </div>
    </form>
  )
}
