import type { Lang } from './format';

const CITIES: Record<string, { en: string; ar: string }> = {
  damascus: { en: 'Damascus', ar: 'دمشق' },
  swida: { en: 'Swida', ar: 'السويداء' },
  aleppo: { en: 'Aleppo', ar: 'حلب' },
  homs: { en: 'Homs', ar: 'حمص' },
  hama: { en: 'Hama', ar: 'حماة' },
  latakia: { en: 'Latakia', ar: 'اللاذقية' },
  tartus: { en: 'Tartus', ar: 'طرطوس' },
  daraa: { en: 'Daraa', ar: 'درعا' },
  deir: { en: 'Deir ez-Zor', ar: 'دير الزور' },
  idlib: { en: 'Idlib', ar: 'إدلب' },
  raqqa: { en: 'Raqqa', ar: 'الرقة' },
  hasakah: { en: 'Al-Hasakah', ar: 'الحسكة' },
  qamishli: { en: 'Qamishli', ar: 'القامشلي' },
  palmyra: { en: 'Palmyra', ar: 'تدمر' },
};

export function cityLabel(id: string, lang: Lang): string {
  return CITIES[id]?.[lang] ?? id;
}
