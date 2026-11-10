import { Link } from 'react-router-dom'
import { ChevronLeft, Crown, Footprints, Lock, Users } from 'lucide-react'
import { formatPlayerPosition } from '../../../lib/adapters'

function formatRoleLabel(role) {
  if (!role) return null
  const r = String(role).toLowerCase().trim()
  if (r === 'starter') return 'أساسي'
  if (r === 'substitute') return 'بديل'
  if (r === 'reserve') return 'احتياطي'
  return role
}

function formatFootLabel(foot) {
  if (!foot) return null
  const f = String(foot).toLowerCase().trim()
  if (f === 'right') return 'يمنى'
  if (f === 'left') return 'يسرى'
  if (f === 'both') return 'كلتا القدمين'
  return foot
}

function getInitials(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return 'ل'
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] || '') + (words[1][0] || '')
  return trimmed.slice(0, 2)
}

export default function TeamRosterSection({ squad = [], isPrivate = false }) {
  const players = Array.isArray(squad) ? squad : []

  return (
    <section className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 sm:p-6 shadow-2xs">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]">
            <Users className="size-4" />
          </span>
          <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
            قائمة اللاعبين
          </h2>
          {players.length > 0 && (
            <span className="rounded-full bg-[#F7F8F5] dark:bg-[#252B27] border border-[#E1E5DF] dark:border-[#303832] px-2.5 py-0.5 text-[11px] font-black text-[#111313] dark:text-[#D0FF38] tabular-nums">
              {players.length} لاعب
            </span>
          )}
        </div>
      </div>

      {isPrivate && players.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] py-10 px-4 text-center">
          <Lock className="size-7 text-[#65706A] dark:text-[#B2B9B3] mb-2" />
          <p className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
            قائمة اللاعبين خاصة
          </p>
          <p className="mt-1 text-xs text-[#65706A] dark:text-[#B2B9B3] max-w-sm">
            إعدادات خصوصية هذا الفريق لا تسمح بعرض تشكيلة اللاعبين للعموم.
          </p>
        </div>
      ) : players.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] py-10 px-4 text-center">
          <Users className="size-7 text-[#65706A] dark:text-[#B2B9B3] mb-2" />
          <p className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
            لا توجد قائمة لاعبين منشورة حالياً
          </p>
          <p className="mt-1 text-xs text-[#65706A] dark:text-[#B2B9B3] max-w-sm">
            ستظهر بطاقات اللاعبين المسجلين فور إضافتهم في لائحة الفريق.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {players.map((p, idx) => {
            const posLabel = formatPlayerPosition(p.position) || 'لاعب'
            const roleLabel = formatRoleLabel(p.role)
            const footLabel = formatFootLabel(p.preferred_foot)

            const cardContent = (
              <>
                <div className="relative shrink-0">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.name}
                      className="size-12 rounded-xl object-cover ring-1 ring-[#E1E5DF] dark:ring-[#303832]"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-[#179955]/15 to-[#B8F000]/20 dark:from-[#42D889]/20 dark:to-[#D0FF38]/20 text-sm font-black text-[#111313] dark:text-[#D0FF38] border border-[#E1E5DF] dark:border-[#303832]">
                      {getInitials(p.name)}
                    </span>
                  )}
                  {p.number != null && (
                    <span className="absolute -bottom-1 -end-1 grid min-w-[20px] h-5 px-1 place-items-center rounded-md bg-[#111313] dark:bg-[#D0FF38] text-[10px] font-black text-white dark:text-[#111313] tabular-nums ring-2 ring-white dark:ring-[#1B201D]">
                      #{p.number}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 text-start">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] group-hover:text-[#179955] dark:group-hover:text-[#D0FF38] transition-colors" dir="auto">
                      {p.name}
                    </p>
                    {p.is_captain && (
                      <Crown className="size-3.5 shrink-0 text-amber-500" title="عميد الفريق" />
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                    <span className="rounded-md bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-1.5 py-0.5 text-[#179955] dark:text-[#42D889]">
                      {posLabel}
                    </span>
                    {roleLabel && (
                      <span className="rounded-md bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-1.5 py-0.5 text-[#65706A] dark:text-[#B2B9B3]">
                        {roleLabel}
                      </span>
                    )}
                    {footLabel && (
                      <span className="inline-flex items-center gap-0.5 text-[#65706A] dark:text-[#B2B9B3]">
                        <Footprints className="size-2.5" />
                        <span>{footLabel}</span>
                      </span>
                    )}
                  </div>
                </div>

                <ChevronLeft className="size-4 shrink-0 text-[#65706A] dark:text-[#B2B9B3] transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
              </>
            )

            return p.id != null ? (
              <Link
                key={p.id}
                to={`/players/${p.id}`}
                className="group flex items-center gap-3 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 transition-all hover:border-[#B8F000] dark:hover:border-[#D0FF38] hover:bg-white dark:hover:bg-[#1B201D]"
              >
                {cardContent}
              </Link>
            ) : (
              <div
                key={`${p.name || 'player'}-${idx}`}
                className="flex items-center gap-3 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3"
              >
                {cardContent}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
