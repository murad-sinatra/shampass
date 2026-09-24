export const AMENITIES = ['ac', 'usb', 'wifi', 'water', 'reclining'] as const;
export type AmenityId = (typeof AMENITIES)[number];

export const SEAT_CLASSES = ['premium', 'comfort', 'economy'] as const;
export type SeatClassId = (typeof SEAT_CLASSES)[number];

export interface LayoutSeat {
  label: string;
  row: number;
  col: string;
  class: SeatClassId;
}

const SECTIONS: readonly { class: SeatClassId; rows: readonly number[]; cols: readonly string[] }[] = [
  { class: 'premium', rows: [1, 2], cols: ['A', 'B', 'C'] },
  { class: 'comfort', rows: [3, 4, 5], cols: ['A', 'B', 'C', 'D'] },
  { class: 'economy', rows: [6, 7, 8, 9, 10, 11, 12], cols: ['A', 'B', 'C', 'D'] },
];

/** The coach used by seeded companies: premium 2+1, then comfort and economy 2+2. */
export function standardLayout(): LayoutSeat[] {
  const seats: LayoutSeat[] = [];
  for (const section of SECTIONS) {
    for (const row of section.rows) {
      for (const col of section.cols) {
        seats.push({ label: `${row}${col}`, row, col, class: section.class });
      }
    }
  }
  return seats;
}

export function classFare(base: number, seatClass: SeatClassId): number {
  const factor = seatClass === 'premium' ? 1.82 : seatClass === 'comfort' ? 1.34 : 1;
  return Math.round((base * factor) / 5000) * 5000;
}

export function damascusToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Damascus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year!, (month ?? 1) - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** A `YYYY-MM-DDTHH:mm` value is a clock time in Syria, not UTC. */
export function parseDamascus(value: string): Date | null {
  const trimmed = value.trim();
  const local = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (local) {
    const parsed = new Date(`${local[1]}T${local[2]}:${local[3]}:00+03:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function dayRange(isoDate: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const start = new Date(`${isoDate}T00:00:00+03:00`);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
