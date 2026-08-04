import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  ArrowLeft, MapPin, Loader2, Banknote,
  Image as ImageIcon,
  Pencil, X, Upload, Trash2, Check, Globe,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
} from 'lucide-react';

const TYPE_MAP = {
  minifoot: { emoji: '⚽', color: 'bg-green-100 text-green-700' },
  salle: { emoji: '🏟️', color: 'bg-blue-100 text-blue-700' },
  grass: { emoji: '🌿', color: 'bg-emerald-100 text-emerald-700' },
  synthetic: { emoji: '🟩', color: 'bg-teal-100 text-teal-700' },
  cement: { emoji: '🧱', color: 'bg-orange-100 text-orange-700' },
};

const FORMATS = ['5v5', '7v7', '9v9', '11v11'];

const TERRAIN_TYPES = [
  { value: 'salle', icon: '🏟️' },
  { value: 'synthetic', icon: '🟩' },
  { value: 'cement', icon: '🧱' },
];

export default function TerrainDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [terrain, setTerrain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [facilities, setFacilities] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [zoom, setZoom] = useState(1);

  const [form, setForm] = useState({
    name: '', city: '', address: '', google_maps_url: '',
    type: 'salle', player_format: '7v7',
    has_benches: false, supports_tournaments: false,
    has_lighting: false, has_vestiaires: false,
    price_per_team: '',
    facility_ids: [],
  });

  const fetchTerrain = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/owner/terrains/${id}`);
      setTerrain(res.data.terrain);
      const t = res.data.terrain;
      setForm({
        name: t.name || '', city: t.city || '', address: t.address || '',
        google_maps_url: t.google_maps_url || '', type: t.type || 'salle',
        player_format: t.player_format || '7v7',
        has_benches: !!t.has_benches, supports_tournaments: !!t.supports_tournaments,
        has_lighting: !!t.has_lighting, has_vestiaires: !!t.has_vestiaires,
        price_per_team: t.price_per_team ?? '',
        facility_ids: t.facilities?.map((f) => f.id) || [],
      });
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTerrain(); }, [id]);

  const images = terrain?.images || [];

  const handleKeyDown = useCallback((e) => {
    if (viewerIndex === null) return;
    if (e.key === 'Escape') { setViewerIndex(null); setZoom(1); }
    if (e.key === 'ArrowLeft') setViewerIndex((prev) => prev > 0 ? prev - 1 : images.length - 1);
    if (e.key === 'ArrowRight') setViewerIndex((prev) => prev < images.length - 1 ? prev + 1 : 0);
  }, [viewerIndex, terrain?.images?.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/facilities');
        setFacilities(res.data.facilities || []);
      } catch {}
    })();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFacility = (facId) => {
    setForm((prev) => {
      const ids = prev.facility_ids || [];
      const next = ids.includes(facId) ? ids.filter((id) => id !== facId) : [...ids, facId];
      return { ...prev, facility_ids: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/owner/terrains/${id}`, form);
      setTerrain(res.data.terrain);
      setEditing(false);
    } catch {}
    finally { setSaving(false); }
  };

  const handleCancelEdit = () => {
    const t = terrain;
    setForm({
      name: t.name || '', city: t.city || '', address: t.address || '',
      google_maps_url: t.google_maps_url || '', type: t.type || 'salle',
      player_format: t.player_format || '7v7',
      has_benches: !!t.has_benches, supports_tournaments: !!t.supports_tournaments,
      has_lighting: !!t.has_lighting, has_vestiaires: !!t.has_vestiaires,
      price_per_team: t.price_per_team ?? '',
      facility_ids: t.facilities?.map((f) => f.id) || [],
    });
    setEditing(false);
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('images[]', f));
    try {
      await api.post(`/owner/terrains/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchTerrain();
    } catch {}
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm(t('terrain.deleteImageConfirm'))) return;
    try {
      await api.delete(`/owner/terrains/${id}/images/${imageId}`);
      await fetchTerrain();
    } catch {}
  };

  const handleToggleOpen = async () => {
    try {
      const res = await api.put(`/owner/terrains/${id}/toggle-status`, {
        is_open: !terrain.is_open,
      });
      setTerrain((prev) => ({ ...prev, ...res.data.terrain }));
    } catch {}
  };

  const handleToggleAvailable = async () => {
    try {
      const res = await api.put(`/owner/terrains/${id}`, {
        is_available: !terrain.is_available,
      });
      setTerrain(res.data.terrain);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!terrain) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">{t('terrain.notFound')}</p>
        <button onClick={() => navigate('/terrain/my-terrains')} className="mt-4 text-emerald-600 underline text-sm">{t('common.back')}</button>
      </div>
    );
  }

  const typeInfo = TYPE_MAP[terrain.type] || TYPE_MAP.salle;
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none';
  const labelClass = 'block text-xs font-bold text-gray-500 mb-1';

  return (
    <><div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/terrain/my-terrains')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft size={16} /> {t('terrain.backToMyTerrains')}
        </button>
        <div className="flex gap-2">
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm transition">
              <Pencil size={14} /> {t('common.edit')}
            </button>
          ) : (
            <>
              <button onClick={handleCancelEdit} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition">
                <X size={14} /> {t('common.cancel')}
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {t('terrainForm.saveEdits')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hero Image */}
      <div className="bg-gray-100 rounded-2xl overflow-hidden h-48 sm:h-64 flex items-center justify-center relative">
        {images.length > 0 ? (
          <button onClick={() => { setViewerIndex(0); setZoom(1); }} className="w-full h-full p-0 border-0">
            <img src={images[0].image_url} alt={terrain.name} className="w-full h-full object-cover cursor-pointer" />
          </button>
        ) : (
          <div className="text-center text-gray-300">
            <ImageIcon size={48} className="mx-auto mb-2" />
            <span className="text-sm">{t('terrain.noImages')}</span>
          </div>
        )}
        {editing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {t('terrain.changeImage')}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            {images.length > 1 && (
              <button
                onClick={() => handleDeleteImage(images[0].id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition"
              >
                <Trash2 size={14} /> {t('common.delete')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Type & Format */}
          {editing ? (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('terrain.type')}</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {TERRAIN_TYPES.map((type) => (
                    <button key={type.value} type="button" onClick={() => handleChange('type', type.value)}
                      className={`p-2 rounded-xl border-2 text-center transition ${form.type === type.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-xl mb-0.5">{type.icon}</div>
                      <div className="text-xs font-bold text-gray-800">{t(`terrain.${type.value}`)}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('terrain.playerFormat')}</label>
                <div className="flex gap-2">
                  {FORMATS.map((f) => (
                    <button key={f} type="button" onClick={() => handleChange('player_format', f)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition ${form.player_format === f ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('terrain.terrainName')}</label>
                  <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('terrain.city')}</label>
                  <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('terrain.address')}</label>
                <input type="text" value={form.address} onChange={(e) => handleChange('address', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}><Globe size={12} className="inline ms-1" />{t('terrainForm.googleMapsLink')}</label>
                <input type="url" value={form.google_maps_url} onChange={(e) => handleChange('google_maps_url', e.target.value)} className={inputClass} placeholder="https://maps.google.com/..." />
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                    {typeInfo.emoji} {t(`terrain.${terrain.type}`)}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {terrain.player_format}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-800">{terrain.name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  <MapPin size={14} className="inline ms-1" />
                  {terrain.city}{terrain.address ? ` — ${terrain.address}` : ''}
                </p>
              </div>
            </>
          )}

          {/* Pricing */}
          {editing ? (
            <div>
              <label className={labelClass}><Banknote size={12} className="inline ms-1" />{t('terrainForm.priceLabel')}</label>
              <input type="number" min="0" step="10" value={form.price_per_team} onChange={(e) => handleChange('price_per_team', e.target.value)}
                className={inputClass} placeholder={t('terrainForm.pricePlaceholder')} />
            </div>
          ) : (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <h3 className="text-sm font-bold text-emerald-800 mb-2">{t('terrain.pricing')}</h3>
              <div>
                <span className="text-xs text-emerald-600">{t('terrain.bookingPrice')}</span>
                <p className="text-lg font-black text-emerald-800">{terrain.price_per_team} {t('common.currency')}</p>
              </div>
            </div>
          )}

          {/* Facilities */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">{t('terrainForm.facilitiesLabel')}</h3>
            {editing ? (
              <div className="grid grid-cols-2 gap-2">
                {facilities.map((fac) => (
                  <label key={fac.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${form.facility_ids?.includes(fac.id) ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={form.facility_ids?.includes(fac.id)} onChange={() => toggleFacility(fac.id)} className="sr-only" />
                    <span className="text-xl">{fac.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{fac.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {terrain.facilities?.length > 0 ? terrain.facilities.map((fac) => (
                  <span key={fac.id} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                    <span>{fac.icon}</span> {fac.name}
                  </span>
                )) : (
                  <span className="text-xs text-gray-300">{t('terrain.noFacilities')}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">{t('terrain.status')}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('terrain.openForBookings')}</span>
                <button onClick={handleToggleOpen}
                  className={`text-xs px-2.5 py-1 rounded-full font-bold transition ${terrain.is_open ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                  {terrain.is_open ? t('common.yes') : t('common.no')}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('terrain.availableForDirectBooking')}</span>
                <button onClick={handleToggleAvailable}
                  className={`text-xs px-2.5 py-1 rounded-full font-bold transition ${terrain.is_available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                  {terrain.is_available ? t('common.yes') : t('common.no')}
                </button>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          {terrain.schedules?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">{t('terrain.workingHours')}</h3>
              <div className="space-y-1 text-xs text-gray-600">
                {[0,1,2,3,4,5,6].map((dow) => {
                  const s = terrain.schedules.find((s) => s.day_of_week === dow);
                  return (
                    <div key={dow} className="flex items-center justify-between">
                      <span>{t(`weekdays.${DAY_NAMES[dow]}`)}</span>
                      <span className={s?.is_active ? 'text-gray-700 font-medium' : 'text-gray-300'}>
                        {s?.is_active ? `${s.open_time} — ${s.close_time}` : t('common.closed')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Images Gallery */}
          {images.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-700">{t('terrain.images')} ({images.length})</h3>
                {editing && (
                  <button onClick={() => fileInputRef.current?.click()} className="text-[10px] text-emerald-600 font-bold hover:underline">
                    + {t('terrain.add')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={img.id} className="relative group">
                    <button onClick={() => { setViewerIndex(i); setZoom(1); }} className="w-full p-0 border-0">
                      <img src={img.image_url} alt="" className="w-full h-16 object-cover rounded-lg cursor-pointer" />
                    </button>
                    {editing && (
                      <button onClick={() => handleDeleteImage(img.id)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                        <Trash2 size={14} className="text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          {terrain.google_maps_url && (
            terrain.google_maps_url.includes('/embed/') || terrain.google_maps_url.includes('output=embed') ? (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  src={terrain.google_maps_url}
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Google Maps"
                />
              </div>
            ) : (
              <a href={terrain.google_maps_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200 hover:bg-red-100 transition">
                <MapPin size={14} /> {t('terrain.viewOnGoogleMaps')}
              </a>
            )
          )}
        </div>
      </div>
    </div>

      {/* Image Viewer Modal */}
      {viewerIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => { setViewerIndex(null); setZoom(1); }}>
          <button onClick={() => { setViewerIndex(null); setZoom(1); }}
            className="absolute top-4 end-4 text-white/70 hover:text-white transition z-10">
            <X size={28} />
          </button>

          <div className="absolute bottom-6 start-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 px-4 py-2 rounded-full">
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="text-white/70 hover:text-white transition disabled:opacity-30" disabled={zoom <= 0.5}>
              <ZoomOut size={18} />
            </button>
            <span className="text-white/70 text-xs min-w-[3ch] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="text-white/70 hover:text-white transition disabled:opacity-30" disabled={zoom >= 3}>
              <ZoomIn size={18} />
            </button>
          </div>

          <button onClick={(e) => { e.stopPropagation(); setViewerIndex((prev) => prev > 0 ? prev - 1 : images.length - 1); }}
            className="absolute start-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition">
            <ChevronRight size={36} />
          </button>

          <button onClick={(e) => { e.stopPropagation(); setViewerIndex((prev) => prev < images.length - 1 ? prev + 1 : 0); }}
            className="absolute end-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition">
            <ChevronLeft size={36} />
          </button>

          <div className="absolute top-4 start-4 bg-black/50 text-white/70 text-xs px-3 py-1 rounded-full">
            {viewerIndex + 1} / {images.length}
          </div>

          <img
            src={images[viewerIndex]?.image_url}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain transition-transform duration-200 select-none"
            style={{ transform: `scale(${zoom})`, cursor: zoom > 1 ? 'grab' : 'default' }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      )}
  </>
  );
}
