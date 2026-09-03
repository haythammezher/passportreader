// Mock passport records — Backend integration point: replace with API/DB fetch

import { gregorianToHijri, calculateDaysRemaining, getPassportStatus, formatDateDisplay } from './hijri';

export interface PassportRecord {
  id: string;
  holderName: string;
  holderNameAr?: string;
  nationality: string;
  nationalityCode: string;
  flagEmoji: string;
  passportNumber: string;
  documentType: string;
  sex: 'M' | 'F';
  dateOfBirth: string; // ISO
  placeOfBirth: string;
  issueDate: string; // ISO
  expiryDate: string; // ISO
  issuingAuthority: string;
  issuingCountry: string;
  personalNumber?: string;
  mrzLine1: string;
  mrzLine2: string;
  mrzValid: boolean;
  notes?: string;
  createdAt: string;
}

export const mockPassports: PassportRecord[] = [
  {
    id: 'ppt-001',
    holderName: 'Mohammed Al-Rashidi',
    holderNameAr: 'محمد الراشدي',
    nationality: 'Saudi Arabian',
    nationalityCode: 'SAU',
    flagEmoji: '🇸🇦',
    passportNumber: 'A12345678',
    documentType: 'P',
    sex: 'M',
    dateOfBirth: '1985-03-14',
    placeOfBirth: 'Riyadh',
    issueDate: '2020-06-10',
    expiryDate: '2030-06-09',
    issuingAuthority: 'Directorate General of Passports',
    issuingCountry: 'SAU',
    personalNumber: 'SAU8503142M',
    mrzLine1: 'P<SAUALMRASHIDI<<MOHAMMED<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'A123456781SAU8503142M3006094<<<<<<<<<<<<<<<2',
    mrzValid: true,
    notes: 'Corporate travel — valid for all GCC countries',
    createdAt: '2024-01-15T09:30:00Z',
  },
  {
    id: 'ppt-002',
    holderName: 'Fatima Zahra Benali',
    nationality: 'Moroccan',
    nationalityCode: 'MAR',
    flagEmoji: '🇲🇦',
    passportNumber: 'CB987654',
    documentType: 'P',
    sex: 'F',
    dateOfBirth: '1992-11-28',
    placeOfBirth: 'Casablanca',
    issueDate: '2019-04-22',
    expiryDate: '2024-04-21',
    issuingAuthority: 'Direction Générale de la Sûreté Nationale',
    issuingCountry: 'MAR',
    mrzLine1: 'P<MARBENALI<<FATIMA<ZAHRA<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'CB9876540MAR9211284F2404218<<<<<<<<<<<<<<<4',
    mrzValid: true,
    notes: 'EXPIRED — renewal pending',
    createdAt: '2024-02-03T14:15:00Z',
  },
  {
    id: 'ppt-003',
    holderName: 'James O. Thornton',
    nationality: 'British',
    nationalityCode: 'GBR',
    flagEmoji: '🇬🇧',
    passportNumber: '539024716',
    documentType: 'P',
    sex: 'M',
    dateOfBirth: '1978-07-04',
    placeOfBirth: 'London',
    issueDate: '2022-09-15',
    expiryDate: '2032-09-14',
    issuingAuthority: 'His Majesty\'s Passport Office',
    issuingCountry: 'GBR',
    personalNumber: '<<<<<<<<<<<',
    mrzLine1: 'P<GBRTHORN TON<<JAMES<OLIVER<<<<<<<<<<<<<<<<<',
    mrzLine2: '5390247169GBR7807046M3209148<<<<<<<<<<<<<<<6',
    mrzValid: true,
    createdAt: '2024-02-20T11:00:00Z',
  },
  {
    id: 'ppt-004',
    holderName: 'Nadia Petrova',
    nationality: 'Russian',
    nationalityCode: 'RUS',
    flagEmoji: '🇷🇺',
    passportNumber: '720156834',
    documentType: 'P',
    sex: 'F',
    dateOfBirth: '1990-05-19',
    placeOfBirth: 'Moscow',
    issueDate: '2021-03-08',
    expiryDate: '2026-03-07',
    issuingAuthority: 'Federal Migration Service',
    issuingCountry: 'RUS',
    mrzLine1: 'P<RUSPETROVA<<NADIA<<<<<<<<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: '7201568340RUS9005196F2603070<<<<<<<<<<<<<<<8',
    mrzValid: true,
    createdAt: '2024-03-01T08:45:00Z',
  },
  {
    id: 'ppt-005',
    holderName: 'Carlos Eduardo Mendez',
    nationality: 'Colombian',
    nationalityCode: 'COL',
    flagEmoji: '🇨🇴',
    passportNumber: 'PE124578',
    documentType: 'P',
    sex: 'M',
    dateOfBirth: '1983-12-02',
    placeOfBirth: 'Bogotá',
    issueDate: '2023-08-14',
    expiryDate: '2033-08-13',
    issuingAuthority: 'Cancillería de Colombia',
    issuingCountry: 'COL',
    mrzLine1: 'P<COLMENDEZ<<CARLOS<EDUARDO<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'PE1245780COL8312020M3308130<<<<<<<<<<<<<<<2',
    mrzValid: true,
    createdAt: '2024-03-18T16:20:00Z',
  },
  {
    id: 'ppt-006',
    holderName: 'Amina Hassan Yusuf',
    nationality: 'Emirati',
    nationalityCode: 'ARE',
    flagEmoji: '🇦🇪',
    passportNumber: 'AC000123',
    documentType: 'P',
    sex: 'F',
    dateOfBirth: '1995-08-30',
    placeOfBirth: 'Dubai',
    issueDate: '2024-01-01',
    expiryDate: '2026-07-20',
    issuingAuthority: 'ICA — Federal Authority for Identity',
    issuingCountry: 'ARE',
    mrzLine1: 'P<AREYUSUF<<AMINA<HASSAN<<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'AC0001230ARE9508304F2607200<<<<<<<<<<<<<<<6',
    mrzValid: false,
    notes: 'Check digit mismatch on MRZ line 2 — re-verify document',
    createdAt: '2024-04-05T10:10:00Z',
  },
  {
    id: 'ppt-007',
    holderName: 'Hiroshi Tanaka',
    nationality: 'Japanese',
    nationalityCode: 'JPN',
    flagEmoji: '🇯🇵',
    passportNumber: 'TK4829301',
    documentType: 'P',
    sex: 'M',
    dateOfBirth: '1970-02-14',
    placeOfBirth: 'Tokyo',
    issueDate: '2023-11-20',
    expiryDate: '2033-11-19',
    issuingAuthority: 'Ministry of Foreign Affairs of Japan',
    issuingCountry: 'JPN',
    mrzLine1: 'P<JPNTANAKA<<HIROSHI<<<<<<<<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'TK48293010JPN7002144M3311190<<<<<<<<<<<<<<<4',
    mrzValid: true,
    createdAt: '2024-04-22T13:35:00Z',
  },
  {
    id: 'ppt-008',
    holderName: 'Priya Rajan Krishnamurthy',
    nationality: 'Indian',
    nationalityCode: 'IND',
    flagEmoji: '🇮🇳',
    passportNumber: 'R8820471',
    documentType: 'P',
    sex: 'F',
    dateOfBirth: '1988-09-12',
    placeOfBirth: 'Chennai',
    issueDate: '2022-05-03',
    expiryDate: '2032-05-02',
    issuingAuthority: 'Ministry of External Affairs',
    issuingCountry: 'IND',
    mrzLine1: 'P<INDKRISHNAMURTHY<<PRIYA<RAJAN<<<<<<<<<<<<<<<',
    mrzLine2: 'R88204710IND8809124F3205020<<<<<<<<<<<<<<<8',
    mrzValid: true,
    createdAt: '2024-05-09T09:00:00Z',
  },
  {
    id: 'ppt-009',
    holderName: 'Khalid Ibrahim Al-Farsi',
    nationality: 'Qatari',
    nationalityCode: 'QAT',
    flagEmoji: '🇶🇦',
    passportNumber: 'Q00451289',
    documentType: 'P',
    sex: 'M',
    dateOfBirth: '1980-06-22',
    placeOfBirth: 'Doha',
    issueDate: '2024-06-15',
    expiryDate: '2026-10-15',
    issuingAuthority: 'Ministry of Interior — Qatar',
    issuingCountry: 'QAT',
    mrzLine1: 'P<QATALFARSI<<KHALID<IBRAHIM<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'Q004512890QAT8006224M2610150<<<<<<<<<<<<<<<2',
    mrzValid: true,
    notes: 'Diplomatic category — expedited processing',
    createdAt: '2024-06-20T07:30:00Z',
  },
  {
    id: 'ppt-010',
    holderName: 'Sophie van den Berg',
    nationality: 'Dutch',
    nationalityCode: 'NLD',
    flagEmoji: '🇳🇱',
    passportNumber: 'NX8134562',
    documentType: 'P',
    sex: 'F',
    dateOfBirth: '1993-04-17',
    placeOfBirth: 'Amsterdam',
    issueDate: '2021-07-28',
    expiryDate: '2031-07-27',
    issuingAuthority: 'Basisregistratie Personen',
    issuingCountry: 'NLD',
    mrzLine1: 'P<NLDVAN<DEN<BERG<<SOPHIE<<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'NX81345620NLD9304176F3107270<<<<<<<<<<<<<<<6',
    mrzValid: true,
    createdAt: '2024-07-01T15:45:00Z',
  },
  {
    id: 'ppt-011',
    holderName: 'Yusuf Abdi Omar',
    nationality: 'Kenyan',
    nationalityCode: 'KEN',
    flagEmoji: '🇰🇪',
    passportNumber: 'AK7732910',
    documentType: 'P',
    sex: 'M',
    dateOfBirth: '1975-11-03',
    placeOfBirth: 'Nairobi',
    issueDate: '2020-02-19',
    expiryDate: '2025-02-18',
    issuingAuthority: 'Department of Immigration Services',
    issuingCountry: 'KEN',
    mrzLine1: 'P<KENOMAR<<YUSUF<ABDI<<<<<<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'AK77329100KEN7511034F2502180<<<<<<<<<<<<<<<4',
    mrzValid: true,
    notes: 'Renewal reminder sent — 2 months remaining',
    createdAt: '2024-07-14T11:20:00Z',
  },
  {
    id: 'ppt-012',
    holderName: 'Elena Vasquez Torres',
    nationality: 'Spanish',
    nationalityCode: 'ESP',
    flagEmoji: '🇪🇸',
    passportNumber: 'PAF123890',
    documentType: 'P',
    sex: 'F',
    dateOfBirth: '1997-08-25',
    placeOfBirth: 'Barcelona',
    issueDate: '2023-01-10',
    expiryDate: '2033-01-09',
    issuingAuthority: 'Dirección General de la Policía',
    issuingCountry: 'ESP',
    mrzLine1: 'P<ESPVASQUEZ<TORRES<<ELENA<<<<<<<<<<<<<<<<<<<<',
    mrzLine2: 'PAF1238900ESP9708258F3301090<<<<<<<<<<<<<<<8',
    mrzValid: true,
    createdAt: '2024-08-02T14:00:00Z',
  },
];

export interface EnrichedPassport extends PassportRecord {
  daysRemaining: number;
  status: 'valid' | 'expiring' | 'expired';
  expiryHijri: string;
  issueDateHijri: string;
  dobHijri: string;
  expiryFormatted: string;
  issueDateFormatted: string;
  dobFormatted: string;
}

export function enrichPassport(p: PassportRecord): EnrichedPassport {
  const expiryDate = new Date(p.expiryDate);
  const issueDate = new Date(p.issueDate);
  const dob = new Date(p.dateOfBirth);
  const daysRemaining = calculateDaysRemaining(expiryDate);
  const status = getPassportStatus(daysRemaining);
  return {
    ...p,
    daysRemaining,
    status,
    expiryHijri: gregorianToHijri(expiryDate).formatted,
    issueDateHijri: gregorianToHijri(issueDate).formatted,
    dobHijri: gregorianToHijri(dob).formatted,
    expiryFormatted: formatDateDisplay(expiryDate),
    issueDateFormatted: formatDateDisplay(issueDate),
    dobFormatted: formatDateDisplay(dob),
  };
}

export const enrichedPassports: EnrichedPassport[] = mockPassports.map(enrichPassport);