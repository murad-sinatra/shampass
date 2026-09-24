export type SeatClassId = 'economy' | 'comfort' | 'premium';
export type SeatColumn = 'A' | 'B' | 'C' | 'D';
export type AmenityId = 'ac' | 'usb' | 'wifi' | 'water' | 'reclining';
export type PayMethod = 'shamcash' | 'visa' | 'mastercard';
export type TripStatus = 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'cancelled';
export type SeatStatus = 'available' | 'booked' | 'blocked';
export type BookingStatus = 'confirmed' | 'cancelled';
export type Role = 'customer' | 'provider';

export const SEAT_CLASSES: readonly SeatClassId[] = ['premium', 'comfort', 'economy'];

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

export interface AccountCompany extends Company {
  phone: string | null;
}

export interface Account {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  role: Role;
  company: AccountCompany | null;
}

export interface Seat {
  id: string;
  label: string;
  row: number;
  column: SeatColumn | string;
  classId: SeatClassId;
  price: number;
  status: SeatStatus;
  occupied: boolean;
}

export interface TripSummary {
  id: string;
  status: TripStatus;
  company: Company;
  origin: City;
  destination: City;
  departAt: string;
  arriveAt: string;
  durationMin: number;
  coach: string;
  amenities: AmenityId[];
  freeSeats: number;
  lowestPrice: number | null;
}

export interface Trip extends TripSummary {
  seats: Seat[];
}

export interface TicketSeat {
  id: string;
  seatId: string;
  classId: SeatClassId;
  price: number;
  passengerName: string;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  createdAt: string;
  phone: string;
  paymentMethod: PayMethod;
  paymentLast4: string;
  total: number;
  trip: {
    id: string;
    status: TripStatus;
    company: Company;
    origin: City;
    destination: City;
    departAt: string;
    arriveAt: string;
    durationMin: number;
    coach: string;
  };
  seats: TicketSeat[];
}

export interface Notice {
  id: string;
  kind: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  readAt: string | null;
  createdAt: string;
  bookingId: string | null;
}

export interface Catalog {
  cities: City[];
  fares: { from: string; to: string; price: number }[];
}

export interface BusSummary {
  id: string;
  name: string;
  code: string;
  amenities: string[];
  active: boolean;
  seats: number;
  trips: number;
}

export interface BusDetail {
  id: string;
  name: string;
  code: string;
  amenities: string[];
  active: boolean;
  seats: { id: string; label: string; row: number; column: string; classId: SeatClassId }[];
}

export interface RouteDetail {
  id: string;
  origin: City;
  destination: City;
  durationMin: number;
  distanceKm: number;
  active: boolean;
  economy: number;
  comfort: number;
  premium: number;
  trips: number;
}

export interface ProviderTrip {
  id: string;
  status: TripStatus;
  origin: City;
  destination: City;
  departAt: string;
  arriveAt: string;
  coach: string;
  freeSeats: number;
  bookedSeats: number;
}

export interface Dashboard {
  company: AccountCompany;
  buses: number;
  routes: number;
  upcomingTrips: number;
  bookings: number;
}
