import { cityById } from './data';
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
  | { name: 'tickets' };

export type Navigate = (hash: string, mode?: 'push' | 'replace') => void;

function clampPax(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function parseSearch(params: URLSearchParams): SearchQuery | null {
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const date = params.get('date') ?? '';
  if (!cityById(from) || !cityById(to)) return null;
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
    .filter((seat) => /^\d{1,2}[A-D]$/.test(seat));
}

export function parseHash(hash: string): AppRoute {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, queryString] = raw.split('?');
  const params = new URLSearchParams(queryString ?? '');
  const query = parseSearch(params);

  if (path === '/tickets') return { name: 'tickets' };
  if (path === '/ticket') {
    const id = params.get('id') ?? '';
    if (/^SH-[A-Z2-9]{4}$/.test(id)) return { name: 'ticket', id };
    return { name: 'tickets' };
  }
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
  return `#/seats?${searchString(query, {
    trip: tripId,
    seats: seatIds.join(','),
  })}`;
}

export function payPath(query: SearchQuery, tripId: string, seatIds: string[]): string {
  return `#/pay?${searchString(query, {
    trip: tripId,
    seats: seatIds.join(','),
  })}`;
}

export function ticketPath(id: string): string {
  return `#/ticket?id=${encodeURIComponent(id)}`;
}

export function routeKey(route: AppRoute): string {
  switch (route.name) {
    case 'home':
      return 'home';
    case 'tickets':
      return 'tickets';
    case 'ticket':
      return `ticket:${route.id}`;
    case 'results':
      return `results:${route.query.from}:${route.query.to}:${route.query.date}:${route.query.pax}`;
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
