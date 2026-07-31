import i18n from '../i18n';

const localeOf = () => (i18n.language === 'ar' ? 'ar-MA' : 'en-US');

export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(localeOf(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
};

export const formatTime = (dateString, options = {}) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(localeOf(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  });
};

export const formatDateTime = (dateString, dateOptions = {}, timeOptions = {}) => {
  if (!dateString) return '';
  return `${formatDate(dateString, dateOptions)} — ${formatTime(dateString, timeOptions)}`;
};
