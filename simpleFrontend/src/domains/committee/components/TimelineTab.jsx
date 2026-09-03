import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../../components/dashboard/ui'
import TimelineColumn from './TimelineColumn'

export default function TimelineTab({ homeId, homeName, homeTeam, homeScore, awayId, awayName, awayTeam, awayScore, homeEvents, awayEvents, generalEvents, freshTick, onEdit, onDelete, eventsEmpty, onAddFirst, halfDuration, t }) {
  if (eventsEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-slate-50 text-3xl">⏱</span>
        <div>
          <p className="text-sm font-black text-slate-700">{t('committee.result.noEvents')}</p>
          <p className="mt-1 text-xs text-slate-400">{t('committee.result.noEventsDesc')}</p>
        </div>
        <Button size="sm" variant="soft" onClick={onAddFirst} className="h-11">
          <Plus className="size-4" />
          {t('committee.result.addFirstEvent')}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:max-h-[52vh] xl:overflow-y-auto xl:pe-1">
      <TimelineColumn
        team={{ id: homeId, name: homeName, team: homeTeam, score: homeScore }}
        events={homeEvents}
        freshKey={freshTick}
        onEdit={onEdit}
        onDelete={onDelete}
        halfDuration={halfDuration}
        t={t}
      />
      <TimelineColumn
        team={{ id: awayId, name: awayName, team: awayTeam, score: awayScore }}
        events={awayEvents}
        freshKey={freshTick}
        onEdit={onEdit}
        onDelete={onDelete}
        halfDuration={halfDuration}
        t={t}
      />
      {generalEvents.length > 0 && (
        <div className="lg:col-span-2">
          <TimelineColumn
            team={null}
            events={generalEvents}
            freshKey={freshTick}
            onEdit={onEdit}
            onDelete={onDelete}
            halfDuration={halfDuration}
            t={t}
          />
        </div>
      )}
    </div>
  )
}