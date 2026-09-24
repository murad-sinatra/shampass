import type { Company, City, SeatClass, SeatStatus, TripStatus } from '@prisma/client';

export interface CityJson {
  id: string;
  en: string;
  ar: string;
}

export interface CompanyJson {
  id: string;
  en: string;
  ar: string;
  color: string;
}

export function cityJson(city: Pick<City, 'id' | 'nameEn' | 'nameAr'>): CityJson {
  return { id: city.id, en: city.nameEn, ar: city.nameAr };
}

export function companyJson(company: Pick<Company, 'id' | 'nameEn' | 'nameAr' | 'color'>): CompanyJson {
  return { id: company.id, en: company.nameEn, ar: company.nameAr, color: company.color };
}

export interface SeatJson {
  id: string;
  label: string;
  row: number;
  column: string;
  classId: SeatClass;
  price: number;
  status: SeatStatus;
  occupied: boolean;
}

export function seatJson(seat: {
  id: string;
  label: string;
  row: number;
  col: string;
  class: SeatClass;
  priceSyp: number;
  status: SeatStatus;
}): SeatJson {
  return {
    id: seat.id,
    label: seat.label,
    row: seat.row,
    column: seat.col,
    classId: seat.class,
    price: seat.priceSyp,
    status: seat.status,
    occupied: seat.status !== 'available',
  };
}

export const tripInclude = {
  bus: true,
  seats: { orderBy: [{ row: 'asc' as const }, { col: 'asc' as const }] },
  route: {
    include: {
      origin: true,
      destination: true,
      company: true,
    },
  },
};

type TripRow = {
  id: string;
  departAt: Date;
  arriveAt: Date;
  status: TripStatus;
  bus: { code: string; amenities: string[] };
  seats: {
    id: string;
    label: string;
    row: number;
    col: string;
    class: SeatClass;
    priceSyp: number;
    status: SeatStatus;
  }[];
  route: {
    durationMin: number;
    origin: City;
    destination: City;
    company: Company;
  };
};

export function tripSummary(trip: TripRow) {
  const free = trip.seats.filter((seat) => seat.status === 'available');
  return {
    id: trip.id,
    status: trip.status,
    company: companyJson(trip.route.company),
    origin: cityJson(trip.route.origin),
    destination: cityJson(trip.route.destination),
    departAt: trip.departAt.toISOString(),
    arriveAt: trip.arriveAt.toISOString(),
    durationMin: trip.route.durationMin,
    coach: trip.bus.code,
    amenities: trip.bus.amenities,
    freeSeats: free.length,
    lowestPrice: free.length > 0 ? Math.min(...free.map((seat) => seat.priceSyp)) : null,
  };
}

export function tripDetail(trip: TripRow) {
  return {
    ...tripSummary(trip),
    seats: trip.seats.map(seatJson),
  };
}

const bookingInclude = {
  seats: { include: { tripSeat: true }, orderBy: { tripSeat: { label: 'asc' as const } } },
  trip: { include: tripInclude },
};

export { bookingInclude };

type BookingRow = {
  reference: string;
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
  phone: string;
  payMethod: 'shamcash' | 'visa' | 'mastercard';
  payLast4: string;
  totalSyp: number;
  seats: {
    passengerName: string;
    priceSyp: number;
    tripSeat: { id: string; label: string; class: SeatClass };
  }[];
  trip: TripRow;
};

export function bookingJson(booking: BookingRow) {
  const trip = tripSummary(booking.trip);
  return {
    id: booking.reference,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
    phone: booking.phone,
    paymentMethod: booking.payMethod,
    paymentLast4: booking.payLast4,
    total: booking.totalSyp,
    trip: {
      id: trip.id,
      status: trip.status,
      company: trip.company,
      origin: trip.origin,
      destination: trip.destination,
      departAt: trip.departAt,
      arriveAt: trip.arriveAt,
      durationMin: trip.durationMin,
      coach: trip.coach,
    },
    seats: booking.seats.map((seat) => ({
      id: seat.tripSeat.label,
      seatId: seat.tripSeat.id,
      classId: seat.tripSeat.class,
      price: seat.priceSyp,
      passengerName: seat.passengerName,
    })),
  };
}

export function notificationJson(row: {
  id: string;
  kind: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  readAt: Date | null;
  createdAt: Date;
  bookingId: string | null;
}) {
  return {
    id: row.id,
    kind: row.kind,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    bodyAr: row.bodyAr,
    bodyEn: row.bodyEn,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    bookingId: row.bookingId,
  };
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newReference(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let code = 'SH-';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

export function statusCopy(
  status: TripStatus,
  reference: string,
  destination: { en: string; ar: string },
): { kind: string; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string } | null {
  if (status === 'boarding') {
    return {
      kind: 'trip_boarding',
      titleAr: 'بدأ الصعود',
      titleEn: 'Boarding has started',
      bodyAr: `الباص إلى ${destination.ar} يفتح أبوابه. أظهر التذكرة ${reference}.`,
      bodyEn: `The bus to ${destination.en} is boarding. Show ticket ${reference}.`,
    };
  }
  if (status === 'departed') {
    return {
      kind: 'trip_departed',
      titleAr: 'الباص في الطريق',
      titleEn: 'The bus is on the way',
      bodyAr: `رحلتك إلى ${destination.ar} غادرت. التذكرة ${reference}.`,
      bodyEn: `Your trip to ${destination.en} has departed. Ticket ${reference}.`,
    };
  }
  if (status === 'arrived') {
    return {
      kind: 'trip_arrived',
      titleAr: 'وصلت الرحلة',
      titleEn: 'You have arrived',
      bodyAr: `الباص وصل إلى ${destination.ar}. نتمنى لك طريقاً آمناً.`,
      bodyEn: `The bus has arrived in ${destination.en}.`,
    };
  }
  if (status === 'cancelled') {
    return {
      kind: 'trip_cancelled',
      titleAr: 'أُلغيت الرحلة',
      titleEn: 'Trip cancelled',
      bodyAr: `أُلغيت رحلتك إلى ${destination.ar}. الحجز ${reference}.`,
      bodyEn: `Your trip to ${destination.en} was cancelled. Booking ${reference}.`,
    };
  }
  return null;
}
