import { useEffect, useState } from 'react';
import { Alert, Button, DatePicker, EmptyState, Select, TextField, useToast } from 'mors-component-library';
import { api, explain } from '../api';
import { formatMoney, formatTime, parseISODate, toISODate } from '../format';
import { useI18n } from '../i18n';
import type { Navigate } from '../route';
import type { AmenityId, BusDetail, BusSummary, Catalog, Dashboard, RouteDetail, SeatClassId, Trip, TripStatus } from '../types';
import type { Booking } from '../types';

const AMENITIES: AmenityId[] = ['ac', 'usb', 'wifi', 'water', 'reclining'];
const CLASSES: SeatClassId[] = ['economy', 'comfort', 'premium'];
const STATUSES: TripStatus[] = ['scheduled', 'boarding', 'departed', 'arrived', 'cancelled'];

export function ProviderHome({ navigate }: { navigate: Navigate }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState<Dashboard | null>(null);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then((next) => {
      setData(next);
      setNameAr(next.company.ar);
      setNameEn(next.company.en);
      setPhone(next.company.phone ?? '');
    }).catch((reason: unknown) => setError(explain(reason, t)));
  }, [t]);

  if (!data && !error) return <p className="sp-loading">{t('loading')}</p>;

  return (
    <div className="sp-stack sp-desk">
      <header className="sp-hero">
        <p className="sp-kicker">{t('providerHome')}</p>
        <h1>{data ? (lang === 'ar' ? data.company.ar : data.company.en) : t('providerHome')}</h1>
        <p className="sp-lead">{t('providerLead')}</p>
      </header>
      {error && <Alert tone="danger" title={error} />}
      <div className="sp-desk-grid">
      {data && (
        <div className="sp-stats">
          <button type="button" onClick={() => navigate('#/provider/buses')}>
            <strong>{data.buses}</strong>
            <span>{t('buses')}</span>
          </button>
          <button type="button" onClick={() => navigate('#/provider/routes')}>
            <strong>{data.routes}</strong>
            <span>{t('routesNav')}</span>
          </button>
          <button type="button" onClick={() => navigate('#/provider/trips')}>
            <strong>{data.upcomingTrips}</strong>
            <span>{t('upcomingTrips')}</span>
          </button>
          <button type="button" onClick={() => navigate('#/provider/bookings')}>
            <strong>{data.bookings}</strong>
            <span>{t('bookingsTab')}</span>
          </button>
        </div>
      )}
      <form
        className="sp-form sp-fields"
        onSubmit={(event) => {
          event.preventDefault();
          void api
            .updateCompany({ nameAr, nameEn, phone })
            .then(() => toast({ title: t('saved'), tone: 'success' }))
            .catch((reason: unknown) => setError(explain(reason, t)));
        }}
      >
        <TextField label={t('companyNameAr')} value={nameAr} onChange={(event) => setNameAr(event.target.value)} />
        <TextField label={t('companyNameEn')} dir="ltr" value={nameEn} onChange={(event) => setNameEn(event.target.value)} />
        <TextField label={t('companyPhone')} description={t('optional')} dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Button type="submit">{t('save')}</Button>
      </form>
      </div>
    </div>
  );
}

export function BusesPage({ navigate }: { navigate: Navigate }) {
  const { t } = useI18n();
  const [buses, setBuses] = useState<BusSummary[] | null>(null);
  useEffect(() => {
    api.buses().then(setBuses).catch(() => setBuses([]));
  }, []);
  if (!buses) return <p className="sp-loading">{t('loading')}</p>;
  return (
    <div className="sp-stack">
      <div className="sp-section-head">
        <h1 className="sp-page-title">{t('buses')}</h1>
        <Button onClick={() => navigate('#/provider/bus')}>{t('newBus')}</Button>
      </div>
      {buses.length === 0 ? (
        <EmptyState title={t('noBuses')} description={t('noBusesBody')} />
      ) : (
        <ul className="sp-manage-list">
          {buses.map((bus) => (
            <li key={bus.id}>
              <button type="button" onClick={() => navigate(`#/provider/bus?id=${bus.id}`)}>
                <strong>
                  {bus.name} · {bus.code}
                </strong>
                <span>
                  {t('seatsCount', { n: bus.seats })} · {bus.active ? t('active') : t('inactive')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BusPage({ id, navigate }: { id: string | null; navigate: Navigate }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [bus, setBus] = useState<BusDetail | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [amenities, setAmenities] = useState<string[]>(['ac']);
  const [active, setActive] = useState(true);
  const [row, setRow] = useState('6');
  const [column, setColumn] = useState('A');
  const [classId, setClassId] = useState<SeatClassId>('economy');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.bus(id).then((next) => {
      setBus(next);
      setName(next.name);
      setCode(next.code);
      setAmenities(next.amenities);
      setActive(next.active);
    }).catch((reason: unknown) => setError(explain(reason, t)));
  }, [id, t]);

  function toggleAmenity(amenity: string) {
    setAmenities((current) => (current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity]));
  }

  async function save() {
    setError('');
    try {
      if (!id) {
        const created = await api.createBus({ name, code, amenities, standard: true });
        toast({ title: t('saved'), tone: 'success' });
        navigate(`#/provider/bus?id=${created.id}`, 'replace');
        return;
      }
      const next = await api.updateBus(id, { name, code, amenities, active });
      setBus(next);
      toast({ title: t('saved'), tone: 'success' });
    } catch (reason) {
      setError(explain(reason, t));
    }
  }

  return (
    <div className="sp-stack">
      <h1 className="sp-page-title">{id ? name || t('buses') : t('newBus')}</h1>
      {error && <Alert tone="danger" title={error} />}
      <form
        className="sp-form sp-fields"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <TextField label={t('busName')} value={name} onChange={(event) => setName(event.target.value)} />
        <TextField label={t('coachCode')} dir="ltr" value={code} onChange={(event) => setCode(event.target.value)} />
        <div className="sp-sort" role="group" aria-label={t('ac')}>
          {AMENITIES.map((amenity) => (
            <button
              key={amenity}
              type="button"
              className={amenities.includes(amenity) ? 'sp-sort-btn is-selected' : 'sp-sort-btn'}
              aria-pressed={amenities.includes(amenity)}
              onClick={() => toggleAmenity(amenity)}
            >
              {t(amenity)}
            </button>
          ))}
        </div>
        {id && (
          <Button type="button" variant={active ? 'secondary' : 'primary'} onClick={() => setActive((value) => !value)}>
            {active ? t('active') : t('inactive')}
          </Button>
        )}
        <Button type="submit">{t('save')}</Button>
      </form>
      {id && bus && (
        <>
          <p className="sp-fine">{t('layoutHint')}</p>
          <div className="sp-row-actions">
            <Button
              variant="secondary"
              onClick={() => {
                void api.layout(id).then(setBus).catch((reason: unknown) => setError(explain(reason, t)));
              }}
            >
              {t('generateLayout')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void api
                  .deleteBus(id)
                  .then(() => navigate('#/provider/buses', 'replace'))
                  .catch((reason: unknown) => setError(explain(reason, t)));
              }}
            >
              {t('deleteBus')}
            </Button>
          </div>
          <form
            className="sp-form sp-seat-add"
            onSubmit={(event) => {
              event.preventDefault();
              void api
                .addSeat(id, { row: Number(row), column, classId })
                .then(setBus)
                .catch((reason: unknown) => setError(explain(reason, t)));
            }}
          >
            <TextField label={t('row')} dir="ltr" inputMode="numeric" value={row} onChange={(event) => setRow(event.target.value)} />
            <Select
              label={t('column')}
              value={column}
              options={['A', 'B', 'C', 'D'].map((value) => ({ value, label: value }))}
              onChange={setColumn}
            />
            <Select
              label={t('seatClass')}
              value={classId}
              options={CLASSES.map((value) => ({ value, label: t(value) }))}
              onChange={(value) => setClassId(value as SeatClassId)}
            />
            <Button type="submit">{t('addSeat')}</Button>
          </form>
          <ul className="sp-manage-list">
            {bus.seats.map((seat) => (
              <li key={seat.id} className="sp-manage-seat">
                <strong>{seat.label}</strong>
                <span>{t(seat.classId)}</span>
                <Button variant="ghost" onClick={() => void api.deleteSeat(id, seat.id).then(setBus)}>
                  {t('delete')}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function RoutesPage({ navigate }: { navigate: Navigate }) {
  const { t, lang } = useI18n();
  const [routes, setRoutes] = useState<RouteDetail[] | null>(null);
  useEffect(() => {
    api.routes().then(setRoutes).catch(() => setRoutes([]));
  }, []);
  if (!routes) return <p className="sp-loading">{t('loading')}</p>;
  return (
    <div className="sp-stack">
      <div className="sp-section-head">
        <h1 className="sp-page-title">{t('routesNav')}</h1>
        <Button onClick={() => navigate('#/provider/route')}>{t('newRoute')}</Button>
      </div>
      {routes.length === 0 ? (
        <EmptyState title={t('noRoutes')} description={t('noRoutesBody')} />
      ) : (
        <ul className="sp-manage-list">
          {routes.map((route) => (
            <li key={route.id}>
              <button type="button" onClick={() => navigate(`#/provider/route?id=${route.id}`)}>
                <strong>
                  {route.origin[lang]} → {route.destination[lang]}
                </strong>
                <span>
                  {formatMoney(route.economy, lang)} · {route.active ? t('active') : t('inactive')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RoutePage({ id, navigate }: { id: string | null; navigate: Navigate }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [originId, setOriginId] = useState('damascus');
  const [destinationId, setDestinationId] = useState('swida');
  const [durationMin, setDurationMin] = useState('135');
  const [distanceKm, setDistanceKm] = useState('100');
  const [economy, setEconomy] = useState('75000');
  const [comfort, setComfort] = useState('100000');
  const [premium, setPremium] = useState('135000');
  const [active, setActive] = useState(true);
  const [lockedCities, setLockedCities] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.catalog().then(setCatalog).catch(() => setCatalog({ cities: [], fares: [] }));
  }, []);

  useEffect(() => {
    if (!id) return;
    api
      .routes()
      .then((rows) => {
        const route = rows.find((item) => item.id === id);
        if (!route) return;
        setOriginId(route.origin.id);
        setDestinationId(route.destination.id);
        setDurationMin(String(route.durationMin));
        setDistanceKm(String(route.distanceKm));
        setEconomy(String(route.economy));
        setComfort(String(route.comfort));
        setPremium(String(route.premium));
        setActive(route.active);
        setLockedCities(true);
      })
      .catch((reason: unknown) => setError(explain(reason, t)));
  }, [id, t]);

  const options = (catalog?.cities ?? []).map((city) => ({
    value: city.id,
    label: lang === 'ar' ? city.ar : city.en,
  }));

  const body = {
    originId,
    destinationId,
    durationMin: Number(durationMin),
    distanceKm: Number(distanceKm),
    economy: Number(economy),
    comfort: Number(comfort),
    premium: Number(premium),
    active,
  };

  return (
    <form
      className="sp-stack sp-fields"
      onSubmit={(event) => {
        event.preventDefault();
        setError('');
        const action = id ? api.updateRoute(id, body) : api.createRoute(body);
        void action
          .then((route) => {
            toast({ title: t('saved'), tone: 'success' });
            navigate(`#/provider/route?id=${route.id}`, 'replace');
          })
          .catch((reason: unknown) => setError(explain(reason, t)));
      }}
    >
      <h1 className="sp-page-title">{id ? t('routesNav') : t('newRoute')}</h1>
      {error && <Alert tone="danger" title={error} />}
      <Select label={t('from')} options={options} value={originId} disabled={lockedCities} onChange={setOriginId} />
      <Select label={t('to')} options={options} value={destinationId} disabled={lockedCities} onChange={setDestinationId} />
      <TextField label={t('durationMin')} dir="ltr" inputMode="numeric" value={durationMin} onChange={(event) => setDurationMin(event.target.value)} />
      <TextField label={t('distanceKm')} dir="ltr" inputMode="numeric" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} />
      <TextField label={t('priceEconomy')} description={t('fareHint')} dir="ltr" inputMode="numeric" value={economy} onChange={(event) => setEconomy(event.target.value)} />
      <TextField label={t('priceComfort')} dir="ltr" inputMode="numeric" value={comfort} onChange={(event) => setComfort(event.target.value)} />
      <TextField label={t('pricePremium')} dir="ltr" inputMode="numeric" value={premium} onChange={(event) => setPremium(event.target.value)} />
      <Button type="button" variant="secondary" onClick={() => setActive((value) => !value)}>
        {active ? t('active') : t('inactive')}
      </Button>
      <Button type="submit">{t('save')}</Button>
      {id && (
        <Button
          variant="ghost"
          onClick={() => {
            void api
              .deleteRoute(id)
              .then(() => navigate('#/provider/routes', 'replace'))
              .catch((reason: unknown) => setError(explain(reason, t)));
          }}
        >
          {t('deleteRoute')}
        </Button>
      )}
    </form>
  );
}

export function TripsPage({ navigate }: { navigate: Navigate }) {
  const { t, lang } = useI18n();
  const [trips, setTrips] = useState<Awaited<ReturnType<typeof api.providerTrips>> | null>(null);
  useEffect(() => {
    api.providerTrips().then(setTrips).catch(() => setTrips([]));
  }, []);
  if (!trips) return <p className="sp-loading">{t('loading')}</p>;
  return (
    <div className="sp-stack">
      <div className="sp-section-head">
        <h1 className="sp-page-title">{t('tripsNav')}</h1>
        <Button onClick={() => navigate('#/provider/trip')}>{t('newTrip')}</Button>
      </div>
      {trips.length === 0 ? (
        <EmptyState title={t('noTripsProvider')} description={t('noTripsProviderBody')} />
      ) : (
        <ul className="sp-manage-list">
          {trips.map((trip) => (
            <li key={trip.id}>
              <button type="button" onClick={() => navigate(`#/provider/trip?id=${trip.id}`)}>
                <strong>
                  {formatTime(trip.departAt, lang)} · {trip.origin[lang]} → {trip.destination[lang]}
                </strong>
                <span>
                  {t('coach', { n: trip.coach })} · {t(statusKey(trip.status))} · {t('seatsLeft', { n: trip.freeSeats })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TripPage({ id, navigate }: { id: string | null; navigate: Navigate }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteDetail[]>([]);
  const [buses, setBuses] = useState<BusSummary[]>([]);
  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [time, setTime] = useState('08:40');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      api.providerTrip(id).then(setTrip).catch((reason: unknown) => setError(explain(reason, t)));
      return;
    }
    void Promise.all([api.routes(), api.buses()]).then(([nextRoutes, nextBuses]) => {
      setRoutes(nextRoutes);
      setBuses(nextBuses);
      setRouteId(nextRoutes[0]?.id ?? '');
      setBusId(nextBuses[0]?.id ?? '');
    });
  }, [id, t]);

  if (id && !trip && !error) return <p className="sp-loading">{t('loading')}</p>;

  if (!id) {
    return (
      <form
        className="sp-stack sp-fields"
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          void api
            .createTrip({ routeId, busId, departAt: `${date}T${time}` })
            .then((created) => {
              toast({ title: t('saved'), tone: 'success' });
              navigate(`#/provider/trip?id=${created.id}`, 'replace');
            })
            .catch((reason: unknown) => setError(explain(reason, t)));
        }}
      >
        <h1 className="sp-page-title">{t('newTrip')}</h1>
        {error && <Alert tone="danger" title={error} />}
        <Select
          label={t('routesNav')}
          value={routeId}
          options={routes.map((route) => ({
            value: route.id,
            label: `${route.origin[lang]} → ${route.destination[lang]}`,
          }))}
          onChange={setRouteId}
        />
        <Select
          label={t('buses')}
          value={busId}
          options={buses.map((bus) => ({ value: bus.id, label: `${bus.name} · ${bus.code}` }))}
          onChange={setBusId}
        />
        <DatePicker label={t('date')} value={parseISODate(date)} onChange={(next) => next && setDate(toISODate(next))} />
        <TextField label={t('timeLabel')} dir="ltr" value={time} onChange={(event) => setTime(event.target.value)} />
        <Button type="submit">{t('save')}</Button>
      </form>
    );
  }

  if (!trip) return <Alert tone="danger" title={error || t('errorGeneric')} />;

  return (
    <div className="sp-stack">
      <h1 className="sp-page-title">
        {trip.origin[lang]} → {trip.destination[lang]}
      </h1>
      <p className="sp-sub">
        {formatTime(trip.departAt, lang)} · {t('coach', { n: trip.coach })}
      </p>
      {error && <Alert tone="danger" title={error} />}
      <div className="sp-sort" role="group" aria-label={t('followTitle')}>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={trip.status === status ? 'sp-sort-btn is-selected' : 'sp-sort-btn'}
            aria-pressed={trip.status === status}
            onClick={() => {
              void api
                .setTripStatus(trip.id, status)
                .then((next) => {
                  setTrip(next);
                  toast({ title: t('statusUpdated'), tone: 'success' });
                })
                .catch((reason: unknown) => setError(explain(reason, t)));
            }}
          >
            {t(statusKey(status))}
          </button>
        ))}
      </div>
      <ul className="sp-manage-list">
        {trip.seats.map((seat) => (
          <li key={seat.id} className="sp-manage-seat">
            <strong>{seat.label}</strong>
            <span>
              {t(seat.classId)} · {formatMoney(seat.price, lang)} · {seat.status === 'booked' ? t('bookedSeat') : seat.status === 'blocked' ? t('blockedSeat') : t('openSale')}
            </span>
            {seat.status !== 'booked' && (
              <span className="sp-row-actions">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const raw = window.prompt(t('seatPrice'), String(seat.price));
                    if (raw == null) return;
                    const price = Number(raw);
                    if (!Number.isInteger(price)) return;
                    void api.updateTripSeat(trip.id, seat.id, { price }).then(() => api.providerTrip(trip.id).then(setTrip));
                  }}
                >
                  {t('seatPrice')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const status = seat.status === 'blocked' ? 'available' : 'blocked';
                    void api.updateTripSeat(trip.id, seat.id, { status }).then(() => api.providerTrip(trip.id).then(setTrip));
                  }}
                >
                  {seat.status === 'blocked' ? t('unblock') : t('blockSeat')}
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProviderBookingsPage() {
  const { t, lang } = useI18n();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  useEffect(() => {
    api.providerBookings().then(setBookings).catch(() => setBookings([]));
  }, []);
  if (!bookings) return <p className="sp-loading">{t('loading')}</p>;
  if (bookings.length === 0) {
    return <EmptyState title={t('noProviderBookings')} description={t('noProviderBookingsBody')} />;
  }
  return (
    <div className="sp-stack">
      <h1 className="sp-page-title">{t('bookingsTab')}</h1>
      <ul className="sp-manage-list">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <div>
              <strong>
                {booking.id} · {booking.trip.origin[lang]} → {booking.trip.destination[lang]}
              </strong>
              <span>
                {booking.seats.map((seat) => `${seat.id} ${seat.passengerName}`).join(' · ')} · {booking.status === 'cancelled' ? t('cancelled') : t('confirmed')} · {formatMoney(booking.total, lang)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusKey(status: TripStatus) {
  if (status === 'scheduled') return 'statusScheduled' as const;
  if (status === 'boarding') return 'statusBoarding' as const;
  if (status === 'departed') return 'statusDeparted' as const;
  if (status === 'arrived') return 'statusArrived' as const;
  return 'statusCancelled' as const;
}
