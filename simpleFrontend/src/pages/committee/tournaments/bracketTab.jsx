import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Crown, Layers, Network, RefreshCw, Swords, UserCheck } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Empty, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import CommitteeBracket from '../../../domains/committee/components/CommitteeBracket'
import KnockoutOptionModal from '../../../domains/committee/components/KnockoutOptionModal'
import TournamentStageBar from '../../../components/tournaments/TournamentStageBar'
import { ODD_KO_OPTIONS, ODD_KO_TITLE_KEYS } from '../../../domains/committee/lib/knockoutOptions'

export default function BracketTab({ tournament, refresh, refreshKey, setActive }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)
  const [optionModal, setOptionModal] = useState(false)
  const [oddChoice, setOddChoice] = useState(false)
  const [invalidNotice, setInvalidNotice] = useState(null)

  const hasKnockout = !['groups_only', 'league'].includes(tournament.tournament_format)
  const bracketUrl = `/committee/tournaments/${tournament.id}/bracket`

  const { data, loading, refetch } = useApi(() => api.get(bracketUrl).then((r) => r.data), [tournament.id, refreshKey], {
    enabled: hasKnockout,
  })

  const { data: validation } = useApi(
    () => api.get(`${bracketUrl}/validation`).then((r) => r.data.data),
    [tournament.id, refreshKey],
    { enabled: hasKnockout },
  )

  const rounds = data?.data || []
  const meta = data?.meta || null
  const isGroups6 = meta?.mode === 'groups6'
  const isOddMode = ['playin', 'bye_final'].includes(meta?.mode)
  const currentValidation = validation || invalidNotice
  const oddOptions = (currentValidation?.options || []).includes('bye_final')

  const fetchValidation = async () => api.get(`${bracketUrl}/validation`).then((r) => r.data.data)

  const createBracket = async () => {
    if (busy) return
    setBusy('create')
    try {
      const gate = await fetchValidation()

      if (gate.status === 'invalid') {
        setInvalidNotice(gate)
        refetch()
        return
      }

      if (gate.status === 'choice') {
        setInvalidNotice(null)
        setOddChoice((gate.options || []).includes('bye_final') || (gate.options || []).includes('playin'))
        setOptionModal(true)
        refetch()
        return
      }

      setInvalidNotice(null)
      await api.post(bracketUrl)
      toast.success(t('committee.detail.bracketCreated'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const confirmOption = async (mode) => {
    if (busy) return
    setBusy('option')
    try {
      await api.post(bracketUrl, { mode })
      toast.success(t('committee.detail.bracketCreated'))
      setOptionModal(false)
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const populate = async () => {
    if (busy) return
    setBusy('populate')
    try {
      await api.post(`${bracketUrl}/populate`)
      toast.success(t('committee.detail.bracketPopulated'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const syncBracket = async () => {
    if (busy) return
    setBusy('sync')
    try {
      await api.post(`${bracketUrl}/sync`)
      toast.success(t('committee.detail.bracketSynced'))
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  if (!hasKnockout) {
    return (
      <Empty
        icon={Network}
        title={t('committee.detail.noBracket')}
        description={t('committee.detail.noBracketDesc')}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {currentValidation?.status === 'invalid' && (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-black text-red-800">{t('committee.detail.knockout6.invalidTeams', { count: currentValidation.count })}</p>
            <p className="text-xs leading-relaxed text-red-600">{t('committee.detail.knockout6.invalidTeamsDesc')}</p>
          </div>
        </div>
      )}

      {currentValidation?.status === 'choice' && oddOptions && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Crown className="size-5 shrink-0 text-amber-600" />
          <p className="text-sm font-black text-amber-900">{t('committee.detail.oddKo.banner', { count: currentValidation.count })}</p>
          <span className="flex flex-wrap items-center gap-1 font-black text-amber-800">
            {(currentValidation?.trail || [1]).map((step, i) => (
              <span key={step} className="flex items-center gap-1">
                {i > 0 && <span className="text-amber-400">←</span>}
                <span className="rounded-lg bg-white px-1.5 py-0.5 ring-1 ring-amber-200">{step}</span>
              </span>
            ))}
          </span>
          <Button size="sm" variant="outline" className="ms-auto" loading={busy === 'create'} onClick={createBracket}>
            <Network className="size-4" />
            {t('committee.detail.createBracket')}
          </Button>
        </div>
      )}

      {isOddMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <Crown className="size-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-black text-emerald-900">{t(`committee.detail.oddKo.active.${meta.mode}`)}</p>
          <span className="flex flex-wrap items-center gap-1 font-black text-emerald-800">
            {(currentValidation?.trail || (validation?.trail || [1])).map((step, i) => (
              <span key={step} className="flex items-center gap-1">
                {i > 0 && <span className="text-emerald-400">←</span>}
                <span className="rounded-lg bg-white px-1.5 py-0.5 ring-1 ring-emerald-200">{step}</span>
              </span>
            ))}
          </span>
          <p className="text-xs leading-relaxed text-emerald-700">{t('committee.detail.oddKo.activeHint')}</p>
        </div>
      )}

      {isGroups6 && meta?.groups?.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="size-5 text-blue-600" />
            <p className="text-sm font-black text-blue-900">{t('committee.detail.knockout6.groupsBanner')}</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {meta.groups.map((group) => (
              <div key={group.id} className="rounded-xl bg-white/70 p-3 ring-1 ring-blue-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">{t('committee.detail.knockout6.groupLabel', { group: group.name })}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.teams.map((team) => (
                    <span key={team.id} className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-900">
                      {team.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setActive?.('fixtures')}>
              <Swords className="size-4" />
              {t('committee.detail.knockout6.goToFixtures')}
            </Button>
            <p className="text-xs text-blue-700">{t('committee.detail.knockout6.populateHint')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" loading={busy === 'sync'} onClick={syncBracket}>
          <RefreshCw className="size-4" />
          {t('committee.detail.syncBracket')}
        </Button>
        <Button size="sm" variant="outline" loading={busy === 'create'} onClick={createBracket}>
          <Network className="size-4" />
          {t('committee.detail.createBracket')}
        </Button>
        <Button size="sm" loading={busy === 'populate'} onClick={populate}>
          <UserCheck className="size-4" />
          {t('committee.detail.populateBracket')}
        </Button>
      </div>

      {rounds.length === 0 ? (
        <Empty icon={Network} title={t('committee.detail.bracketEmpty')} description={t('committee.detail.bracketEmptyDesc')} />
      ) : (
        <>
          <TournamentStageBar rounds={rounds} />
          <CommitteeBracket rounds={rounds} />
        </>
      )}

      <KnockoutOptionModal
        open={optionModal}
        onClose={() => setOptionModal(false)}
        onConfirm={confirmOption}
        busy={busy === 'option'}
        options={oddChoice ? ODD_KO_OPTIONS : undefined}
        titleKey={oddChoice ? ODD_KO_TITLE_KEYS.titleKey : undefined}
        descKey={oddChoice ? ODD_KO_TITLE_KEYS.descKey : undefined}
        recommendedKey={oddChoice ? ODD_KO_TITLE_KEYS.recommendedKey : undefined}
        trail={oddChoice ? currentValidation?.trail : undefined}
      />
    </div>
  )
}