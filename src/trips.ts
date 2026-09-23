import { COMPANIES, roadBetween } from './data';

export type SeatClassId = 'economy' | 'comfort' | 'premium';
export type AmenityId = 'ac' | 'usb' | 'wifi' | 'water' | 'reclining';
export type SeatColumn = 'A' | 'B' | 'C' | 'D';

export interface Seat {
  id: string;
  row: number;
  column: SeatColumn;
  classId: SeatClassId;
  price: number;
  /** Filled by the timetable, before any booking on this phone. */
  occupied: boolean;
}

export interface Trip {
  id: string;
  companyId: string;
  originId: string;
  destinationId: string;
  departAt: string;
  arriveAt: string;
  durationMin: number;
  coach: string;
  amenities: AmenityId[];
  seats: Seat[];
}

const SLOTS = ['06:15', '08:40', '11:20', '14:05', '16:50', '19:30', '21:45'] as const;

const CLASS_ROWS: readonly { classId: SeatClassId; rows: readonly number[] }[] = [
  { classId: 'premium', rows: [1, 2] },
  { classId: 'comfort', rows: [3, 4, 5] },
  { classId: 'economy', rows: [6, 7, 8, 9, 10, 11, 12] },
];

const CLASS_FACTOR: Record<SeatClassId, number> = {
  economy: 1,
  comfort: 1.34,
  premium: 1.82,
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function atTime(isoDate: string, hoursMinutes: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [hours, minutes] = hoursMinutes.split(':').map(Number);
  return new Date(year!, (month ?? 1) - 1, day, hours, minutes, 0, 0);
}

function columnsFor(classId: SeatClassId): SeatColumn[] {
  return classId === 'premium' ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
}

function seatPrice(base: number, classId: SeatClassId, column: SeatColumn, row: number, rows: readonly number[]): number {
  const windowSeat = column === 'A' || column === 'D' || (classId === 'premium' && column === 'C');
  const front = row === rows[0];
  const raw = base * CLASS_FACTOR[classId] * (windowSeat ? 1.1 : 1) * (front ? 1.08 : 1);
  return Math.round(raw / 5000) * 5000;
}

function buildSeats(tripId: string, base: number): Seat[] {
  const seats: Seat[] = [];
  for (const section of CLASS_ROWS) {
    let occupiedInClass = 0;
    const classSize = section.rows.length * columnsFor(section.classId).length;
    for (const row of section.rows) {
      for (const column of columnsFor(section.classId)) {
        const id = `${row}${column}`;
        const keepFree = classSize - occupiedInClass <= 2;
        const occupied = !keepFree && hashString(`${tripId}|${id}`) % 100 < 34;
        if (occupied) occupiedInClass += 1;
        seats.push({
          id,
          row,
          column,
          classId: section.classId,
          price: seatPrice(base, section.classId, column, row, section.rows),
          occupied,
        });
      }
    }
  }
  return seats;
}

function amenitiesFor(rand: () => number): AmenityId[] {
  const amenities: AmenityId[] = ['ac'];
  if (rand() > 0.35) amenities.push('usb');
  if (rand() > 0.45) amenities.push('wifi');
  if (rand() > 0.4) amenities.push('water');
  if (rand() > 0.5) amenities.push('reclining');
  return amenities;
}

export function getTrips(originId: string, destinationId: string, date: string): Trip[] {
  const road = roadBetween(originId, destinationId);
  if (!road || originId === destinationId) return [];

  const rand = mulberry32(hashString(`${originId}|${destinationId}|${date}`));
  const count = 3 + Math.floor(rand() * 3);
  const slotOrder = [...SLOTS];
  for (let index = slotOrder.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rand() * (index + 1));
    const current = slotOrder[index]!;
    slotOrder[index] = slotOrder[swap]!;
    slotOrder[swap] = current;
  }
  const slots = slotOrder.slice(0, count).sort();

  const companies = [...COMPANIES];
  for (let index = companies.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rand() * (index + 1));
    const current = companies[index]!;
    companies[index] = companies[swap]!;
    companies[swap] = current;
  }

  return slots.map((slot, index) => {
    const company = companies[index % companies.length]!;
    const id = `${originId}~${destinationId}~${date}~${slot}~${company.id}`;
    const depart = atTime(date, slot);
    const arrive = new Date(depart.getTime() + road.minutes * 60_000);
    return {
      id,
      companyId: company.id,
      originId,
      destinationId,
      departAt: depart.toISOString(),
      arriveAt: arrive.toISOString(),
      durationMin: road.minutes,
      coach: String(1 + (hashString(id) % 40)),
      amenities: amenitiesFor(rand),
      seats: buildSeats(id, road.base),
    };
  });
}

export function findTrip(id: string): Trip | undefined {
  const [originId, destinationId, date] = id.split('~');
  if (!originId || !destinationId || !date) return undefined;
  return getTrips(originId, destinationId, date).find((trip) => trip.id === id);
}

export function classRows(classId: SeatClassId): readonly number[] {
  return CLASS_ROWS.find((section) => section.classId === classId)?.rows ?? [];
}

export const SEAT_CLASSES: readonly SeatClassId[] = ['premium', 'comfort', 'economy'];
