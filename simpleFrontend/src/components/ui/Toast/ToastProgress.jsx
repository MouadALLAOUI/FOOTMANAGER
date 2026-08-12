export default function ToastProgress({ value, barClass }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-[3px] overflow-hidden ${barClass}`}>
      <div className="absolute inset-0 bg-current opacity-20" />
      <div className="absolute inset-y-0 start-0 bg-current" style={{ width: `${clamped}%` }} />
    </div>
  )
}
