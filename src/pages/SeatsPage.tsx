import { useEffect, useMemo } from 'react';
import { Button, EmptyState, useToast } from 'mors-component-library';
import { FlowSteps } from '../components/FlowSteps';
import { SeatMap } from '../components/SeatMap';
import { cityById, companyById } from '../data';
import { formatDuration, formatMoney, formatTime } from '../format';
import { useI18n } from '../i18n';
import { payPath, resultsPath, seatsPath, type Navigate, type SearchQuery } from '../route';
import { bookedSeatIds } from '../storage';
import { findTrip, type Seat } from '../trips';
import { useBookings } from '../useBookings';

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
  const bookings = useBookings();
  const trip = useMemo(() => findTrip(tripId), [tripId]);
  const taken = useMemo(() => (trip ? bookedSeatIds(trip.id, bookings) : new Set<string>()), [trip, bookings]);

  const selected = useMemo(() => {
    if (!trip) return [];
    return seatIds
      .filter((id) => {
        const seat = trip.seats.find((item) => item.id === id);
        return Boolean(seat && !seat.occupied && !taken.has(id));
      })
      .slice(0, query.pax);
  }, [seatIds, trip, taken, query.pax]);

  useEffect(() => {
    if (!trip) return;
    if (selected.join(',') === seatIds.join(',')) return;
    navigate(seatsPath(query, trip.id, selected), 'replace');
  }, [selected, seatIds, trip, query, navigate]);

  if (!trip) {
    return (
      <EmptyState
        title={t('tripMissing')}
        description={t('tripMissingBody')}
        actions={<Button onClick={() => navigate(resultsPath(query))}>{t('changeSearch')}</Button>}
      />
    );
  }

  const origin = cityById(trip.originId);
  const destination = cityById(trip.destinationId);
  const company = companyById(trip.companyId);
  const total = selected.reduce((sum, id) => sum + (trip.seats.find((seat) => seat.id === id)?.price ?? 0), 0);

  function toggle(seat: Seat) {
    if (seat.occupied || taken.has(seat.id)) {
      toast({ title: t('takenSeat'), tone: 'warning' });
      return;
    }
    if (selected.includes(seat.id)) {
      navigate(seatsPath(query, trip!.id, selected.filter((id) => id !== seat.id)), 'replace');
      return;
    }
    if (selected.length >= query.pax) {
      toast({
        title: t('maxSeats', { n: query.pax }),
        tone: 'info',
      });
      return;
    }
    navigate(seatsPath(query, trip!.id, [...selected, seat.id]), 'replace');
  }

  return (
    <div className="sp-stack">
      <FlowSteps current={0} />
      <div className="sp-ride">
        <strong>{lang === 'ar' ? company.ar : company.en}</strong>
        <span>
          {formatTime(trip.departAt, lang)} {origin?.[lang]}
          {' · '}
          {formatDuration(trip.durationMin, lang)}
          {' · '}
          {formatTime(trip.arriveAt, lang)} {destination?.[lang]}
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
      <SeatMap seats={trip.seats} taken={taken} selected={selected} onToggle={toggle} />
      <div className="sp-dock">
        <div className="sp-dock-inner">
          <div className="sp-dock-copy">
            <strong>{selected.length === 1 ? t('selectedOne') : selected.length > 1 ? t('selectedSummary', { n: selected.length }) : t('noneSelected')}</strong>
            <span>{selected.length > 0 ? `${selected.join(' · ')} · ${formatMoney(total, lang)}` : t('chooseSeats')}</span>
          </div>
          <Button size="lg" disabled={selected.length === 0} onClick={() => navigate(payPath(query, trip.id, selected))}>
            {t('continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
