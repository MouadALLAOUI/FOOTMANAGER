import {
  AlertTriangle,
  Clock,
  HelpCircle,
  Info,
  LayoutGrid,
  Network,
  Scale,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import { Card, Field, FieldRow, inputClass, selectClass } from '../../../../components/dashboard/ui'

const FORMAT_OPTIONS = [
  {
    id: 'groups_knockout',
    title: 'مجموعات + أدوار إقصائية',
    desc: 'مرحلة مجموعات يتأهل منها أفضل الفرق للمربع الذهبي أو النهائي',
    icon: Network,
    badge: 'الأكثر شعبية',
  },
  {
    id: 'league',
    title: 'دوري كامل بنقاط (League)',
    desc: 'كل فريق يواجه جميع الفرق الأخرى ويتوج صاحب أكبر عدد من النقاط',
    icon: Trophy,
    badge: 'نظام النقاط',
  },
  {
    id: 'knockout_only',
    title: 'خروج المغلوب مباشرة (Cup)',
    desc: 'مباريات إقصائية سريعة ومباشرة من الدور الأول حتى النهائي',
    icon: Swords,
    badge: 'خروج مغلوب',
  },
  {
    id: 'groups_only',
    title: 'مجموعات فقط',
    desc: 'بطولة تقتصر على مرحلة المجموعات دون أدوار إقصائية تالية',
    icon: LayoutGrid,
    badge: 'مجموعات',
  },
]

export default function Step2TournamentRules({ data, onChange }) {
  const isGroupFormat =
    data.tournament_format === 'groups_knockout' || data.tournament_format === 'groups_only'
  const isKnockout =
    data.tournament_format === 'groups_knockout' || data.tournament_format === 'knockout_only'
  const isLeague = data.tournament_format === 'league'

  const teamsCount = Number(data.teams_count || 8)
  const teamsPerGroup = Math.max(2, Number(data.teams_per_group || 4))
  const derivedGroups = isGroupFormat
    ? Math.max(2, Math.min(16, Math.ceil(teamsCount / teamsPerGroup)))
    : 0
  const qualifyPerGroup = Number(data.qualify_per_group || 2)
  const computedKnockout = derivedGroups * qualifyPerGroup

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* 1. نظام وصيغة المنافسة */}
        <Card
          title="صيغة ونظام البطولة الرياضي"
          subtitle="اختر الهيكل التنظيمي الذي يحدد مسار الفرق نحو التتويج"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {FORMAT_OPTIONS.map((opt) => {
              const selected = data.tournament_format === opt.id
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange('tournament_format', opt.id)}
                  className={`flex flex-col justify-between rounded-2xl border p-4 text-start transition-all cursor-pointer ${
                    selected
                      ? 'border-[#10B981] bg-emerald-50/50 shadow-sm ring-2 ring-[#10B981]/20'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`grid size-10 place-items-center rounded-xl ${
                        selected ? 'bg-[#10B981] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>
                    {opt.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          selected
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h4 className="text-sm font-black text-slate-900">{opt.title}</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* 2. هيكلة الفرق والمجموعات */}
        <Card
          title="هيكلة وسعة الفرق المشاركة"
          subtitle="تحديد عدد الفرق المستهدف وتفاصيل توزيع المجموعات"
        >
          <div className="space-y-4">
            <FieldRow>
              <Field
                label="العدد الإجمالي للفرق المستهدف"
                required
                hint="الحد الأقصى للفرق المعتمدة في البطولة"
              >
                <select
                  value={data.teams_count || 8}
                  onChange={(e) => onChange('teams_count', parseInt(e.target.value, 10))}
                  className={selectClass}
                >
                  {[4, 6, 8, 12, 16, 24, 32, 64].map((num) => (
                    <option key={num} value={num}>
                      {num} فرق
                    </option>
                  ))}
                </select>
              </Field>

              {isGroupFormat && (
                <Field
                  label="عدد الفرق في كل مجموعة"
                  hint="التوزيع المتوازن داخل المجموعات"
                >
                  <select
                    value={data.teams_per_group || 4}
                    onChange={(e) => onChange('teams_per_group', parseInt(e.target.value, 10))}
                    className={selectClass}
                  >
                    {[3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num} فرق لكل مجموعة
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </FieldRow>

            {isGroupFormat && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>التقدير الحسابي للمجموعات:</span>
                  <span className="text-[#10B981] font-black">{derivedGroups} مجموعات</span>
                </div>
                {data.tournament_format === 'groups_knockout' && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 pt-3 border-t border-slate-200/60">
                    <Field label="عدد المتأهلين من كل مجموعة">
                      <select
                        value={data.qualify_per_group || 2}
                        onChange={(e) => onChange('qualify_per_group', parseInt(e.target.value, 10))}
                        className={selectClass}
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            أول {n} فرق
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="flex flex-col justify-center text-xs text-slate-500">
                      <span>إجمالي الفرق المتأهلة للأدوار الإقصائية:</span>
                      <span className="font-extrabold text-slate-900 text-sm mt-1">
                        {computedKnockout} فرق
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLeague && (
              <FieldRow>
                <Field label="نظام مواجهات الدوري">
                  <select
                    value={data.league_mode || 'single_round_robin'}
                    onChange={(e) => onChange('league_mode', e.target.value)}
                    className={selectClass}
                  >
                    <option value="single_round_robin">ذهاب فقط (Single Round Robin)</option>
                    <option value="double_round_robin">ذهاب وإياب (Double Round Robin)</option>
                  </select>
                </Field>

                <Field label="أيام الراحة الدنيا بين المباريات">
                  <input
                    type="number"
                    min={0}
                    max={14}
                    value={data.rest_days_minimum ?? 1}
                    onChange={(e) => onChange('rest_days_minimum', e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </FieldRow>
            )}

            <FieldRow>
              <Field label="الحد الأقصى للاعبين لكل فريق" hint="حجم القائمة المسموح به">
                <input
                  type="number"
                  min={5}
                  max={99}
                  value={data.max_players_per_team || ''}
                  onChange={(e) => onChange('max_players_per_team', e.target.value)}
                  placeholder="مثال: 15 لاعب"
                  className={inputClass}
                />
              </Field>

              <Field label="رسوم الاشتراك للفريق (بالدرهم المغربي)" hint="أدخل 0 إذا كانت المشاركة مجانية">
                <input
                  type="number"
                  min={0}
                  value={data.registration_fee ?? 0}
                  onChange={(e) => onChange('registration_fee', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </FieldRow>
          </div>
        </Card>

        {/* 3. توقيت المباريات ونظام احتساب النقاط */}
        <Card
          title="توقيت المباريات ونظام النقاط"
          subtitle="تحديد مدة الأشواط واحتساب نتائج الفوز والتعادل والخسارة"
        >
          <div className="space-y-4">
            <FieldRow>
              <Field label="مدة المباراة الإجمالية (بالدقائق)">
                <select
                  value={data.match_duration_minutes || 90}
                  onChange={(e) => {
                    const dur = parseInt(e.target.value, 10)
                    onChange('match_duration_minutes', dur)
                    onChange('half_duration_minutes', Math.round(dur / 2))
                  }}
                  className={selectClass}
                >
                  <option value={40}>40 دقيقة (20 دقيقة لكل شوط)</option>
                  <option value={50}>50 دقيقة (25 دقيقة لكل شوط)</option>
                  <option value={60}>60 دقيقة (30 دقيقة لكل شوط)</option>
                  <option value={70}>70 دقيقة (35 دقيقة لكل شوط)</option>
                  <option value={90}>90 دقيقة (45 دقيقة لكل شوط)</option>
                </select>
              </Field>

              <Field label="مدة الشوط الواحد (بالدقائق)">
                <input
                  type="number"
                  min={10}
                  max={60}
                  value={data.half_duration_minutes || (data.match_duration_minutes ? Math.floor(data.match_duration_minutes / 2) : 45)}
                  onChange={(e) => onChange('half_duration_minutes', parseInt(e.target.value, 10))}
                  className={inputClass}
                />
              </Field>
            </FieldRow>

            <div className="pt-2">
              <span className="block text-xs font-bold text-slate-700 mb-2">
                توزيع نقاط المباريات
              </span>
              <div className="grid grid-cols-3 gap-3">
                <Field label="الفوز">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={data.points_for_win ?? 3}
                    onChange={(e) => onChange('points_for_win', parseInt(e.target.value, 10))}
                    className={`${inputClass} font-mono font-black text-center`}
                  />
                </Field>
                <Field label="التعادل">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={data.points_for_draw ?? 1}
                    onChange={(e) => onChange('points_for_draw', parseInt(e.target.value, 10))}
                    className={`${inputClass} font-mono font-black text-center`}
                  />
                </Field>
                <Field label="الخسارة">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={data.points_for_loss ?? 0}
                    onChange={(e) => onChange('points_for_loss', parseInt(e.target.value, 10))}
                    className={`${inputClass} font-mono font-black text-center`}
                  />
                </Field>
              </div>
            </div>
          </div>
        </Card>

        {/* 4. القانون الداخلي وشروط الانضباط */}
        <Card
          title="القانون الداخلي وشروط الانضباط والتأديب"
          subtitle="تحدد هذه اللائحة شروط الأهلية، العقوبات الانضباطية، وحالات الانسحاب التي يلتزم بها المشاركون"
        >
          <div className="space-y-3">
            <Field
              label="نص القانون الداخلي ولائحة البطولة"
              hint="سيتم عرض هذه الشروط في رابط تسجيل الفرق، ويجب على كل مسير فريق الإقرار بالموافقة عليها قبل التسجيل"
            >
              <textarea
                value={data.rules || ''}
                onChange={(e) => onChange('rules', e.target.value)}
                rows={6}
                placeholder="مثال على بنود القانون الداخلي:
1. الالتزام بالروح الرياضية واحترام قرارات الحكام واللجنة المنظمة.
2. إنذاران بالبطاقة الصفراء يترتب عليهما إيقاف لمباراة واحدة، والبطاقة الحمراء المباشرة توجب الإيقاف لمباراتين على الأقل.
3. يعتبر الفريق خاسراً بنتيجة 3-0 في حال التأخر عن موعد انطلاق المباراة بأكثر من 15 دقيقة دون إذن مسبق.
4. يلتزم كل فريق بارتداء زي موحد مع أرقام واضحة على القمصان."
                className={inputClass}
              />
            </Field>

            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800">
              <Scale className="size-4 text-[#10B981] shrink-0" />
              <span>
                هذا القانون ملزم ويُطلب من مسير الفريق التأشير عليه بالقبول عند التسجيل عبر الرابط الذكي.
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Sidebar: الإرشادات الرياضية */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-[#0F172A] to-[#142320] p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-emerald-400 font-black text-sm mb-3">
            <Sparkles className="size-4.5 text-amber-400" />
            <span>إرشادات النظام الرياضي واللوائح</span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                1
              </span>
              <p>
                <strong className="text-white">توليد جدول المباريات:</strong> محرك القرعة يعتمد على الصيغة وعدد المجموعات المحددة هنا لإنشاء الأدوار تلقائياً.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                2
              </span>
              <p>
                <strong className="text-white">مدة الأشواط:</strong> التوقيت المعتمد يحدد تلقائياً زمن حجز الملعب المطلوب لكل مباراة.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                3
              </span>
              <p>
                <strong className="text-white">المرحلة الثالثة (النشر):</strong> بعد حفظ هذه القوانين، يمكنك نشر البطولة رسمياً وفتح باب التسجيل للفرق.
              </p>
            </div>
          </div>
        </div>

        {/* Format Summary Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-3">
            <Shield className="size-4 text-[#10B981]" />
            <span>ملخص القواعد المعتمدة:</span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">نظام المنافسة:</span>
              <span className="font-bold text-slate-800">
                {FORMAT_OPTIONS.find((f) => f.id === data.tournament_format)?.title || 'مجموعات'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">سعة الفرق:</span>
              <span className="font-bold text-slate-800">{data.teams_count || 8} فرق</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">زمن المباراة:</span>
              <span className="font-bold text-slate-800">{data.match_duration_minutes || 90} دقيقة</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">رسوم الاشتراك:</span>
              <span className="font-bold text-emerald-600">
                {Number(data.registration_fee || 0) === 0 ? 'مجانية' : `${data.registration_fee} درهم`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
