import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import { toastApiError } from '../../lib/errors'
import { avatarThumb } from '../../lib/thumb'
import ProfileAvatar from './ProfileAvatar'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 4 * 1024 * 1024

// Reusable profile-picture uploader for any authenticated role.
// Handles: current image, upload, preview, replace, remove, loading, error, success.
export default function ProfileImageUploader({
  user,
  size = 'size-24',
  rounded = 'rounded-3xl',
  fontSize = 'text-4xl',
  onUpdated,
}) {
  const { t } = useTranslation()
  const { updateUser } = useAuth()
  const { toast } = useToast()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState('')
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')

  const src = preview || avatarThumb(user)

  const applyUser = (fresh) => {
    updateUser({ ...user, ...fresh })
    onUpdated?.(fresh)
  }

  const pick = () => {
    setError('')
    inputRef.current?.click()
  }

  const onSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t('profile.avatar.invalidType'))
      return
    }

    if (file.size > MAX_SIZE) {
      setError(t('profile.avatar.tooLarge'))
      return
    }

    setError('')
    setPreview(URL.createObjectURL(file))
    setBusy('upload')

    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await api.post('/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      applyUser(res.data.user)
      toast.success(res.data.message || t('profile.avatar.uploaded'))
    } catch (e) {
      const msg = e.response?.data?.message || t('profile.avatar.uploadFailed')
      setError(msg)
      toastApiError(e, t)
    } finally {
      setBusy('')
      setPreview('')
    }
  }

  const remove = async () => {
    if (!src || busy) return
    setError('')
    setBusy('remove')

    try {
      const res = await api.delete('/me/avatar')
      applyUser(res.data.user)
      toast.success(res.data.message || t('profile.avatar.removed'))
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="inline-block">
      <div className="relative">
        <ProfileAvatar user={user} src={src} className={`${size} ${rounded}`} rounded={rounded} fontSize={fontSize} />

        <button
          type="button"
          onClick={pick}
          disabled={busy === 'upload'}
          title={t('profile.avatar.upload')}
          aria-label={t('profile.avatar.upload')}
          className="absolute -bottom-2 -end-2 grid size-9 place-items-center rounded-xl bg-green-500 text-white shadow-[0_8px_20px_rgba(22,163,74,0.35)] transition-all hover:bg-green-600 active:scale-95 disabled:opacity-60"
        >
          {busy === 'upload' ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </button>

        {src && busy !== 'upload' && (
          <button
            type="button"
            onClick={remove}
            disabled={busy === 'remove'}
            title={t('profile.avatar.remove')}
            aria-label={t('profile.avatar.remove')}
            className="absolute -bottom-2 -start-2 grid size-9 place-items-center rounded-xl bg-white text-rose-500 shadow-[0_8px_20px_rgba(15,23,42,0.14)] ring-1 ring-rose-100 transition-all hover:bg-rose-50 active:scale-95 disabled:opacity-60"
          >
            {busy === 'remove' ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onSelect}
      />

      {error && (
        <p className="mt-2 max-w-44 text-center text-[11px] font-bold text-rose-500">{error}</p>
      )}
    </div>
  )
}
