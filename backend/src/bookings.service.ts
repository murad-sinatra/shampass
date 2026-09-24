import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PayMethod, Prisma, Role, SeatStatus, TripStatus } from '@prisma/client';
import { apiError } from './http';
import { normalizeSyrianMobile, validPersonName, validatePayment, type PayMethod as PayMethodName } from './payment';
import { PrismaService } from './prisma.service';
import { bookingInclude, bookingJson, newReference, tripDetail, tripInclude, tripSummary } from './present';

const METHODS: PayMethodName[] = ['shamcash', 'visa', 'mastercard'];

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(from: string, to: string, date: string) {
    const range = dayBounds(date);
    if (!range || !from || !to || from === to) {
      throw new BadRequestException(apiError('SEARCH', 'Choose two cities and a date.'));
    }
    const routeCount = await this.prisma.route.count({
      where: { originId: from, destinationId: to, active: true },
    });
    const now = new Date(Date.now() + 15 * 60_000);
    const trips = await this.prisma.trip.findMany({
      where: {
        status: TripStatus.scheduled,
        departAt: { gte: now > range.start ? now : range.start, lt: range.end },
        route: { originId: from, destinationId: to, active: true },
        bus: { active: true },
      },
      include: tripInclude,
      orderBy: { departAt: 'asc' },
    });
    return {
      routeExists: routeCount > 0,
      trips: trips.map(tripSummary),
    };
  }

  async trip(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id }, include: tripInclude });
    if (!trip) throw new NotFoundException(apiError('TRIP', 'This departure is no longer listed.'));
    return tripDetail(trip);
  }

  async catalog() {
    const [cities, routes] = await Promise.all([
      this.prisma.city.findMany({ orderBy: { nameEn: 'asc' } }),
      this.prisma.route.findMany({
        where: { active: true },
        include: { prices: true },
      }),
    ]);
    const fares = new Map<string, number>();
    for (const route of routes) {
      const economy = route.prices.find((price) => price.class === 'economy');
      if (!economy) continue;
      const key = `${route.originId}|${route.destinationId}`;
      const current = fares.get(key);
      if (current === undefined || economy.priceSyp < current) fares.set(key, economy.priceSyp);
    }
    return {
      cities: cities.map((city) => ({ id: city.id, en: city.nameEn, ar: city.nameAr })),
      fares: [...fares.entries()].map(([key, price]) => {
        const [from, to] = key.split('|');
        return { from, to, price };
      }),
    };
  }

  async create(
    userId: string,
    role: Role,
    body: {
      tripId?: string;
      phone?: string;
      payMethod?: string;
      walletPhone?: string;
      otp?: string;
      cardName?: string;
      cardNumber?: string;
      expiry?: string;
      cvc?: string;
      seats?: { seatId?: string; passengerName?: string }[];
    },
  ) {
    if (role !== Role.customer) {
      throw new BadRequestException(apiError('ROLE', 'Book from a passenger account.'));
    }
    const tripId = body.tripId ?? '';
    const requested = body.seats ?? [];
    if (!tripId || requested.length < 1 || requested.length > 5) {
      throw new BadRequestException(apiError('SEATS', 'Choose between 1 and 5 seats.'));
    }
    const phone = normalizeSyrianMobile(body.phone ?? '');
    if (!phone) throw new BadRequestException(apiError('PHONE', 'Enter a Syrian mobile number.'));
    if (!METHODS.includes(body.payMethod as PayMethodName)) {
      throw new BadRequestException(apiError('PAY', 'Choose ShamCash, Visa, or Mastercard.'));
    }
    const method = body.payMethod as PayMethodName;
    const payment = validatePayment({
      method,
      walletPhone: method === 'shamcash' ? phone : body.walletPhone,
      otp: body.otp,
      cardName: body.cardName,
      cardNumber: body.cardNumber,
      expiry: body.expiry,
      cvc: body.cvc,
    });
    if ('code' in payment) throw new BadRequestException(apiError(payment.code.toUpperCase(), 'Check the payment details.'));
    const names = requested.map((seat) => ({
      seatId: seat.seatId ?? '',
      passengerName: (seat.passengerName ?? '').trim().replace(/\s+/g, ' '),
    }));
    if (names.some((seat) => !validPersonName(seat.passengerName))) {
      throw new BadRequestException(apiError('NAME', 'Enter each passenger name.'));
    }
    const uniqueIds = new Set(names.map((seat) => seat.seatId));
    if (uniqueIds.size !== names.length) {
      throw new BadRequestException(apiError('SEATS', 'Each passenger needs a different seat.'));
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { route: { include: { origin: true, destination: true } }, seats: true },
      });
      if (!trip || trip.status !== TripStatus.scheduled) {
        throw new BadRequestException(apiError('TRIP_CLOSED', 'This departure is no longer open for sale.'));
      }
      if (trip.departAt.getTime() < Date.now() + 15 * 60_000) {
        throw new BadRequestException(apiError('TRIP_CLOSED', 'This departure is no longer open for sale.'));
      }
      const chosen = trip.seats.filter((seat) => uniqueIds.has(seat.id));
      if (chosen.length !== names.length || chosen.some((seat) => seat.status !== SeatStatus.available)) {
        throw new BadRequestException(apiError('SEAT_TAKEN', 'A seat was just taken.'));
      }
      const locked = await tx.tripSeat.updateMany({
        where: { id: { in: [...uniqueIds] }, tripId, status: SeatStatus.available },
        data: { status: SeatStatus.booked },
      });
      if (locked.count !== names.length) {
        throw new BadRequestException(apiError('SEAT_TAKEN', 'A seat was just taken.'));
      }
      const total = chosen.reduce((sum, seat) => sum + seat.priceSyp, 0);
      const reference = await unusedReference(tx);
      const created = await tx.booking.create({
        data: {
          reference,
          userId,
          tripId,
          phone,
          payMethod: method as PayMethod,
          payLast4: payment.last4,
          totalSyp: total,
          seats: {
            create: names.map((seat) => ({
              tripSeatId: seat.seatId,
              passengerName: seat.passengerName,
              priceSyp: chosen.find((item) => item.id === seat.seatId)!.priceSyp,
            })),
          },
        },
      });
      await tx.notification.create({
        data: {
          userId,
          bookingId: created.id,
          kind: 'booking_confirmed',
          titleAr: 'تم تأكيد الحجز',
          titleEn: 'Booking confirmed',
          bodyAr: `رقم الحجز ${reference}. ${trip.route.origin.nameAr} إلى ${trip.route.destination.nameAr}.`,
          bodyEn: `Reference ${reference}. ${trip.route.origin.nameEn} to ${trip.route.destination.nameEn}.`,
        },
      });
      return tx.booking.findUniqueOrThrow({ where: { id: created.id }, include: bookingInclude });
    });
    return bookingJson(booking);
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { userId },
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(bookingJson);
  }

  async oneForUser(userId: string, reference: string) {
    const row = await this.prisma.booking.findFirst({
      where: { userId, reference },
      include: bookingInclude,
    });
    if (!row) throw new NotFoundException(apiError('TICKET', 'Ticket not on this account.'));
    return bookingJson(row);
  }

  async cancel(userId: string, reference: string) {
    const booking = await this.prisma.$transaction(async (tx) => {
      const row = await tx.booking.findFirst({
        where: { userId, reference },
        include: { seats: true, trip: { include: { route: { include: { destination: true } } } } },
      });
      if (!row) throw new NotFoundException(apiError('TICKET', 'Ticket not on this account.'));
      if (row.status !== BookingStatus.confirmed) {
        throw new BadRequestException(apiError('CANCELLED', 'This booking is already cancelled.'));
      }
      if (row.trip.status !== TripStatus.scheduled) {
        throw new BadRequestException(apiError('TRIP_CLOSED', 'This trip has already moved on, so the booking stays.'));
      }
      await tx.booking.update({ where: { id: row.id }, data: { status: BookingStatus.cancelled } });
      await tx.tripSeat.updateMany({
        where: { id: { in: row.seats.map((seat) => seat.tripSeatId) } },
        data: { status: SeatStatus.available },
      });
      await tx.notification.create({
        data: {
          userId,
          bookingId: row.id,
          kind: 'booking_cancelled',
          titleAr: 'أُلغي الحجز',
          titleEn: 'Booking cancelled',
          bodyAr: `أُلغي الحجز ${row.reference} إلى ${row.trip.route.destination.nameAr}. المقاعد عادت للبيع.`,
          bodyEn: `Booking ${row.reference} to ${row.trip.route.destination.nameEn} was cancelled. The seats are on sale again.`,
        },
      });
      return tx.booking.findUniqueOrThrow({ where: { id: row.id }, include: bookingInclude });
    });
    return bookingJson(booking);
  }
}

function dayBounds(isoDate: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const start = new Date(`${isoDate}T00:00:00+03:00`);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

async function unusedReference(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const reference = newReference();
    const existing = await tx.booking.findUnique({ where: { reference } });
    if (!existing) return reference;
  }
  throw new BadRequestException(apiError('REFERENCE', 'Could not finish the booking. Try again.'));
}
