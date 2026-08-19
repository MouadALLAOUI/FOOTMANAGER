export const QUICK_ACTIONS = [
  { type: 'goal', icon: '⚽', labelKey: 'committee.result.actions.goal', primary: true },
  { type: 'yellow_card', icon: '🟨', labelKey: 'committee.result.actions.card' },
  { type: 'substitution', icon: '🔄', labelKey: 'committee.result.actions.substitution' },
  { type: 'penalty_goal', icon: '🥅', labelKey: 'committee.result.actions.penalty' },
  { type: 'injury', icon: '🩹', labelKey: 'committee.result.actions.injury' },
  { type: 'other', icon: '📝', labelKey: 'committee.result.actions.note' },
]

export const TYPE_OPTIONS = [
  { type: 'goal', icon: '⚽', labelKey: 'committee.result.ev.goal' },
  { type: 'yellow_card', icon: '🟨', labelKey: 'committee.result.ev.yellowCard' },
  { type: 'second_yellow', icon: '🟨🟥', labelKey: 'committee.result.ev.secondYellow' },
  { type: 'red_card', icon: '🟥', labelKey: 'committee.result.ev.redCard' },
  { type: 'substitution', icon: '🔄', labelKey: 'committee.result.ev.substitution' },
  { type: 'penalty_goal', icon: '🥅', labelKey: 'committee.result.ev.penaltyGoal' },
  { type: 'injury', icon: '🩹', labelKey: 'committee.result.ev.injury' },
  { type: 'other', icon: '📝', labelKey: 'committee.result.ev.note' },
]

export const GOAL_TYPES = [
  { value: 'regular', labelKey: 'committee.result.goalTypes.regular' },
  { value: 'header', labelKey: 'committee.result.goalTypes.header' },
  { value: 'freeKick', labelKey: 'committee.result.goalTypes.freeKick' },
  { value: 'penalty', labelKey: 'committee.result.goalTypes.penalty' },
  { value: 'ownGoal', labelKey: 'committee.result.goalTypes.ownGoal' },
]

export const SUBMIT_KEYS = {
  goal: 'committee.result.addGoalBtn',
  yellow_card: 'committee.result.addCardBtn',
  second_yellow: 'committee.result.addCardBtn',
  red_card: 'committee.result.addCardBtn',
  substitution: 'committee.result.addSubBtn',
  penalty_goal: 'committee.result.addPenaltyBtn',
  missed_penalty: 'committee.result.addPenaltyBtn',
  injury: 'committee.result.addInjuryBtn',
  other: 'committee.result.addNoteBtn',
}

export const REFEREE_ROLES = [
  { value: 'main', labelKey: 'committee.result.refereeRoles.main' },
  { value: 'assistant1', labelKey: 'committee.result.refereeRoles.assistant1' },
  { value: 'assistant2', labelKey: 'committee.result.refereeRoles.assistant2' },
  { value: 'fourth', labelKey: 'committee.result.refereeRoles.fourth' },
]
