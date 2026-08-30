import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimeSlotPicker from '../components/TimeSlotPicker'

const SLOTS = ['09:00', '09:30', '10:00', '10:30']

describe('TimeSlotPicker', () => {
  it('renders all available slots as buttons and marks the selected one', () => {
    render(
      <TimeSlotPicker selectedTime="09:30" onChange={() => {}} availableSlots={SLOTS} label="Available *" />,
    )
    SLOTS.forEach((s) => expect(screen.getByRole('button', { name: s })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '09:30' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onChange with the picked time when an enabled slot is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TimeSlotPicker selectedTime="" onChange={onChange} availableSlots={SLOTS} label="Available *" />)
    await user.click(screen.getByRole('button', { name: '10:00' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('10:00')
  })

  it('does not call onChange and marks the slot disabled when clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TimeSlotPicker
        selectedTime=""
        onChange={onChange}
        availableSlots={SLOTS}
        disabledSlots={['09:30']}
        label="Available *"
      />,
    )
    const disabled = screen.getByRole('button', { name: '09:30' })
    expect(disabled).toBeDisabled()
    expect(disabled).toHaveAttribute('aria-disabled', 'true')
    await user.click(disabled)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders a required marker when required is set', () => {
    render(<TimeSlotPicker selectedTime="" onChange={() => {}} availableSlots={SLOTS} label="Available *" required />)
    const group = screen.getByRole('group')
    expect(group.textContent).toContain('*')
  })

  it('shows a loading skeleton instead of slots while loading', () => {
    const { container } = render(
      <TimeSlotPicker selectedTime="" onChange={() => {}} availableSlots={SLOTS} loading label="Available *" />,
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: '09:00' })).not.toBeInTheDocument()
  })

  it('shows the empty message when there are no slots', () => {
    render(<TimeSlotPicker selectedTime="" onChange={() => {}} availableSlots={[]} label="Available *" />)
    expect(screen.getByText('لا توجد فتحات متاحة')).toBeInTheDocument()
  })

  it('shows an amber flag when the selected time is not in the list', () => {
    render(
      <TimeSlotPicker selectedTime="08:00" onChange={() => {}} availableSlots={SLOTS} label="Available *" />,
    )
    expect(screen.getByText(/التوقيت المحدد/)).toBeInTheDocument()
  })
})
