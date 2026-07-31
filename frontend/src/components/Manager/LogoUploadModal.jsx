import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Loader2, AlertCircle, Image } from 'lucide-react';
import api from '../../services/api';

export default function LogoUploadModal({ currentLogo, onClose, onUploaded }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentLogo || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (selected) => {
    setError('');
    if (!selected) return;

    if (selected.size > 2 * 1024 * 1024) {
      setError(t('profile.logoTooLarge'));
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(selected.type)) {
      setError(t('profile.logoInvalidType'));
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    handleFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/manager/team-profile/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(res.data);
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors?.logo) {
        setError(errors.logo[0]);
      } else {
        setError(err.response?.data?.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{t('profile.changeLogo')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-green-400 rounded-xl p-6 text-center cursor-pointer transition"
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files[0])}
              className="hidden"
            />

            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-28 h-28 rounded-full object-cover border-4 border-gray-100"
                />
                <p className="text-sm text-gray-500">{t('profile.clickOrDrag')}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                  <Image className="text-gray-400" size={32} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('profile.dragLogoHere')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('profile.logoFormats')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {loading ? t('common.submitting') : t('profile.saveLogo')}
          </button>
        </div>
      </div>
    </div>
  );
}
