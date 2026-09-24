import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BookingStatus,
  Prisma,
  SeatClass,
  SeatStatus,
  TripStatus,
  type Company,
} from '@prisma/client';
import { apiError } from './http';
import { AMENITIES, SEAT_CLASSES, parseDamascus, standardLayout, type SeatClassId } from './layout';
import { normalizeSyrianMobile } from './payment';
import { PrismaService } from './prisma.service';
import { bookingInclude, bookingJson, seatJson, statusCopy, tripDetail, tripInclude } from './present';

const COLS = new Set(['A', 'B', 'C', 'D']);

@Injectable()
export class ProviderService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(company: Company) {
    const [buses, routes, trips, bookings] = await Promise.all([
      this.prisma.bus.count({ where: { companyId: company.id } }),
      this.prisma.route.count({ where: { companyId: company.id, active: true } }),
      this.prisma.trip.count({
        where: { route: { companyId: company.id }, departAt: { gte: new Date() }, status: { not: TripStatus.cancelled } },
      }),
      this.prisma.booking.count({
        where: { status: BookingStatus.confirmed, trip: { route: { companyId: company.id } } },
      }),
    ]);
    return {
      company: { id: company.id, en: company.nameEn, ar: company.nameAr, color: company.color, phone: company.phone },
      buses,
      routes,
      upcomingTrips: trips,
      bookings,
    };
  }

  async updateCompany(company: Company, body: { nameAr?: string; nameEn?: string; phone?: string }) {
    const nameAr = body.nameAr?.trim();
    const nameEn = body.nameEn?.trim();
    let phone = company.phone;
    if (body.phone !== undefined) {
      if (!body.phone.trim()) phone = null;
      else {
        const normalized = normalizeSyrianMobile(body.phone);
        if (!normalized) throw new BadRequestException(apiError('PHONE', 'Enter a Syrian mobile number.'));
        phone = normalized;
      }
    }
    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: {
        nameAr: nameAr && nameAr.length >= 2 ? nameAr : company.nameAr,
        nameEn: nameEn && nameEn.length >= 2 ? nameEn : company.nameEn,
        phone,
      },
    });
    return { id: updated.id, en: updated.nameEn, ar: updated.nameAr, color: updated.color, phone: updated.phone };
  }

  async buses(company: Company) {
    const rows = await this.prisma.bus.findMany({
      where: { companyId: company.id },
      include: { _count: { select: { seats: true, trips: true } } },
      orderBy: { code: 'asc' },
    });
    return rows.map((bus) => ({
      id: bus.id,
      name: bus.name,
      code: bus.code,
      amenities: bus.amenities,
      active: bus.active,
      seats: bus._count.seats,
      trips: bus._count.trips,
    }));
  }

  async bus(company: Company, id: string) {
    const bus = await this.ownedBus(company, id);
    return {
      id: bus.id,
      name: bus.name,
      code: bus.code,
      amenities: bus.amenities,
      active: bus.active,
      seats: bus.seats.map((seat) => ({
        id: seat.id,
        label: seat.label,
        row: seat.row,
        column: seat.col,
        classId: seat.class,
      })),
    };
  }

  async createBus(company: Company, body: { name?: string; code?: string; amenities?: string[]; standard?: boolean }) {
    const name = clean(body.name, 60);
    const code = clean(body.code, 12);
    if (!name || !code) throw new BadRequestException(apiError('BUS', 'Enter a bus name and a coach number.'));
    const amenities = cleanAmenities(body.amenities);
    try {
      const bus = await this.prisma.bus.create({
        data: {
          companyId: company.id,
          name,
          code,
          amenities,
          seats: body.standard === false ? undefined : { create: standardLayout() },
        },
        include: { seats: true },
      });
      return this.bus(company, bus.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException(apiError('BUS_CODE', 'That coach number is already used.'));
      }
      throw error;
    }
  }

  async updateBus(
    company: Company,
    id: string,
    body: { name?: string; code?: string; amenities?: string[]; active?: boolean },
  ) {
    await this.ownedBus(company, id);
    const name = body.name === undefined ? undefined : clean(body.name, 60);
    const code = body.code === undefined ? undefined : clean(body.code, 12);
    if (name === '' || code === '') throw new BadRequestException(apiError('BUS', 'Enter a bus name and a coach number.'));
    try {
      await this.prisma.bus.update({
        where: { id },
        data: {
          name: name || undefined,
          code: code || undefined,
          amenities: body.amenities ? cleanAmenities(body.amenities) : undefined,
          active: typeof body.active === 'boolean' ? body.active : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException(apiError('BUS_CODE', 'That coach number is already used.'));
      }
      throw error;
    }
    return this.bus(company, id);
  }

  async deleteBus(company: Company, id: string) {
    const bus = await this.ownedBus(company, id);
    if (bus.trips.length > 0) {
      throw new BadRequestException(apiError('BUS_IN_USE', 'This bus is on a trip, so it cannot be deleted.'));
    }
    await this.prisma.bus.delete({ where: { id } });
    return { ok: true };
  }

  async addSeat(company: Company, busId: string, body: { row?: number; column?: string; classId?: string }) {
    await this.ownedBus(company, busId);
    const row = Number(body.row);
    const column = (body.column ?? '').toUpperCase();
    const seatClass = body.classId as SeatClassId;
    if (!Number.isInteger(row) || row < 1 || row > 30 || !COLS.has(column) || !SEAT_CLASSES.includes(seatClass)) {
      throw new BadRequestException(apiError('SEAT', 'Use a row from 1 to 30, a column A–D, and a class.'));
    }
    try {
      await this.prisma.busSeat.create({
        data: { busId, label: `${row}${column}`, row, col: column, class: seatClass },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException(apiError('SEAT', 'That seat is already on the bus.'));
      }
      throw error;
    }
    return this.bus(company, busId);
  }

  async deleteSeat(company: Company, busId: string, seatId: string) {
    await this.ownedBus(company, busId);
    const seat = await this.prisma.busSeat.findFirst({ where: { id: seatId, busId } });
    if (!seat) throw new NotFoundException(apiError('SEAT', 'Seat not found.'));
    await this.prisma.busSeat.delete({ where: { id: seatId } });
    return this.bus(company, busId);
  }

  async applyLayout(company: Company, busId: string) {
    await this.ownedBus(company, busId);
    await this.prisma.$transaction([
      this.prisma.busSeat.deleteMany({ where: { busId } }),
      this.prisma.busSeat.createMany({ data: standardLayout().map((seat) => ({ ...seat, busId })) }),
    ]);
    return this.bus(company, busId);
  }

  async routes(company: Company) {
    const rows = await this.prisma.route.findMany({
      where: { companyId: company.id },
      include: { origin: true, destination: true, prices: true, _count: { select: { trips: true } } },
      orderBy: [{ originId: 'asc' }, { destinationId: 'asc' }],
    });
    return rows.map(routeJson);
  }

  async route(company: Company, id: string) {
    const route = await this.ownedRoute(company, id);
    return routeJson(route);
  }

  async createRoute(company: Company, body: RouteBody) {
    const parsed = parseRoute(body);
    const cities = await this.prisma.city.count({ where: { id: { in: [parsed.originId, parsed.destinationId] } } });
    if (cities !== 2) throw new BadRequestException(apiError('CITY', 'Choose two cities from the list.'));
    try {
      const route = await this.prisma.route.create({
        data: {
          companyId: company.id,
          originId: parsed.originId,
          destinationId: parsed.destinationId,
          durationMin: parsed.durationMin,
          distanceKm: parsed.distanceKm,
          active: parsed.active,
          prices: { create: parsed.prices },
        },
        include: { origin: true, destination: true, prices: true, _count: { select: { trips: true } } },
      });
      return routeJson(route);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException(apiError('ROUTE_EXISTS', 'You already have this route.'));
      }
      throw error;
    }
  }

  async updateRoute(company: Company, id: string, body: RouteBody) {
    await this.ownedRoute(company, id);
    const parsed = parseRoute(body);
    await this.prisma.$transaction(async (tx) => {
      await tx.route.update({
        where: { id },
        data: {
          durationMin: parsed.durationMin,
          distanceKm: parsed.distanceKm,
          active: parsed.active,
        },
      });
      for (const price of parsed.prices) {
        await tx.routePrice.upsert({
          where: { routeId_class: { routeId: id, class: price.class } },
          update: { priceSyp: price.priceSyp },
          create: { routeId: id, class: price.class, priceSyp: price.priceSyp },
        });
      }
    });
    return this.route(company, id);
  }

  async deleteRoute(company: Company, id: string) {
    const route = await this.ownedRoute(company, id);
    if (route._count.trips > 0) {
      throw new BadRequestException(apiError('ROUTE_IN_USE', 'This route has trips, so it cannot be deleted.'));
    }
    await this.prisma.route.delete({ where: { id } });
    return { ok: true };
  }

  async trips(company: Company) {
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await this.prisma.trip.findMany({
      where: {
        route: { companyId: company.id },
        OR: [{ departAt: { gte: start } }, { status: { in: [TripStatus.scheduled, TripStatus.boarding, TripStatus.departed] } }],
      },
      include: tripInclude,
      orderBy: { departAt: 'asc' },
      take: 80,
    });
    return rows.map((trip) => {
      const detail = tripDetail(trip);
      return {
        id: detail.id,
        status: detail.status,
        origin: detail.origin,
        destination: detail.destination,
        departAt: detail.departAt,
        arriveAt: detail.arriveAt,
        coach: detail.coach,
        freeSeats: detail.freeSeats,
        bookedSeats: detail.seats.filter((seat) => seat.status === 'booked').length,
      };
    });
  }

  async trip(company: Company, id: string) {
    const trip = await this.ownedTrip(company, id);
    return tripDetail(trip);
  }

  async createTrip(company: Company, body: { routeId?: string; busId?: string; departAt?: string }) {
    const route = await this.ownedRoute(company, body.routeId ?? '');
    const bus = await this.ownedBus(company, body.busId ?? '');
    if (!route.active || !bus.active) {
      throw new BadRequestException(apiError('INACTIVE', 'Turn the route and the bus on before scheduling.'));
    }
    if (bus.seats.length === 0) {
      throw new BadRequestException(apiError('NO_SEATS', 'Add seats to the bus first.'));
    }
    const departAt = parseDamascus(body.departAt ?? '');
    if (!departAt || departAt.getTime() < Date.now() + 30 * 60_000) {
      throw new BadRequestException(apiError('DEPART', 'Pick a departure at least 30 minutes from now.'));
    }
    const prices = new Map(route.prices.map((price) => [price.class, price.priceSyp]));
    if (bus.seats.some((seat) => !prices.get(seat.class))) {
      throw new BadRequestException(apiError('PRICE', 'Set a fare for every class on this bus.'));
    }
    const arriveAt = new Date(departAt.getTime() + route.durationMin * 60_000);
    const trip = await this.prisma.trip.create({
      data: {
        routeId: route.id,
        busId: bus.id,
        departAt,
        arriveAt,
        seats: {
          create: bus.seats.map((seat) => ({
            label: seat.label,
            row: seat.row,
            col: seat.col,
            class: seat.class,
            priceSyp: prices.get(seat.class)!,
          })),
        },
      },
    });
    return this.trip(company, trip.id);
  }

  async setStatus(company: Company, id: string, statusRaw?: string) {
    const status = statusRaw as TripStatus;
    if (!Object.values(TripStatus).includes(status)) {
      throw new BadRequestException(apiError('STATUS', 'Unknown trip status.'));
    }
    const trip = await this.ownedTrip(company, id);
    if (trip.status === status) return tripDetail(trip);
    await this.prisma.$transaction(async (tx) => {
      const bookings = await tx.booking.findMany({
        where: { tripId: id, status: BookingStatus.confirmed },
        select: { id: true, userId: true, reference: true },
      });
      await tx.trip.update({ where: { id }, data: { status } });
      if (status === TripStatus.cancelled) {
        await tx.booking.updateMany({
          where: { tripId: id, status: BookingStatus.confirmed },
          data: { status: BookingStatus.cancelled },
        });
        await tx.tripSeat.updateMany({
          where: { tripId: id, status: SeatStatus.booked },
          data: { status: SeatStatus.blocked },
        });
        await tx.tripSeat.updateMany({
          where: { tripId: id, status: SeatStatus.available },
          data: { status: SeatStatus.blocked },
        });
      }
      if (status === TripStatus.scheduled || bookings.length === 0) return;
      const destination = { en: trip.route.destination.nameEn, ar: trip.route.destination.nameAr };
      await tx.notification.createMany({
        data: bookings.map((booking) => {
          const note = statusCopy(status, booking.reference, destination)!;
          return {
            userId: booking.userId,
            bookingId: booking.id,
            kind: note.kind,
            titleAr: note.titleAr,
            titleEn: note.titleEn,
            bodyAr: note.bodyAr,
            bodyEn: note.bodyEn,
          };
        }),
      });
    });
    return this.trip(company, id);
  }

  async updateSeat(
    company: Company,
    tripId: string,
    seatId: string,
    body: { price?: number; status?: string },
  ) {
    await this.ownedTrip(company, tripId);
    const seat = await this.prisma.tripSeat.findFirst({ where: { id: seatId, tripId } });
    if (!seat) throw new NotFoundException(apiError('SEAT', 'Seat not found.'));
    if (seat.status === SeatStatus.booked) {
      throw new BadRequestException(apiError('BOOKED', 'A booked seat keeps its fare.'));
    }
    const data: Prisma.TripSeatUpdateInput = {};
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isInteger(price) || price < 1000 || price > 50_000_000) {
        throw new BadRequestException(apiError('PRICE', 'Enter a fare in Syrian pounds.'));
      }
      data.priceSyp = price;
    }
    if (body.status !== undefined) {
      if (body.status !== 'available' && body.status !== 'blocked') {
        throw new BadRequestException(apiError('SEAT', 'A free seat can be on sale or blocked.'));
      }
      data.status = body.status;
    }
    const updated = await this.prisma.tripSeat.update({ where: { id: seatId }, data });
    return seatJson(updated);
  }

  async bookings(company: Company) {
    const rows = await this.prisma.booking.findMany({
      where: { trip: { route: { companyId: company.id } } },
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map(bookingJson);
  }

  private async ownedBus(company: Company, id: string) {
    const bus = await this.prisma.bus.findFirst({
      where: { id, companyId: company.id },
      include: { seats: { orderBy: [{ row: 'asc' }, { col: 'asc' }] }, trips: { select: { id: true }, take: 1 } },
    });
    if (!bus) throw new NotFoundException(apiError('BUS', 'Bus not found.'));
    return bus;
  }

  private async ownedRoute(company: Company, id: string) {
    const route = await this.prisma.route.findFirst({
      where: { id, companyId: company.id },
      include: { origin: true, destination: true, prices: true, _count: { select: { trips: true } } },
    });
    if (!route) throw new NotFoundException(apiError('ROUTE', 'Route not found.'));
    return route;
  }

  private async ownedTrip(company: Company, id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, route: { companyId: company.id } },
      include: tripInclude,
    });
    if (!trip) throw new NotFoundException(apiError('TRIP', 'Trip not found.'));
    return trip;
  }
}

function clean(value: string | undefined, max: number): string {
  return (value ?? '').trim().slice(0, max);
}

function cleanAmenities(values: string[] | undefined): string[] {
  const picked = (values ?? []).filter((item): item is (typeof AMENITIES)[number] =>
    (AMENITIES as readonly string[]).includes(item),
  );
  return [...new Set(picked)];
}

interface RouteBody {
  originId?: string;
  destinationId?: string;
  durationMin?: number;
  distanceKm?: number;
  active?: boolean;
  economy?: number;
  comfort?: number;
  premium?: number;
}

function parseRoute(body: RouteBody) {
  const originId = body.originId ?? '';
  const destinationId = body.destinationId ?? '';
  if (!originId || !destinationId || originId === destinationId) {
    throw new BadRequestException(apiError('ROUTE', 'Choose two different cities.'));
  }
  const durationMin = Number(body.durationMin);
  const distanceKm = Number(body.distanceKm);
  if (!Number.isInteger(durationMin) || durationMin < 10 || durationMin > 24 * 60) {
    throw new BadRequestException(apiError('DURATION', 'Enter the ride time in minutes.'));
  }
  if (!Number.isInteger(distanceKm) || distanceKm < 1 || distanceKm > 2000) {
    throw new BadRequestException(apiError('DISTANCE', 'Enter the distance in kilometres.'));
  }
  const prices = (['economy', 'comfort', 'premium'] as const).map((seatClass) => {
    const priceSyp = Number(body[seatClass]);
    if (!Number.isInteger(priceSyp) || priceSyp < 1000 || priceSyp > 50_000_000) {
      throw new BadRequestException(apiError('PRICE', 'Enter a fare for each class.'));
    }
    return { class: seatClass as SeatClass, priceSyp };
  });
  return {
    originId,
    destinationId,
    durationMin,
    distanceKm,
    active: body.active !== false,
    prices,
  };
}

function routeJson(route: {
  id: string;
  originId: string;
  destinationId: string;
  durationMin: number;
  distanceKm: number;
  active: boolean;
  origin: { id: string; nameEn: string; nameAr: string };
  destination: { id: string; nameEn: string; nameAr: string };
  prices: { class: SeatClass; priceSyp: number }[];
  _count: { trips: number };
}) {
  const price = (seatClass: SeatClass) => route.prices.find((item) => item.class === seatClass)?.priceSyp ?? 0;
  return {
    id: route.id,
    origin: { id: route.origin.id, en: route.origin.nameEn, ar: route.origin.nameAr },
    destination: { id: route.destination.id, en: route.destination.nameEn, ar: route.destination.nameAr },
    durationMin: route.durationMin,
    distanceKm: route.distanceKm,
    active: route.active,
    economy: price('economy'),
    comfort: price('comfort'),
    premium: price('premium'),
    trips: route._count.trips,
  };
}
