import { useEffect, useState } from 'react'

// Renders a user avatar image with an initials fallback.
// Pass `src` (e.g. avatarThumb(user)) or let it derive from `user.avatar_url`.
export default function ProfileAvatar({
  user,
  src,
  name,
  className = 'size-10',
  rounded = 'rounded-full',
  fontSize = 'text-base',
}) {
  const displayName = name ?? user?.name ?? ''
  const imageSrc = src ?? user?.avatar_url ?? ''
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [imageSrc])

  if (imageSrc && !failed) {
    return (
      <img
        src={imageSrc}
        alt={displayName || 'avatar'}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`shrink-0 object-cover ${rounded} ${className}`}
      />
    )
  }

  return (
    <span
      className={`grid shrink-0 place-items-center bg-gradient-to-br from-green-400 to-emerald-600 font-black text-white ${rounded} ${className}`}
    >
      <span className={fontSize}>{displayName.trim().charAt(0) || '؟'}</span>
    </span>
  )
}
