const KNOWN_MESSAGES = [
  { re: /محجوز مسبقاً عبر أبونمان أسبوعي/, key: 'match.timeReservedWeekly' },
  { re: /محجوز بالفعل في التاريخ المحدد/, key: 'match.timeReserved' },
  { re: /يجب اختيار ملعب أو كتابة اسم ملعب/, key: 'match.stadiumOrTerrainRequired' },
  { re: /الملعب مغلق حالياً/, key: 'match.terrainClosed' },
  { re: /يجب إنشاء ملف الفريق أولاً/, key: 'match.teamRequired' },
  { re: /طلب إلغاء موجود بالفعل/, key: 'booking.cancelExists' },
  { re: /مرتبط بالفعل بطلب مباراة/, key: 'booking.alreadyLinked' },
  { re: /يجب أن يكون الحجز مؤكداً أولاً/, key: 'booking.notApproved' },
  { re: /لا يوافق يوم الحجز الأسبوعي/, key: 'booking.weeklyDayMismatch' },
  { re: /لا يمكن إنشاء مباراة في وقت مضى/, key: 'match.pastMatchNotAllowed' },
  { re: /قبل مرور ساعة/, key: 'match.scoreLocked' },
];

export function resolveApiError(err, t) {
  const data = err?.response?.data;
  const messages = [];
  if (data?.errors) {
    Object.values(data.errors).flat().forEach((m) => messages.push(m));
  }
  if (data?.message) {
    messages.push(data.message);
  }
  for (const msg of messages) {
    const hit = KNOWN_MESSAGES.find((k) => k.re.test(msg || ''));
    if (hit) return t(hit.key);
  }
  return t('common.error');
}
