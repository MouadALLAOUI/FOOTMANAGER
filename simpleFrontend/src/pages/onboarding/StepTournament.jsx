import { useState } from 'react'
import { Trophy, FileText, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '../../components/dashboard/ui'

export default function StepTournament({ tournaments = [], onNext, onBack, onSkip, busy }) {
  const openTournaments = tournaments.filter((t) => t.status === 'open_for_registration')
  const defaultTournament = openTournaments[0] || tournaments[0]

  const [selectedTournamentId, setSelectedTournamentId] = useState(defaultTournament?.id || null)
  const [agreed, setAgreed] = useState(defaultTournament?.rules_accepted || false)
  const [expandedRules, setExpandedRules] = useState(false)
  const [error, setError] = useState('')

  const activeTournament = tournaments.find((t) => t.id === selectedTournamentId)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedTournamentId) {
      // If no tournament available, just advance
      onSkip()
      return
    }

    if (!agreed) {
      setError('يرجى وضع علامة الموافقة على قانون البطولة للمتابعة، أو الضغط على "المشاركة لاحقاً"')
      return
    }

    setError('')
    onNext({
      tournament_id: selectedTournamentId,
      agreed: true,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Trophy className="size-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">البطولة وقانون اللعب</h1>
          <p className="mt-1 text-xs text-slate-500">
            اطلع على شروط وضوابط البطولة وأكد موافقتك للمشاركة
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-rose-50 p-3.5 text-center text-xs font-bold text-rose-600 ring-1 ring-rose-200">
            {error}
          </div>
        )}

        {/* Tournaments list */}
        {tournaments.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-500">
            لا توجد بطولات مفتوحة للتسجيل حالياً. يمكنك المتابعة وإكمال إعداد فريقك للمباريات الودية.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {tournaments.map((t) => {
              const isSelected = selectedTournamentId === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTournamentId(t.id)}
                  className={`cursor-pointer rounded-2xl border-2 p-4 text-start transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Trophy className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">{t.name}</h3>
                        <p className="text-xs text-slate-500">{t.location || 'المغرب'} • أقصى عدد لاعبين: {t.max_players_per_team || 15}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <CheckCircle2 className="size-4" strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Rules Container Card */}
            {activeTournament && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-start">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span>أهم بنود قانون البطولة ({activeTournament.name}):</span>
                </div>

                <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span><strong>احترام التوقيت:</strong> الحضور 15 دقيقة قبل انطلاق المقابلة، والتأخر لأكثر من 15 دقيقة يعتبر اعتذاراً.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span><strong>الروح الرياضية:</strong> أي سلوك غير لائق أو اعتداء لفظي يعرض اللاعب أو الفريق للإقصاء المباشر.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span><strong>التشكيلة الرسمية:</strong> لا يشارك في البطولة إلا اللاعبون المقيدون في اللائحة الرسمية المعتمدة.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span><strong>قرارات التحكيم:</strong> قرارات الحكام واللجنة المنظمة نهائية وملزمة لجميع الفرق.</span>
                  </div>
                </div>

                {activeTournament.rules && (
                  <div className="mt-3 border-t border-slate-200/80 pt-3">
                    <button
                      type="button"
                      onClick={() => setExpandedRules(!expandedRules)}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      {expandedRules ? 'إخفاء النص الكامل للقانون' : 'قراءة القانون الكامل بالتفصيل...'}
                    </button>
                    {expandedRules && (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-700 ring-1 ring-slate-200 whitespace-pre-line">
                        {activeTournament.rules}
                      </div>
                    )}
                  </div>
                )}

                {/* Explicit Agreement Checkbox */}
                <div className="mt-5 rounded-xl border-2 border-emerald-500/30 bg-emerald-50/70 p-3.5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 size-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-black text-slate-900 leading-snug select-none">
                      قرأت قانون البطولة وأوافق على الالتزام التام ببنوده وشروط المشاركة
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

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
              المشاركة لاحقاً
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={busy}
            className="w-full sm:w-auto"
          >
            تأكيد ومتابعة ←
          </Button>
        </div>
      </div>
    </form>
  )
}
