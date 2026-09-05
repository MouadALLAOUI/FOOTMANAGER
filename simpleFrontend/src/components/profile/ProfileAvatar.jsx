import { useEffect, useState } from 'react'
import ImagePreview from '../ui/ImagePreview'

// Renders a user avatar image with an initials fallback.
// Pass `src` (e.g. avatarThumb(user)) or let it derive from `user.avatar_url`.
// Set `previewable` to true to allow clicking to view the full image.
export default function ProfileAvatar({
  user,
  src,
  name,
  className = 'size-10',
  rounded = 'rounded-full',
  fontSize = 'text-base',
  previewable = false,
  color,
}) {
  const displayName = name ?? user?.name ?? ''
  const imageSrc = src ?? user?.avatar_url ?? ''
  const avatarColor = color || user?.avatar_color || ''
  const [failed, setFailed] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [imageSrc])

  if (imageSrc && !failed) {
    return (
      <>
        <img
          src={imageSrc}
          alt={displayName || 'avatar'}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`shrink-0 object-cover ${rounded} ${className} ${previewable ? 'cursor-pointer' : ''}`}
          onClick={previewable ? (e) => { e.stopPropagation(); setPreviewOpen(true) } : undefined}
        />
        {previewable && (
          <ImagePreview src={imageSrc} alt={displayName} open={previewOpen} onClose={() => setPreviewOpen(false)} />
        )}
      </>
    )
  }

  return (
    <span
      className={`grid shrink-0 place-items-center font-black text-white ${rounded} ${className} ${
        avatarColor ? '' : 'bg-gradient-to-br from-green-400 to-emerald-600'
      }`}
      style={avatarColor ? { background: avatarColor } : undefined}
    >
      <span className={fontSize}>{displayName.trim().charAt(0) || '؟'}</span>
    </span>
  )
}
