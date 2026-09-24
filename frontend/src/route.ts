import { addDays, todayISO } from './format';

export interface SearchQuery {
  from: string;
  to: string;
  date: string;
  pax: number;
}

export type AppRoute =
  | { name: 'home' }
  | { name: 'results'; query: SearchQuery }
  | { name: 'seats'; query: SearchQuery; tripId: string; seatIds: string[] }
  | { name: 'pay'; query: SearchQuery; tripId: string; seatIds: string[] }
  | { name: 'ticket'; id: string }
  | { name: 'tickets' }
  | { name: 'login'; next: string }
  | { name: 'register'; next: string }
  | { name: 'notifications' }
  | { name: 'account' }
  | { name: 'provider' }
  | { name: 'buses' }
  | { name: 'bus'; id: string | null }
  | { name: 'routes' }
  | { name: 'routeEdit'; id: string | null }
  | { name: 'trips' }
  | { name: 'tripEdit'; id: string | null }
  | { name: 'providerBookings' };

export type Navigate = (hash: string, mode?: 'push' | 'replace') => void;

function clampPax(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function cityId(value: string | null): string | null {
  if (!value || !/^[a-z0-9-]{2,32}$/.test(value)) return null;
  return value;
}

export function parseSearch(params: URLSearchParams): SearchQuery | null {
  const from = cityId(params.get('from'));
  const to = cityId(params.get('to'));
  const date = params.get('date') ?? '';
  if (!from || !to) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const earliest = todayISO();
  const latest = addDays(earliest, 13);
  if (date < earliest || date > latest) return null;
  return { from, to, date, pax: clampPax(Number(params.get('pax'))) };
}

function seatList(params: URLSearchParams): string[] {
  const raw = params.get('seats');
  if (!raw) return [];
  return raw
    .split(',')
    .map((seat) => seat.trim())
    .filter((seat) => /^[0-9a-f-]{36}$/i.test(seat));
}

export function parseHash(hash: string): AppRoute {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, queryString] = raw.split('?');
  const params = new URLSearchParams(queryString ?? '');
  const next = params.get('next') ?? '';

  if (path === '/login') return { name: 'login', next };
  if (path === '/register') return { name: 'register', next };
  if (path === '/notifications') return { name: 'notifications' };
  if (path === '/account') return { name: 'account' };
  if (path === '/tickets') return { name: 'tickets' };
  if (path === '/provider') return { name: 'provider' };
  if (path === '/provider/buses') return { name: 'buses' };
  if (path === '/provider/bus') return { name: 'bus', id: params.get('id') };
  if (path === '/provider/routes') return { name: 'routes' };
  if (path === '/provider/route') return { name: 'routeEdit', id: params.get('id') };
  if (path === '/provider/trips') return { name: 'trips' };
  if (path === '/provider/trip') return { name: 'tripEdit', id: params.get('id') };
  if (path === '/provider/bookings') return { name: 'providerBookings' };
  if (path === '/ticket') {
    const id = params.get('id') ?? '';
    if (/^SH-[A-Z2-9]{4}$/.test(id)) return { name: 'ticket', id };
    return { name: 'tickets' };
  }

  const query = parseSearch(params);
  if (!query) return { name: 'home' };
  const tripId = params.get('trip') ?? '';
  const seatIds = seatList(params);
  if (path === '/results') return { name: 'results', query };
  if (path === '/seats' && tripId) return { name: 'seats', query, tripId, seatIds };
  if (path === '/pay' && tripId && seatIds.length > 0) return { name: 'pay', query, tripId, seatIds };
  if (path === '/pay' && tripId) return { name: 'seats', query, tripId, seatIds };
  return { name: 'home' };
}

function searchString(query: SearchQuery, extra?: Record<string, string>): string {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    date: query.date,
    pax: String(query.pax),
  });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) params.set(key, value);
  }
  return params.toString();
}

export function resultsPath(query: SearchQuery): string {
  return `#/results?${searchString(query)}`;
}

export function seatsPath(query: SearchQuery, tripId: string, seatIds: string[]): string {
  return `#/seats?${searchString(query, { trip: tripId, seats: seatIds.join(',') })}`;
}

export function payPath(query: SearchQuery, tripId: string, seatIds: string[]): string {
  return `#/pay?${searchString(query, { trip: tripId, seats: seatIds.join(',') })}`;
}

export function ticketPath(id: string): string {
  return `#/ticket?id=${encodeURIComponent(id)}`;
}

export function loginPath(next: string): string {
  return `#/login?next=${encodeURIComponent(next)}`;
}

export function registerPath(next: string): string {
  return `#/register?next=${encodeURIComponent(next)}`;
}

export function routeKey(route: AppRoute): string {
  switch (route.name) {
    case 'home':
    case 'tickets':
    case 'notifications':
    case 'account':
    case 'provider':
    case 'buses':
    case 'routes':
    case 'trips':
    case 'providerBookings':
      return route.name;
    case 'login':
    case 'register':
      return `${route.name}:${route.next}`;
    case 'ticket':
      return `ticket:${route.id}`;
    case 'bus':
      return `bus:${route.id ?? 'new'}`;
    case 'routeEdit':
      return `route:${route.id ?? 'new'}`;
    case 'tripEdit':
      return `trip:${route.id ?? 'new'}`;
    case 'results':
      return `results:${route.query.from}:${route.query.to}`;
    case 'seats':
      return `seats:${route.tripId}`;
    case 'pay':
      return `pay:${route.tripId}:${route.seatIds.join(',')}`;
  }
}

export function go(hash: string, mode: 'push' | 'replace' = 'push') {
  const next = hash.startsWith('#') ? hash : `#${hash}`;
  if (mode === 'replace') {
    history.replaceState(null, '', `${location.pathname}${location.search}${next}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  if (location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  location.hash = next;
}
