import type { PayMethod } from './payment';
import type { SeatClassId } from './trips';

export interface TicketSeat {
  id: string;
  classId: SeatClassId;
  price: number;
  passengerName: string;
}

export interface TicketTrip {
  id: string;
  companyId: string;
  originId: string;
  destinationId: string;
  departAt: string;
  arriveAt: string;
  durationMin: number;
  coach: string;
}

export interface Booking {
  id: string;
  createdAt: string;
  trip: TicketTrip;
  seats: TicketSeat[];
  phone: string;
  paymentMethod: PayMethod;
  paymentLast4: string;
  total: number;
}

export interface SearchDraft {
  from: string;
  to: string;
  date: string;
  pax: number;
}

export interface CheckoutDraft {
  tripId: string;
  names: Record<string, string>;
  phone: string;
  method: PayMethod;
}

const BOOKING_KEY = 'shampass.bookings';
const SEARCH_KEY = 'shampass.search';
const DRAFT_KEY = 'shampass.draft';

const listeners = new Set<() => void>();
let bookingCache: Booking[] | null = null;

function readBookings(): Booking[] {
  if (bookingCache) return bookingCache;
  try {
    const raw = localStorage.getItem(BOOKING_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    bookingCache = Array.isArray(parsed) ? (parsed as Booking[]) : [];
  } catch {
    bookingCache = [];
  }
  return bookingCache;
}

function writeBookings(next: Booking[]) {
  bookingCache = next;
  localStorage.setItem(BOOKING_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function getBookings(): Booking[] {
  return readBookings();
}

export function subscribeBookings(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== BOOKING_KEY) return;
    bookingCache = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function saveBooking(booking: Booking) {
  writeBookings([booking, ...readBookings().filter((item) => item.id !== booking.id)]);
}

export function removeBooking(id: string) {
  writeBookings(readBookings().filter((item) => item.id !== id));
}

export function bookingById(id: string): Booking | undefined {
  return readBookings().find((item) => item.id === id);
}

export function bookedSeatIds(tripId: string, bookings = readBookings()): Set<string> {
  const ids = new Set<string>();
  for (const booking of bookings) {
    if (booking.trip.id !== tripId) continue;
    for (const seat of booking.seats) ids.add(seat.id);
  }
  return ids;
}

const REFERENCE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  let code = 'SH-';
  for (const byte of bytes) code += REFERENCE[byte % REFERENCE.length];
  return code;
}

export function loadSearch(): SearchDraft | null {
  try {
    const raw = sessionStorage.getItem(SEARCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SearchDraft;
    if (!parsed.from || !parsed.to || !parsed.date) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSearch(draft: SearchDraft) {
  sessionStorage.setItem(SEARCH_KEY, JSON.stringify(draft));
}

export function loadCheckoutDraft(tripId: string): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (parsed.tripId !== tripId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}
