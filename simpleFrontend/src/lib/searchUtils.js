/**
 * تطبيع النصوص العربية لتسهيل البحث وتجاهل الهمزات وعلامات التشكيل والتاء المربوطة
 * (Arabic Text Normalization for Flexible Search)
 */
export function normalizeArabicText(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .trim()
    .toLowerCase()
    // إزالة علامات التشكيل والتنوين
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // توحيد الهمزات والألف (أ, إ, آ, ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // توحيد التاء المربوطة والهاء (ة -> ه)
    .replace(/[ة]/g, 'ه')
    // توحيد الياء والألف المقصورة (ى -> ي)
    .replace(/[ى]/g, 'ي')
    // توحيد الواو المهموزة (ؤ -> و)
    .replace(/[ؤ]/g, 'و')
    // توحيد النبرة والياء المهموزة (ئ -> ي)
    .replace(/[ئ]/g, 'ي')
    // إزالة الكشيدة والتطويل
    .replace(/\u0640/g, '')
}

/**
 * فحص تطابق النص مع استعلام البحث بمرونة تامة مع تجاهل الهمزات
 */
export function matchesArabicSearch(target, query) {
  if (!query) return true
  const normQ = normalizeArabicText(query)
  if (!normQ) return true
  const normTarget = normalizeArabicText(target)
  return normTarget.includes(normQ)
}
