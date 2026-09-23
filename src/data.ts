export interface City {
  id: string;
  en: string;
  ar: string;
}

export interface Company {
  id: string;
  en: string;
  ar: string;
  color: string;
}

export interface Road {
  from: string;
  to: string;
  minutes: number;
  /** Cheapest economy seat, in Syrian pounds. Sample fare for the demo. */
  base: number;
}

export const CITIES: readonly City[] = [
  { id: 'damascus', en: 'Damascus', ar: 'دمشق' },
  { id: 'swida', en: 'Swida', ar: 'السويداء' },
  { id: 'aleppo', en: 'Aleppo', ar: 'حلب' },
  { id: 'homs', en: 'Homs', ar: 'حمص' },
  { id: 'hama', en: 'Hama', ar: 'حماة' },
  { id: 'latakia', en: 'Latakia', ar: 'اللاذقية' },
  { id: 'tartus', en: 'Tartus', ar: 'طرطوس' },
  { id: 'daraa', en: 'Daraa', ar: 'درعا' },
  { id: 'deir', en: 'Deir ez-Zor', ar: 'دير الزور' },
  { id: 'idlib', en: 'Idlib', ar: 'إدلب' },
  { id: 'raqqa', en: 'Raqqa', ar: 'الرقة' },
  { id: 'hasakah', en: 'Al-Hasakah', ar: 'الحسكة' },
  { id: 'qamishli', en: 'Qamishli', ar: 'القامشلي' },
  { id: 'palmyra', en: 'Palmyra', ar: 'تدمر' },
];

export const COMPANIES: readonly Company[] = [
  { id: 'shamline', en: 'Sham Line', ar: 'خط الشام', color: '#0e6b4f' },
  { id: 'barada', en: 'Barada Express', ar: 'بردى إكسبريس', color: '#1f4e79' },
  { id: 'qasioun', en: 'Qasioun Coach', ar: 'باصات قاسيون', color: '#8a5a12' },
  { id: 'orontes', en: 'Orontes', ar: 'العاصي', color: '#6b3fa0' },
  { id: 'jabal', en: 'Jabal Coach', ar: 'باصات الجبل', color: '#9c3b2e' },
];

/** Undirected roads. Both directions share the ride time and the base fare. */
const ROADS: readonly Road[] = [
  { from: 'damascus', to: 'swida', minutes: 135, base: 75000 },
  { from: 'damascus', to: 'daraa', minutes: 80, base: 45000 },
  { from: 'damascus', to: 'homs', minutes: 110, base: 65000 },
  { from: 'damascus', to: 'hama', minutes: 150, base: 80000 },
  { from: 'damascus', to: 'aleppo', minutes: 280, base: 140000 },
  { from: 'damascus', to: 'latakia', minutes: 240, base: 130000 },
  { from: 'damascus', to: 'tartus', minutes: 200, base: 110000 },
  { from: 'damascus', to: 'palmyra', minutes: 150, base: 90000 },
  { from: 'damascus', to: 'deir', minutes: 390, base: 180000 },
  { from: 'homs', to: 'hama', minutes: 45, base: 30000 },
  { from: 'homs', to: 'tartus', minutes: 90, base: 55000 },
  { from: 'homs', to: 'latakia', minutes: 150, base: 85000 },
  { from: 'hama', to: 'aleppo', minutes: 120, base: 70000 },
  { from: 'aleppo', to: 'latakia', minutes: 160, base: 90000 },
  { from: 'aleppo', to: 'idlib', minutes: 70, base: 40000 },
  { from: 'aleppo', to: 'raqqa', minutes: 160, base: 95000 },
  { from: 'raqqa', to: 'deir', minutes: 140, base: 80000 },
  { from: 'raqqa', to: 'hasakah', minutes: 180, base: 100000 },
  { from: 'hasakah', to: 'qamishli', minutes: 80, base: 45000 },
  { from: 'latakia', to: 'tartus', minutes: 75, base: 40000 },
];

export const POPULAR_ROUTES: readonly (readonly [string, string])[] = [
  ['damascus', 'swida'],
  ['damascus', 'aleppo'],
  ['damascus', 'latakia'],
  ['damascus', 'tartus'],
  ['aleppo', 'damascus'],
  ['homs', 'tartus'],
];

export function cityById(id: string): City | undefined {
  return CITIES.find((city) => city.id === id);
}

export function companyById(id: string): Company {
  return COMPANIES.find((company) => company.id === id) ?? COMPANIES[0]!;
}

export function roadBetween(from: string, to: string): Road | undefined {
  return ROADS.find(
    (road) =>
      (road.from === from && road.to === to) || (road.from === to && road.to === from),
  );
}

export function lowestFare(from: string, to: string): number | null {
  const road = roadBetween(from, to);
  if (!road) return null;
  return Math.round(road.base / 5000) * 5000;
}
