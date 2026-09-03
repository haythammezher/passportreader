// Hijri (Islamic) calendar conversion utilities
// Backend integration point: replace with a server-side calendar API if needed for precision

export interface HijriDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  monthNameAr: string;
  formatted: string;
  formattedAr: string;
}

const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', "Rabi\' al-Awwal", "Rabi\' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha\'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi\'dah", 'Dhu al-Hijjah',
];

const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

/**
 * Converts a Gregorian date to Hijri (Islamic calendar)
 * Uses the Tabular Islamic Calendar algorithm (Kuwaiti algorithm variant)
 */
export function gregorianToHijri(date: Date): HijriDate {
  const jd = gregorianToJulian(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const { year, month, day } = julianToHijri(jd);
  const monthName = HIJRI_MONTHS_EN[month - 1] || 'Unknown';
  const monthNameAr = HIJRI_MONTHS_AR[month - 1] || '';
  return {
    year,
    month,
    day,
    monthName,
    monthNameAr,
    formatted: `${day} ${monthName} ${year} AH`,
    formattedAr: `${day} ${monthNameAr} ${year} هـ`,
  };
}

function gregorianToJulian(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524;
}

function julianToHijri(jd: number): { year: number; month: number; day: number } {
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const ll = l - 10631 * n + 354;
  const j = Math.floor((10985 - ll) / 5316) * Math.floor(50 * ll / 17719) +
    Math.floor(ll / 5670) * Math.floor(43 * ll / 15238);
  const lll = ll - Math.floor((30 - j) / 15) * Math.floor(17719 * j / 50) -
    Math.floor(j / 16) * Math.floor(15238 * j / 43) + 29;
  let month = Math.floor(24 * lll / 709);
  const day = lll - Math.floor(709 * month / 24);
  let year = 30 * n + j - 30;
  return { year, month, day };
}

export function calculateDaysRemaining(expiryDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getPassportStatus(daysRemaining: number): 'valid' | 'expiring' | 'expired' {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 180) return 'expiring';
  return 'valid';
}

export function calculateAge(dob: Date, referenceDate?: Date): number {
  const ref = referenceDate || new Date();
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
}

export function formatDateDisplay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d} / ${m} / ${y}`;
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseMRZDate(mrzDate: string): Date | null {
  if (!mrzDate || mrzDate.length !== 6) return null;
  const yearRaw = parseInt(mrzDate.substring(0, 2), 10);
  let month = parseInt(mrzDate.substring(2, 4), 10);
  const day = parseInt(mrzDate.substring(4, 6), 10);
  const currentYear = new Date().getFullYear();
  const century = yearRaw + 2000 > currentYear + 10 ? 1900 : 2000;
  let year = century + yearRaw;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
}

export function calculateMRZCheckDigit(data: string): number {
  const weights = [7, 3, 1];
  const charValues: Record<string, number> = {};
  '<'.split('').forEach(c => { charValues[c] = 0; });
  '0123456789'.split('').forEach((c, i) => { charValues[c] = i; });
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => { charValues[c] = i + 10; });
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i].toUpperCase();
    const val = charValues[char] ?? 0;
    sum += val * weights[i % 3];
  }
  return sum % 10;
}

export function validateMRZCheckDigit(data: string, checkDigit: string): boolean {
  const calculated = calculateMRZCheckDigit(data);
  return calculated === parseInt(checkDigit, 10);
}