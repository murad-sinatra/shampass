import { PrismaClient, SeatStatus, type SeatClass } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, classFare, damascusToday, standardLayout } from './layout';

const prisma = new PrismaClient();

const CITIES: readonly { id: string; en: string; ar: string }[] = [
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

const ROADS: readonly { from: string; to: string; minutes: number; km: number; base: number }[] = [
  { from: 'damascus', to: 'swida', minutes: 135, km: 100, base: 75000 },
  { from: 'damascus', to: 'aleppo', minutes: 280, km: 360, base: 140000 },
  { from: 'damascus', to: 'latakia', minutes: 240, km: 330, base: 130000 },
  { from: 'damascus', to: 'tartus', minutes: 200, km: 270, base: 110000 },
  { from: 'homs', to: 'tartus', minutes: 90, km: 100, base: 55000 },
  { from: 'aleppo', to: 'idlib', minutes: 70, km: 60, base: 40000 },
];

const OPERATORS: Record<string, readonly string[]> = {
  'damascus|swida': ['shamline', 'jabal'],
  'damascus|aleppo': ['shamline', 'qasioun'],
  'damascus|latakia': ['barada', 'orontes'],
  'damascus|tartus': ['barada', 'shamline'],
  'homs|tartus': ['orontes', 'barada'],
  'aleppo|idlib': ['qasioun', 'jabal'],
};

const COMPANIES = [
  { username: 'shamline', password: 'shamline123', name: 'مكتب خط الشام', en: 'Sham Line', ar: 'خط الشام', color: '#0e6b4f', amenities: ['ac', 'usb', 'water'], coach: '12', bus: 'دمشق' },
  { username: 'barada', password: 'barada123', name: 'مكتب بردى', en: 'Barada Express', ar: 'بردى إكسبريس', color: '#1f4e79', amenities: ['ac', 'usb', 'wifi', 'reclining'], coach: '7', bus: 'بردى' },
  { username: 'qasioun', password: 'qasioun123', name: 'مكتب قاسيون', en: 'Qasioun Coach', ar: 'باصات قاسيون', color: '#8a5a12', amenities: ['ac', 'water'], coach: '4', bus: 'قاسيون' },
  { username: 'orontes', password: 'orontes123', name: 'مكتب العاصي', en: 'Orontes', ar: 'العاصي', color: '#6b3fa0', amenities: ['ac', 'usb', 'wifi'], coach: '18', bus: 'العاصي' },
  { username: 'jabal', password: 'jabal123', name: 'مكتب الجبل', en: 'Jabal Coach', ar: 'باصات الجبل', color: '#9c3b2e', amenities: ['ac', 'reclining', 'water'], coach: '22', bus: 'الجبل' },
] as const;

const SLOTS = ['06:15', '14:05'] as const;

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

async function main(): Promise<void> {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log('seed: database already has accounts');
    return;
  }

  await prisma.city.createMany({ data: CITIES.map((city) => ({ id: city.id, nameEn: city.en, nameAr: city.ar })) });

  const passwordHashes = new Map<string, string>();
  for (const company of COMPANIES) {
    passwordHashes.set(company.username, await bcrypt.hash(company.password, 10));
  }
  const linaHash = await bcrypt.hash('lina1234', 10);

  await prisma.user.create({
    data: {
      username: 'lina',
      passwordHash: linaHash,
      name: 'لينا حداد',
      phone: '0933123456',
      role: 'customer',
    },
  });

  const busByUser = new Map<string, string>();
  const layout = standardLayout();

  for (const company of COMPANIES) {
    const user = await prisma.user.create({
      data: {
        username: company.username,
        passwordHash: passwordHashes.get(company.username)!,
        name: company.name,
        role: 'provider',
        company: {
          create: {
            nameEn: company.en,
            nameAr: company.ar,
            color: company.color,
            buses: {
              create: {
                name: company.bus,
                code: company.coach,
                amenities: [...company.amenities],
                seats: { create: layout },
              },
            },
          },
        },
      },
      include: { company: { include: { buses: true } } },
    });
    busByUser.set(company.username, user.company!.buses[0]!.id);
  }

  const companyIds = new Map<string, string>();
  const owners = await prisma.company.findMany({ include: { owner: true } });
  for (const company of owners) companyIds.set(company.owner.username, company.id);

  const routeIds: { id: string; origin: string; destination: string; minutes: number; busId: string; prices: Record<SeatClass, number> }[] = [];

  for (const road of ROADS) {
    const key = `${road.from}|${road.to}`;
    const operators = OPERATORS[key] ?? [];
    for (const username of operators) {
      for (const [origin, destination] of [
        [road.from, road.to],
        [road.to, road.from],
      ] as const) {
        const prices = {
          economy: classFare(road.base, 'economy'),
          comfort: classFare(road.base, 'comfort'),
          premium: classFare(road.base, 'premium'),
        };
        const route = await prisma.route.create({
          data: {
            companyId: companyIds.get(username)!,
            originId: origin,
            destinationId: destination,
            durationMin: road.minutes,
            distanceKm: road.km,
            prices: {
              create: (Object.entries(prices) as [SeatClass, number][]).map(([seatClass, priceSyp]) => ({
                class: seatClass,
                priceSyp,
              })),
            },
          },
        });
        routeIds.push({
          id: route.id,
          origin,
          destination,
          minutes: road.minutes,
          busId: busByUser.get(username)!,
          prices,
        });
      }
    }
  }

  const today = damascusToday();
  const tripRows: {
    id: string;
    routeId: string;
    busId: string;
    departAt: Date;
    arriveAt: Date;
    prices: Record<SeatClass, number>;
  }[] = [];

  for (let day = 0; day < 5; day += 1) {
    const date = addDays(today, day);
    for (const route of routeIds) {
      for (const slot of SLOTS) {
        const departAt = new Date(`${date}T${slot}:00+03:00`);
        tripRows.push({
          id: crypto.randomUUID(),
          routeId: route.id,
          busId: route.busId,
          departAt,
          arriveAt: new Date(departAt.getTime() + route.minutes * 60_000),
          prices: route.prices,
        });
      }
    }
  }

  for (let index = 0; index < tripRows.length; index += 100) {
    const chunk = tripRows.slice(index, index + 100);
    await prisma.trip.createMany({
      data: chunk.map((trip) => ({
        id: trip.id,
        routeId: trip.routeId,
        busId: trip.busId,
        departAt: trip.departAt,
        arriveAt: trip.arriveAt,
      })),
    });
  }

  const seatRows: {
    tripId: string;
    label: string;
    row: number;
    col: string;
    class: SeatClass;
    priceSyp: number;
    status: SeatStatus;
  }[] = [];

  for (const trip of tripRows) {
    let blocked = 0;
    for (const seat of layout) {
      const block = blocked < layout.length - 8 && hash(`${trip.id}|${seat.label}`) % 5 === 0;
      if (block) blocked += 1;
      seatRows.push({
        tripId: trip.id,
        label: seat.label,
        row: seat.row,
        col: seat.col,
        class: seat.class,
        priceSyp: trip.prices[seat.class],
        status: block ? SeatStatus.blocked : SeatStatus.available,
      });
    }
  }

  for (let index = 0; index < seatRows.length; index += 2000) {
    await prisma.tripSeat.createMany({ data: seatRows.slice(index, index + 2000) });
  }

  console.log(`seed: ${tripRows.length} trips, ${seatRows.length} seats`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
