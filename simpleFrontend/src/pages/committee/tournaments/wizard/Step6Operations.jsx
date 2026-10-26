import { useState } from 'react'
import { Check, CheckCircle2, Copy, ExternalLink, Info, Key, ShieldCheck, Sparkles, UserCheck, Users } from 'lucide-react'
import { Badge, Button, Card, Empty, Skeleton } from '../../../../components/dashboard/ui'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { useToast } from '../../../../components/ui/Toast'

export default function Step6Operations({ tournament, refresh }) {
  const { toast } = useToast()
  const [copiedToken, setCopiedToken] = useState(null)

  // Fetch Referees
  const { data: refereesData, loading: loadingReferees } = useApi(
    () => api.get('/committee/referees').then((r) => r.data.data),
    [],
  )

  // Fetch Sample Fixtures with Delegated Tokens
  const { data: fixturesData, loading: loadingFixtures } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/fixtures`).then((r) => r.data.data),
    [tournament.id],
  )

  const referees = refereesData || []
  const fixtures = fixturesData || []

  const copyDelegatedLink = (token) => {
    const url = `${window.location.origin}/match-entry/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast.success('تم نسخ رابط إدخال النتيجة المباشر للحكم')
    setTimeout(() => setCopiedToken(null), 3000)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Delegated Match Entry (Secret Referee Links) */}
        <Card
          title="روابط إدخال النتائج المفوضة (للحكام والمناديب)"
          subtitle="تتيح للحكم أو المندوب الميداني تسجيل أهداف وأحداث المباراة مباشرة عبر الهاتف دون الحاجة لتسجيل دخول"
        >
          {loadingFixtures ? (
            <Skeleton className="h-24" />
          ) : fixtures.length === 0 ? (
            <Empty
              icon={Key}
              title="لا توجد مباريات مولدة بعد"
              description="قم بتوليد جدول المباريات في الخطوة السابقة لتفعيل روابط الحكام المباشرة."
              compact
            />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                كل مباراة تمتلك رابطاً سرياً مؤمناً بالكامل. يمكن إرساله عبر تطبيق واتساب للحكم في الملعب لإدخال النتيجة لحظياً.
              </p>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {fixtures.slice(0, 5).map((f) => {
                  const home = f.home_team || f.homeTeam || {}
                  const away = f.away_team || f.awayTeam || {}
                  const token = f.delegated_token?.token || f.delegated_token || 'demo-token'

                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">
                          {home.name || 'طرف 1'} ضد {away.name || 'طرف 2'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {f.scheduled_at ? new Date(f.scheduled_at).toLocaleDateString() : 'التاريخ غير محدد'}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyDelegatedLink(token)}
                        className="shrink-0 text-xs gap-1.5"
                      >
                        {copiedToken === token ? (
                          <>
                            <Check className="size-3.5 text-emerald-600" />
                            تم النسخ
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            نسخ رابط الحكم
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Referees & Officials Roster */}
        <Card
          title="قائمة الحكام المعتمدين في المنصة"
          subtitle="الحكام المسجلون الذين يمكن الاستعانة بهم في إدارة مباريات البطولة"
        >
          {loadingReferees ? (
            <Skeleton className="h-20" />
          ) : referees.length === 0 ? (
            <Empty
              icon={Users}
              title="لا يوجد حكام مسجلون حالياً"
              description="يمكنك الاعتماد على الروابط المفوضة السريعة لإرسالها لأي حكم خارجي مباشرة."
              compact
            />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {referees.slice(0, 4).map((referee) => (
                <div key={referee.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white">
                  <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                    {referee.name ? referee.name.slice(0, 2).toUpperCase() : 'REF'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{referee.name}</p>
                    <p className="text-[10px] text-slate-400">{referee.city || 'حكم معتمد'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Operational Readiness Guidance */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-black text-emerald-900 text-sm">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>فحص الجاهزية التشغيلية</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
              <span className="text-slate-600">نظام إدخال النتائج:</span>
              <span className="font-bold text-emerald-700">مفعل (روابط مفوضة)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
              <span className="text-slate-600">تنبيهات الفرق:</span>
              <span className="font-bold text-emerald-700">تلقائية عبر الإشعارات</span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500 pt-2 border-t border-emerald-100">
            هذه الخطوة تضمن انطلاق المباريات دون أي ارتباك إداري أو تأخر في تسجيل النتائج.
          </p>
        </div>
      </div>
    </div>
  )
}
