import { useEffect, useState } from 'react'
import { logoThumb } from '../../lib/thumb'
import { brandFrom } from '../../lib/brandColors'

// Renders a team logo locked to a square frame with contain-fit so logos are
// never cropped. Falls back to a color-aware initials tile using the team's
// primary color (or the `color` prop). Pass `src` (e.g. logoThumb(team)) or
// let it derive from `team.logo_url`.
export default function TeamLogo({
  team,
  src,
  name,
  color,
  className = 'size-10',
  rounded = 'rounded-xl',
  fontSize = 'text-xs',
  ring = '',
  onClick,
  alt = '',
}) {
  const displayName = name ?? team?.name ?? ''
  const imageSrc = src ?? logoThumb(team)
  const brand = brandFrom(color || team?.primary_color)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [imageSrc])

  const inner = imageSrc && !failed ? (
    <img
      src={imageSrc}
      alt={displayName || alt || 'logo'}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`shrink-0 bg-slate-100 object-contain ${rounded} ${className} ${ring}`}
    />
  ) : (
    <span
      style={{ backgroundColor: brand }}
      className={`grid shrink-0 place-items-center font-black text-white ${rounded} ${className} ${ring}`}
    >
      <span className={fontSize}>{displayName.trim().charAt(0) || '؟'}</span>
    </span>
  )

  if (!onClick) return inner

  return (
    <button type="button" onClick={onClick} aria-label={displayName || 'logo'} className="shrink-0 leading-none">
      {inner}
    </button>
  )
}