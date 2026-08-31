import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FooterActions from '../domains/committee/components/FooterActions'

const T = {
  'committee.result.saveDraft': 'Save draft',
  'committee.result.runMatch': 'Run Match',
  'committee.result.postCurrentResult': 'Post Current Result',
  'committee.result.finishMatch': 'Finish Match',
  'committee.result.retry': 'Retry',
}

const t = (key) => T[key] || key

function renderActions(overrides = {}) {
  const props = {
    saveError: null,
    retryRef: { current: null },
    saving: false,
    saveDraft: () => {},
    setConfirmOpen: () => {},
    onClose: () => {},
    runMatch: () => {},
    postCurrentResult: () => {},
    alreadyFinished: false,
    ...overrides,
  }
  return render(<FooterActions {...props} t={t} />)
}

describe('FooterActions §7.1 regression: Run Match must not reappear for a live match', () => {
  it('shows Run Match for a not-yet-started match', () => {
    renderActions({
      matchNotStarted: true,
      isLiveMatch: false,
      alreadyFinished: false,
    })
    expect(screen.getByRole('button', { name: 'Run Match' })).toBeInTheDocument()
  })

  it('hides Run Match once the match is live, even after in-match saves/event adds', () => {
    // After starting the match and adding events, the match stays live:
    // matchNotStarted=false, isLiveMatch=true. Run Match must remain hidden.
    renderActions({
      matchNotStarted: false,
      isLiveMatch: true,
      alreadyFinished: false,
    })
    expect(screen.queryByRole('button', { name: 'Run Match' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Post Current Result' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish Match' })).toBeInTheDocument()
  })

  it('keeps Run Match hidden after an in-match event save because status stayed live', () => {
    // Simulate: match started then an event was added (still live). The prior
    // bug reverted the status to scheduled, which would flip matchNotStarted
    // back on and re-display Run Match. Guard against that state combo.
    renderActions({
      matchNotStarted: false,
      isLiveMatch: true,
      alreadyFinished: false,
      saving: false,
    })
    expect(screen.queryByRole('button', { name: 'Run Match' })).not.toBeInTheDocument()
  })

  it('hides Run Match and Post Current Result once the match is finished', () => {
    renderActions({
      matchNotStarted: false,
      isLiveMatch: true,
      alreadyFinished: true,
    })
    expect(screen.queryByRole('button', { name: 'Run Match' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Post Current Result' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Finish Match' })).not.toBeInTheDocument()
  })
})
