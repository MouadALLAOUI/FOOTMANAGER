// Returns the thumbnail URL when available, falling back to the full image.
// Thumbnail fields follow the backend convention: `<field>_url` -> `<field>_thumbnail_url`
// (e.g. logo_url -> logo_thumbnail_url, image_url -> thumbnail_url).
export function thumb(record, field, fallback = '') {
  if (!record) return fallback || '';
  const thumbField = field.replace(/_url$/, '_thumbnail_url');
  return record[thumbField] || record[field] || fallback || '';
}

export function logoThumb(team, fallback = '') {
  return thumb(team, 'logo_url', fallback);
}

export function photoThumb(profile, fallback = '') {
  return thumb(profile, 'photo_url', fallback) || thumb(profile, 'avatar_url', fallback);
}

export function coverThumb(record, fallback = '') {
  if (!record) return fallback || '';
  return record.cover_thumbnail_url || record.cover_image_url || fallback || '';
}
