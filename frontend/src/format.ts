export type Lang = 'en' | 'ar';

export function todayISO(now = new Date()): string {
  return toISODate(now);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year!, (month ?? 1) - 1, day, 12, 0, 0, 0);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function localeFor(lang: Lang): string {
  return lang === 'ar' ? 'ar-SY' : 'en-GB';
}

export function formatAmount(amount: number, lang: Lang): string {
  return new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 0 }).format(amount);
}

export function formatMoney(amount: number, lang: Lang): string {
  const amountText = formatAmount(amount, lang);
  return lang === 'ar' ? `${amountText} ل.س` : `${amountText} SYP`;
}

export function formatTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeFor(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export function formatLongDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeFor(lang), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parseISODate(iso));
}

export function formatTicketWhen(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeFor(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

export function formatDuration(minutes: number, lang: Lang): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const number = new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 0 });
  if (lang === 'ar') {
    if (hours && rest) return `${number.format(hours)} س ${number.format(rest)} د`;
    if (hours) return `${number.format(hours)} س`;
    return `${number.format(rest)} د`;
  }
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
}

export function formatPhone(phone: string): string {
  if (phone.length !== 10) return phone;
  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}
