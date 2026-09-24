import { useEffect, useMemo, useState } from 'react';
import { Button, EmptyState, useToast } from 'mors-component-library';
import { api } from '../api';
import { FlowSteps } from '../components/FlowSteps';
import { SeatMap } from '../components/SeatMap';
import { formatDuration, formatMoney, formatTime } from '../format';
import { useI18n } from '../i18n';
import { payPath, resultsPath, seatsPath, type Navigate, type SearchQuery } from '../route';
import type { Seat, Trip } from '../types';

export function SeatsPage({
  query,
  tripId,
  seatIds,
  navigate,
}: {
  query: SearchQuery;
  tripId: string;
  seatIds: string[];
  navigate: Navigate;
}) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    api
      .trip(tripId)
      .then((next) => {
        if (active) setTrip(next);
      })
      .catch(() => {
        if (active) setTrip(null);
      });
    return () => {
      active = false;
    };
  }, [tripId]);

  const selected = useMemo(() => {
    if (!trip) return [];
    return seatIds
      .filter((id) => {
        const seat = trip.seats.find((item) => item.id === id);
        return Boolean(seat && !seat.occupied);
      })
      .slice(0, query.pax);
  }, [seatIds, trip, query.pax]);

  useEffect(() => {
    if (!trip) return;
    if (selected.join(',') === seatIds.join(',')) return;
    navigate(seatsPath(query, trip.id, selected), 'replace');
  }, [selected, seatIds, trip, query, navigate]);

  if (trip === undefined) return <p className="sp-loading">{t('loading')}</p>;
  if (!trip) {
    return (
      <EmptyState
        title={t('tripMissing')}
        description={t('tripMissingBody')}
        actions={<Button onClick={() => navigate(resultsPath(query))}>{t('changeSearch')}</Button>}
      />
    );
  }

  const total = selected.reduce((sum, id) => sum + (trip.seats.find((seat) => seat.id === id)?.price ?? 0), 0);
  const labels = selected.map((id) => trip.seats.find((seat) => seat.id === id)?.label ?? id);

  function toggle(seat: Seat) {
    if (seat.occupied) {
      toast({ title: t('takenSeat'), tone: 'warning' });
      return;
    }
    if (selected.includes(seat.id)) {
      navigate(seatsPath(query, trip!.id, selected.filter((id) => id !== seat.id)), 'replace');
      return;
    }
    if (selected.length >= query.pax) {
      toast({ title: t('maxSeats', { n: query.pax }), tone: 'info' });
      return;
    }
    navigate(seatsPath(query, trip!.id, [...selected, seat.id]), 'replace');
  }

  return (
    <div className="sp-stack">
      <FlowSteps current={0} />
      <div className="sp-ride">
        <strong>{lang === 'ar' ? trip.company.ar : trip.company.en}</strong>
        <span>
          {formatTime(trip.departAt, lang)} {trip.origin[lang]}
          {' · '}
          {formatDuration(trip.durationMin, lang)}
          {' · '}
          {formatTime(trip.arriveAt, lang)} {trip.destination[lang]}
        </span>
      </div>
      <ul className="sp-legend">
        <li>
          <i className="is-free" />
          {t('available')}
        </li>
        <li>
          <i className="is-yours" />
          {t('selected')}
        </li>
        <li>
          <i className="is-taken" />
          {t('taken')}
        </li>
      </ul>
      <SeatMap seats={trip.seats} selected={selected} onToggle={toggle} />
      <div className="sp-dock">
        <div className="sp-dock-inner">
          <div className="sp-dock-copy">
            <strong>
              {selected.length === 1 ? t('selectedOne') : selected.length > 1 ? t('selectedSummary', { n: selected.length }) : t('noneSelected')}
            </strong>
            <span>{selected.length > 0 ? `${labels.join(' · ')} · ${formatMoney(total, lang)}` : t('chooseSeats')}</span>
          </div>
          <Button size="lg" disabled={selected.length === 0} onClick={() => navigate(payPath(query, trip.id, selected))}>
            {t('continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
