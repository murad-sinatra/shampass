import { useEffect, useMemo, useState } from 'react';
import { Button, EmptyState } from 'mors-component-library';
import { roadBetween } from '../data';
import { addDays, formatLongDate, todayISO } from '../format';
import { useI18n } from '../i18n';
import { resultsPath, seatsPath, type Navigate, type SearchQuery } from '../route';
import { bookedSeatIds, saveSearch } from '../storage';
import { getTrips, type Trip } from '../trips';
import { useBookings } from '../useBookings';
import { TripCard } from '../components/TripCard';

type SortKey = 'depart' | 'price' | 'duration';

export function ResultsPage({ query, navigate }: { query: SearchQuery; navigate: Navigate }) {
  const { t, lang } = useI18n();
  const bookings = useBookings();
  const [sort, setSort] = useState<SortKey>('depart');
  const road = roadBetween(query.from, query.to);
  const today = todayISO();

  const trips = useMemo(() => {
    const now = Date.now() + 15 * 60_000;
    return getTrips(query.from, query.to, query.date).filter((trip) => new Date(trip.departAt).getTime() > now);
  }, [query.from, query.to, query.date]);

  const sorted = useMemo(() => {
    const copy = [...trips];
    copy.sort((a, b) => compareTrips(a, b, sort, bookings));
    return copy;
  }, [trips, sort, bookings]);

  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(today, index)), [today]);

  useEffect(() => {
    saveSearch(query);
  }, [query]);

  if (!road || query.from === query.to) {
    return (
      <EmptyState
        title={t('noRoute')}
        description={t('noRouteBody')}
        actions={<Button onClick={() => navigate('#/')}>{t('changeSearch')}</Button>}
      />
    );
  }

  const nextDay = addDays(query.date, 1);
  const canNext = nextDay <= addDays(today, 13);

  return (
    <div className="sp-stack">
      <p className="sp-sub">
        {formatLongDate(query.date, lang)}
        {' · '}
        {query.pax === 1 ? t('paxOne') : t('paxCount', { n: query.pax })}
      </p>
      <div className="sp-days" role="group" aria-label={t('date')}>
        {days.map((day) => {
          const parsed = new Date(`${day}T12:00:00`);
          const name =
            day === today
              ? t('today')
              : day === addDays(today, 1)
                ? t('tomorrow')
                : new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SY' : 'en-GB', { weekday: 'short' }).format(parsed);
          const num = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SY' : 'en-GB', { day: 'numeric' }).format(parsed);
          return (
            <button
              key={day}
              type="button"
              className={day === query.date ? 'sp-day is-selected' : 'sp-day'}
              aria-pressed={day === query.date}
              aria-label={formatLongDate(day, lang)}
              onClick={() => {
                const next = { ...query, date: day };
                saveSearch(next);
                navigate(resultsPath(next), 'replace');
              }}
            >
              <span>{name}</span>
              <strong>{num}</strong>
            </button>
          );
        })}
      </div>
      <div className="sp-sort" role="group">
        {(['depart', 'price', 'duration'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={sort === key ? 'sp-sort-btn is-selected' : 'sp-sort-btn'}
            aria-pressed={sort === key}
            onClick={() => setSort(key)}
          >
            {t(key === 'depart' ? 'sortDepart' : key === 'price' ? 'sortPrice' : 'sortDuration')}
          </button>
        ))}
      </div>
      {sorted.length === 0 ? (
        <EmptyState
          title={t('noTrips')}
          description={t('noTripsBody')}
          actions={
            canNext ? (
              <Button
                onClick={() => {
                  const next = { ...query, date: nextDay };
                  saveSearch(next);
                  navigate(resultsPath(next));
                }}
              >
                {t('nextDay')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="sp-trip-list">
          {sorted.map((trip) => (
            <li key={trip.id}>
              <TripCard
                trip={trip}
                taken={bookedSeatIds(trip.id, bookings)}
                onSelect={() => {
                  saveSearch(query);
                  navigate(seatsPath(query, trip.id, []));
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function cheapest(trip: Trip, bookings: ReturnType<typeof useBookings>, availableOnly: boolean): number {
  const taken = bookedSeatIds(trip.id, bookings);
  const seats = trip.seats.filter((seat) => !availableOnly || (!seat.occupied && !taken.has(seat.id)));
  if (seats.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...seats.map((seat) => seat.price));
}

function compareTrips(a: Trip, b: Trip, sort: SortKey, bookings: ReturnType<typeof useBookings>): number {
  if (sort === 'duration') return a.durationMin - b.durationMin || a.departAt.localeCompare(b.departAt);
  if (sort === 'price') return cheapest(a, bookings, true) - cheapest(b, bookings, true) || a.departAt.localeCompare(b.departAt);
  return a.departAt.localeCompare(b.departAt);
}
