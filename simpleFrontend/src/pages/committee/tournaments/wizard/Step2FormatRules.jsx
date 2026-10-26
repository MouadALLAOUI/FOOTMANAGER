import { AlertTriangle, Clock, HelpCircle, Info, LayoutGrid, Network, Shield, Sparkles, Swords, Trophy, Users } from 'lucide-react'
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

export default function Step2FormatRules({ data, onChange }) {
  const isGroupFormat = data.tournament_format === 'groups_knockout' || data.tournament_format === 'groups_only'
  const isKnockout = data.tournament_format === 'groups_knockout' || data.tournament_format === 'knockout_only'
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
        {/* Format Selection Cards */}
        <Card title="صيغة ونظام المنافسة" subtitle="اختر الهيكل الرياضي الذي يحدد مسار البطولة">
          <div className="grid gap-3 sm:grid-cols-2">
            {FORMAT_OPTIONS.map((opt) => {
              const selected = data.tournament_format === opt.id
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange('tournament_format', opt.id)}
                  className={`flex flex-col justify-between rounded-2xl border p-4 text-start transition-all ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`grid size-10 place-items-center rounded-xl ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="size-5" />
                    </div>
                    {opt.badge && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
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

        {/* Structural Settings */}
        <Card title="هيكلة الفرق والمجموعات" subtitle="حدد سعة الفرق وطريقة توزيعها">
          <div className="space-y-4">
            <FieldRow>
              <Field label="عدد الفرق الإجمالي المستهدف" required hint="العدد الأقصى للفرق المشاركة (2 حتى 64)">
                <input
                  type="number"
                  min={2}
                  max={64}
                  value={data.teams_count || 8}
                  onChange={(e) => onChange('teams_count', e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>

              {isGroupFormat && (
                <Field label="عدد الفرق في كل مجموعة" hint="العدد المفضل في المجموعة الواحدة">
                  <input
                    type="number"
                    min={2}
                    max={16}
                    value={data.teams_per_group || 4}
                    onChange={(e) => onChange('teams_per_group', e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}
            </FieldRow>

            {isGroupFormat && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>التقدير الحسابي للمجموعات:</span>
                  <span className="text-emerald-700 font-extrabold">{derivedGroups} مجموعات</span>
                </div>
                {data.tournament_format === 'groups_knockout' && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 pt-3 border-t border-slate-200/60">
                    <Field label="عدد المتأهلين من كل مجموعة">
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={data.qualify_per_group || 2}
                        onChange={(e) => onChange('qualify_per_group', e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <div className="flex flex-col justify-center text-xs text-slate-500">
                      <span>إجمالي الفرق المتأهلة للأدوار الإقصائية:</span>
                      <span className="font-extrabold text-slate-800 text-sm mt-1">{computedKnockout} فرق</span>
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

              <Field label="رسوم الاشتراك للفريق (درهم)" hint="0 إذا كانت مجانية">
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

        {/* Match Timing & Scoring Rules */}
        <Card title="توقيت المباريات ونظام النقاط" subtitle="تحديد زمن الشوط واحتساب نتائج الفوز والتعادل">
          <div className="space-y-4">
            <FieldRow>
              <Field label="مدة المباراة الإجمالية (بالدقائق)">
                <input
                  type="number"
                  min={20}
                  max={120}
                  step={5}
                  value={data.match_duration_minutes || 90}
                  onChange={(e) => onChange('match_duration_minutes', e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="مدة الشوط الواحد (بالدقائق)">
                <input
                  type="number"
                  min={10}
                  max={60}
                  value={data.half_duration_minutes || (data.match_duration_minutes ? Math.floor(data.match_duration_minutes / 2) : 45)}
                  onChange={(e) => onChange('half_duration_minutes', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </FieldRow>

            <div className="pt-2">
              <span className="block text-xs font-bold text-slate-700 mb-2">توزيع نقاط المباريات</span>
              <div className="grid grid-cols-3 gap-3">
                <Field label="الفوز (Win)">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={data.points_for_win ?? 3}
                    onChange={(e) => onChange('points_for_win', e.target.value)}
                    className={`${inputClass} font-mono font-bold text-center`}
                  />
                </Field>
                <Field label="التعادل (Draw)">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={data.points_for_draw ?? 1}
                    onChange={(e) => onChange('points_for_draw', e.target.value)}
                    className={`${inputClass} font-mono font-bold text-center`}
                  />
                </Field>
                <Field label="الخسارة (Loss)">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={data.points_for_loss ?? 0}
                    onChange={(e) => onChange('points_for_loss', e.target.value)}
                    className={`${inputClass} font-mono font-bold text-center`}
                  />
                </Field>
              </div>
            </div>

            <Field label="شروط وقواعد خاصة (اختياري)" hint="أي لوائح تنظيمية أو تحكيمية يلتزم بها المشاركون">
              <textarea
                value={data.rules || ''}
                onChange={(e) => onChange('rules', e.target.value)}
                rows={3}
                placeholder="مثال: يمنع ارتداء الأحذية الحديدية، في حال التعادل بالنقاط يتم الاحتكام للمواجهات المباشرة..."
                className={inputClass}
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Contextual Guidance Sidebar */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50/70 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sky-800 font-extrabold text-sm mb-2">
            <Sparkles className="size-4" />
            <span>إرشادات النظام الرياضي</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            تحديد الصيغة وقواعد التوقيت يضمن أن محرك توليد المباريات والقرعة في الخطوات التالية سيقوم بإنشاء الجولات والمواجهات بدقة ودون أي تضارب.
          </p>

          <div className="mt-4 border-t border-sky-100 pt-3 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <Info className="size-4 text-sky-600 shrink-0 mt-0.5" />
              <span className="text-slate-600">
                في نظام المجموعات، تأكد أن عدد الفرق الإجمالي يقبل القسمة بالتساوي لتفادي مجموعات غير متكافئة.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="size-4 text-sky-600 shrink-0 mt-0.5" />
              <span className="text-slate-600">
                مدة المباراة المعتمدة ستستخدم تلقائياً عند حجز الملاعب لضمان فترات زمنية كافية لكل مواجهة.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
