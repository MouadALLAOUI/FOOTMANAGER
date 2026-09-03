import React, { useState } from 'react'
import { Ban, Check, Plus, X } from 'lucide-react'
import { TeamAvatar } from '../../../pages/tournaments/shared'

function TeamColumn({ teamId, name, team, players, suspendedIds, redCardedIds, busyId, onTapPlayer, onAddPlayer, t }) {
  const list = players || []
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const addBusy = busyId === '__add__'

  const submitAdd = async () => {
    const value = addName.trim()
    if (!value) return
    const ok = await onAddPlayer(teamId, value)
    if (ok) setAddName('')
    setAdding(false)
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <TeamAvatar team={team} className="size-6" />
          <span className="truncate text-xs font-black text-slate-800">{name}</span>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-slate-400">{list.length}</span>
      </div>

      {adding ? (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50/50 px-2 py-2">
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitAdd() }}
            placeholder={t('committee.result.playersAddPlaceholder')}
            autoFocus
            disabled={addBusy}
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-green-400 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={submitAdd}
            disabled={addBusy || !addName.trim()}
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-green-600 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            aria-label={t('committee.result.addPlayer')}
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setAddName('') }}
            disabled={addBusy}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={t('common.close')}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={addBusy}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-500 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
          >
            <Plus className="size-4" />
            {t('committee.result.addPlayer')}
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-6 text-center">
          <span className="text-slate-300">—</span>
          <p className="text-[11px] font-semibold text-slate-400">{t('committee.result.playersNoPlayers')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 xl:max-h-[46vh] xl:overflow-y-auto xl:pe-1">
          {list.map((p) => {
            const suspended = suspendedIds.includes(p.id)
            const redCarded = redCardedIds.includes(p.id)
            const blocked = suspended || redCarded
            const busy = busyId === p.id
            return (
              <button
                key={p.id}
                type="button"
                disabled={blocked || busy}
                onClick={() => onTapPlayer(p, teamId)}
                className={`group flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-start shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all ${
                  blocked
                    ? 'cursor-not-allowed opacity-60'
                    : busy
                      ? 'cursor-wait opacity-70'
                      : 'active:scale-[0.98] hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-black tabular-nums ${
                    blocked ? 'bg-slate-100 text-slate-400' : 'bg-green-50 text-green-700'
                  }`}
                >
                  {p.number || '—'}
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm font-bold ${blocked ? 'text-slate-400' : 'text-slate-800'}`}>
                  {p.name}
                </span>
                {blocked ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600">
                    <Ban className="size-3" />
                    {t('committee.result.playersSentOff')}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                    {t('committee.result.playersTapToAdd')}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PlayersTab({ homeId, homeName, homeTeam, awayId, awayName, awayTeam, homeRoster, awayRoster, suspendedByTeam, redCardedIds, busyId, onTapPlayer, onAddPlayer, t }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TeamColumn
        teamId={homeId}
        name={homeName}
        team={homeTeam}
        players={homeRoster}
        suspendedIds={suspendedByTeam[homeId] || []}
        redCardedIds={redCardedIds[homeId] || []}
        busyId={busyId}
        onTapPlayer={onTapPlayer}
        onAddPlayer={onAddPlayer}
        t={t}
      />
      <TeamColumn
        teamId={awayId}
        name={awayName}
        team={awayTeam}
        players={awayRoster}
        suspendedIds={suspendedByTeam[awayId] || []}
        redCardedIds={redCardedIds[awayId] || []}
        busyId={busyId}
        onTapPlayer={onTapPlayer}
        onAddPlayer={onAddPlayer}
        t={t}
      />
    </div>
  )
}