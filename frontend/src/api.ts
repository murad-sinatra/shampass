import type { MessageKey } from './i18n';
import type {
  Account,
  Booking,
  BusDetail,
  BusSummary,
  Catalog,
  Dashboard,
  Notice,
  ProviderTrip,
  RouteDetail,
  Trip,
  TripSummary,
} from './types';

const TOKEN_KEY = 'shampass.token';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
  if (!response.ok) {
    throw new ApiError(response.status, data.code ?? 'ERROR', data.message ?? '');
  }
  return data as T;
}

const CODE_KEYS: Record<string, MessageKey> = {
  AUTH: 'authFailed',
  USERNAME: 'usernameError',
  PASSWORD: 'passwordError',
  USERNAME_TAKEN: 'usernameTaken',
  SEAT_TAKEN: 'seatTakenNow',
  TRIP_CLOSED: 'tripClosed',
  BUS_IN_USE: 'busInUse',
  ROUTE_IN_USE: 'routeInUse',
  ROUTE_EXISTS: 'routeExists',
  PHONE: 'phoneError',
  NAME: 'nameError',
  OTP: 'otpError',
  CARDNAME: 'cardNameError',
  CARDNUMBER: 'cardNumberError',
  EXPIRY: 'expiryError',
  CVC: 'cvcError',
  DEPART: 'departError',
  PRICE: 'invalidPrice',
  NO_SEATS: 'emptySeats',
  ROUTE: 'sameRoute',
};

export function explain(error: unknown, t: (key: MessageKey, vars?: Record<string, string | number>) => string): string {
  if (error instanceof ApiError) {
    const key = CODE_KEYS[error.code];
    if (key) return t(key);
  }
  return t('errorGeneric');
}

export const api = {
  catalog: () => request<Catalog>('/api/catalog'),
  search: (from: string, to: string, date: string) =>
    request<{ routeExists: boolean; trips: TripSummary[] }>(
      `/api/trips?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`,
    ),
  trip: (id: string) => request<Trip>(`/api/trips/${encodeURIComponent(id)}`),
  register: (body: Record<string, string>) =>
    request<{ token: string; user: Account }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (username: string, password: string) =>
    request<{ token: string; user: Account }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<Account>('/api/auth/me'),
  bookings: () => request<Booking[]>('/api/bookings'),
  booking: (id: string) => request<Booking>(`/api/bookings/${encodeURIComponent(id)}`),
  createBooking: (body: unknown) => request<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(body) }),
  cancelBooking: (id: string) => request<Booking>(`/api/bookings/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
  notifications: () => request<{ unread: number; items: Notice[] }>('/api/notifications'),
  readNotification: (id: string) => request<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  readAll: () => request<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' }),
  dashboard: () => request<Dashboard>('/api/provider/dashboard'),
  updateCompany: (body: { nameAr?: string; nameEn?: string; phone?: string }) =>
    request<Account['company']>('/api/provider/company', { method: 'PATCH', body: JSON.stringify(body) }),
  buses: () => request<BusSummary[]>('/api/provider/buses'),
  bus: (id: string) => request<BusDetail>(`/api/provider/buses/${id}`),
  createBus: (body: unknown) => request<BusDetail>('/api/provider/buses', { method: 'POST', body: JSON.stringify(body) }),
  updateBus: (id: string, body: unknown) =>
    request<BusDetail>(`/api/provider/buses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteBus: (id: string) => request<{ ok: boolean }>(`/api/provider/buses/${id}`, { method: 'DELETE' }),
  addSeat: (id: string, body: unknown) =>
    request<BusDetail>(`/api/provider/buses/${id}/seats`, { method: 'POST', body: JSON.stringify(body) }),
  deleteSeat: (id: string, seatId: string) =>
    request<BusDetail>(`/api/provider/buses/${id}/seats/${seatId}`, { method: 'DELETE' }),
  layout: (id: string) => request<BusDetail>(`/api/provider/buses/${id}/layout`, { method: 'POST' }),
  routes: () => request<RouteDetail[]>('/api/provider/routes'),
  createRoute: (body: unknown) => request<RouteDetail>('/api/provider/routes', { method: 'POST', body: JSON.stringify(body) }),
  updateRoute: (id: string, body: unknown) =>
    request<RouteDetail>(`/api/provider/routes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRoute: (id: string) => request<{ ok: boolean }>(`/api/provider/routes/${id}`, { method: 'DELETE' }),
  providerTrips: () => request<ProviderTrip[]>('/api/provider/trips'),
  providerTrip: (id: string) => request<Trip>(`/api/provider/trips/${id}`),
  createTrip: (body: unknown) => request<Trip>('/api/provider/trips', { method: 'POST', body: JSON.stringify(body) }),
  setTripStatus: (id: string, status: string) =>
    request<Trip>(`/api/provider/trips/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateTripSeat: (id: string, seatId: string, body: unknown) =>
    request<Trip['seats'][number]>(`/api/provider/trips/${id}/seats/${seatId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  providerBookings: () => request<Booking[]>('/api/provider/bookings'),
};
