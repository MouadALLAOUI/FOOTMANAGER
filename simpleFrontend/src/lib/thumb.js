// Converts full backend storage URLs (http://localhost:8000/storage/...)
// to relative path /storage/... so requests pass through same-origin Vite proxy
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const cleaned = url.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):8000\/storage\//, '/storage/');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://') && !cleaned.startsWith('/') && !cleaned.startsWith('data:')) {
    return `/storage/${cleaned}`;
  }
  return cleaned;
}

// Returns the thumbnail URL when available, falling back to the full image.
// Thumbnail fields follow the backend convention: `<field>_url` -> `<field>_thumbnail_url`
// (e.g. logo_url -> logo_thumbnail_url, image_url -> thumbnail_url).
export function thumb(record, field, fallback = '') {
  if (!record) return fallback || '';
  const thumbField = field.replace(/_url$/, '_thumbnail_url');
  const raw = record[thumbField] || record[field] || fallback || '';
  return normalizeImageUrl(raw);
}

export function logoThumb(team, fallback = '') {
  return thumb(team, 'logo_url', fallback);
}

export function photoThumb(profile, fallback = '') {
  return thumb(profile, 'photo_url', fallback) || thumb(profile, 'avatar_url', fallback);
}

export function avatarThumb(user, fallback = '') {
  return thumb(user, 'avatar_url', fallback);
}

export function coverThumb(record, fallback = '') {
  if (!record) return fallback || '';
  const raw =
    record.thumbnail_url ||
    record.cover_thumbnail_url ||
    record.cover_image_url ||
    record.image_url ||
    (Array.isArray(record.images) && (record.images[0]?.thumbnail_url || record.images[0]?.image_url || (typeof record.images[0] === 'string' ? record.images[0] : null))) ||
    record.cover_image ||
    record.image ||
    fallback ||
    '';
  return normalizeImageUrl(raw);
}
