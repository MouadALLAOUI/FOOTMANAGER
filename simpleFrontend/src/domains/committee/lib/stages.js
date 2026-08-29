const STAGE_KEYS = {
  play_in: 'playIn',
  round_of_16: 'roundOf16',
  quarterfinal: 'quarterfinal',
  semifinal: 'semifinal',
  final: 'final',
}

export function stageTranslationKey(stage) {
  return stage ? STAGE_KEYS[stage] : null
}

export function stageLabel(t, stage, fallback) {
  const key = stageTranslationKey(stage)
  return key ? t(`stages.${key}`) : fallback
}