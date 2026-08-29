import { Swords, Crown } from 'lucide-react'

export const ODD_KO_OPTIONS = [
  {
    id: 'playin',
    icon: Swords,
    titleKey: 'committee.detail.oddKo.options.playin.title',
    descKey: 'committee.detail.oddKo.options.playin.desc',
    cls: 'from-indigo-500/10 to-indigo-500/5 ring-indigo-200',
    recommended: false,
  },
  {
    id: 'bye_final',
    icon: Crown,
    titleKey: 'committee.detail.oddKo.options.byefinal.title',
    descKey: 'committee.detail.oddKo.options.byefinal.desc',
    cls: 'from-amber-500/10 to-amber-500/5 ring-amber-200',
    recommended: true,
  },
]

export const ODD_KO_TITLE_KEYS = {
  titleKey: 'committee.detail.oddKo.modalTitle',
  descKey: 'committee.detail.oddKo.modalDesc',
  recommendedKey: 'committee.detail.oddKo.recommended',
}