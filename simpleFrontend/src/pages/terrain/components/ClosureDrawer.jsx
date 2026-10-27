import GuestBookingModal from './GuestBookingModal'

export default function ClosureDrawer({
  open,
  onClose,
  terrainId,
  terrainName,
  date,
  startTime,
  onSaved,
}) {
  return (
    <GuestBookingModal
      open={open}
      onClose={onClose}
      terrainId={terrainId}
      terrainName={terrainName}
      date={date}
      startTime={startTime}
      initialMode="closure"
      onSaved={onSaved}
      refresh={onSaved}
    />
  )
}
