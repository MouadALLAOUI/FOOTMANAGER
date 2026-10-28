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
  bg = '',
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

  const trimmed = displayName.trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  const twoChars = words.length >= 2
    ? (words[0].slice(0, 1) + words[1].slice(0, 1))
    : trimmed.slice(0, 2) || 'ف'

  const inner = imageSrc && !failed ? (
    <img
      src={imageSrc}
      alt={displayName || alt || 'logo'}
      crossOrigin="anonymous"
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain ${bg || 'bg-slate-100'} ${rounded} ${className} ${ring}`}
    />
  ) : (
    <span
      style={{ backgroundColor: brand || '#1F7A4D' }}
      className={`grid shrink-0 place-items-center font-black text-white ${rounded} ${className} ${ring}`}
    >
      <span className={fontSize}>{twoChars}</span>
    </span>
  )

  if (!onClick) return inner

  return (
    <button type="button" onClick={onClick} aria-label={displayName || 'logo'} className="shrink-0 leading-none">
      {inner}
    </button>
  )
}