import { Trophy, CheckCircle2, Shield, Calendar, Users, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '../../components/dashboard/ui'

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function StepCelebration({ team, schedules = [], tournaments = [], playersCount = 0, onFinish }) {
  const schedule = schedules[0]
  const registeredTournament = tournaments.find((t) => t.is_registered || t.rules_accepted)

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-white p-6 shadow-xl sm:p-10 text-center">
        {/* Decorative background glow */}
        <div className="pointer-events-none absolute -top-16 start-1/2 -translate-x-1/2 size-64 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Celebration Icon */}
        <div className="relative mx-auto mb-4 grid size-20 place-items-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-green-400 text-white shadow-lg shadow-emerald-500/30">
          <Trophy className="size-10" />
          <div className="absolute -top-1 -end-1 flex size-6 items-center justify-center rounded-full bg-amber-400 text-slate-900 shadow">
            <Sparkles className="size-3.5" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
          مبروك! فريقك جاهز للانطلاق 🎉
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          تم حفظ تفاصيل فريقك بنجاح. أصبحت الآن جاهزاً لخوض المباريات وإدارة ناديك بكل سهولة.
        </p>

        {/* Summary Card */}
        <div className="mt-8 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200/70 text-start space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                {team?.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="h-full w-full object-cover" />
                ) : (
                  <Shield className="size-6 text-emerald-600" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">{team?.name || 'فريقك'}</h3>
                <p className="text-xs text-slate-400">{team?.city || 'المغرب'}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
              <CheckCircle2 className="size-3.5" />
              جاهز
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="size-4 text-emerald-600 shrink-0" />
              <span>
                {schedule?.day_of_week !== undefined
                  ? `موعد قار: كل ${DAY_NAMES[schedule.day_of_week]} (${schedule.start_time?.slice(0, 5)})`
                  : 'مواعيد حرة بدون وقت قار'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <Users className="size-4 text-emerald-600 shrink-0" />
              <span>{playersCount > 0 ? `${playersCount} لاعبين مضافين` : 'لم يُضف لاعبون بعد'}</span>
            </div>
          </div>

          {registeredTournament && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200/60">
              <Trophy className="size-4 text-amber-600 shrink-0" />
              <span>مسجل في: {registeredTournament.name} (تم قبول القانون)</span>
            </div>
          )}
        </div>

        {/* Players reminder if low count */}
        {playersCount < 8 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-50/70 p-3.5 text-start text-xs text-amber-900 ring-1 ring-amber-200/50">
            <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>تنبيه:</strong> تحتاج إلى 8 لاعبين على الأقل لاعتماد التشكيلة في المباريات الرسمية. يمكنك استكمال اللائحة لاحقاً من لوحة التحكم.
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onFinish}
            className="w-full text-base py-3.5 shadow-lg shadow-emerald-500/25"
          >
            الانتقال إلى لوحة التحكم ⚽
          </Button>
        </div>
      </div>
    </div>
  )
}
