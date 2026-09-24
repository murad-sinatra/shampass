import { useEffect, useMemo, useState } from 'react';
import { Button, EmptyState } from 'mors-component-library';
import { api } from '../api';
import { TripCard } from '../components/TripCard';
import { addDays, formatLongDate, todayISO } from '../format';
import { useI18n } from '../i18n';
import { cityLabel } from '../cities';
import { resultsPath, seatsPath, type Navigate, type SearchQuery } from '../route';
import { saveSearch } from '../storage';
import type { TripSummary } from '../types';

type SortKey = 'depart' | 'price' | 'duration';

export function ResultsPage({ query, navigate }: { query: SearchQuery; navigate: Navigate }) {
  const { t, lang } = useI18n();
  const [sort, setSort] = useState<SortKey>('depart');
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [routeExists, setRouteExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const today = todayISO();

  useEffect(() => {
    saveSearch(query);
    let active = true;
    setLoading(true);
    setFailed(false);
    api
      .search(query.from, query.to, query.date)
      .then((result) => {
        if (!active) return;
        setRouteExists(result.routeExists);
        setTrips(result.trips);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  const sorted = useMemo(() => {
    const copy = [...(trips ?? [])];
    copy.sort((a, b) => compareTrips(a, b, sort));
    return copy;
  }, [trips, sort]);

  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(today, index)), [today]);

  const nextDay = addDays(query.date, 1);
  const canNext = nextDay <= addDays(today, 13);
  const showSkeleton = loading && trips === null;

  return (
    <div className="sp-stack sp-results">
      <header className="sp-board-head">
        <span>{cityLabel(query.from, lang)}</span>
        <span className="sp-board-track" aria-hidden="true" />
        <span>{cityLabel(query.to, lang)}</span>
      </header>
      <div className="sp-results-bar">
      <p className="sp-sub">
        {formatLongDate(query.date, lang)}
        {' · '}
        {query.pax === 1 ? t('paxOne') : t('paxCount', { n: query.pax })}
      </p>
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
      </div>
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
      <div className={loading ? 'sp-results-panel is-loading' : 'sp-results-panel'} aria-busy={loading}>
        {loading && <div className="sp-results-progress" role="progressbar" aria-label={t('loading')} />}
        {failed ? (
          <EmptyState title={t('errorGeneric')} actions={<Button onClick={() => navigate('#/search')}>{t('changeSearch')}</Button>} />
        ) : showSkeleton ? (
          <ul className="sp-trip-list is-skeleton" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <li key={item}>
                <div className="sp-trip-skeleton" />
              </li>
            ))}
          </ul>
        ) : !routeExists || query.from === query.to ? (
          <EmptyState
            title={t('noRoute')}
            description={t('noRouteBody')}
            actions={<Button onClick={() => navigate('#/search')}>{t('changeSearch')}</Button>}
          />
        ) : sorted.length === 0 ? (
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
                <TripCard trip={trip} onSelect={() => navigate(seatsPath(query, trip.id, []))} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function compareTrips(a: TripSummary, b: TripSummary, sort: SortKey): number {
  if (sort === 'duration') return a.durationMin - b.durationMin || a.departAt.localeCompare(b.departAt);
  if (sort === 'price') return (a.lowestPrice ?? Number.POSITIVE_INFINITY) - (b.lowestPrice ?? Number.POSITIVE_INFINITY);
  return a.departAt.localeCompare(b.departAt);
}
