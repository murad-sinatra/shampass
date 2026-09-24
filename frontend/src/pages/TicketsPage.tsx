import { useEffect, useState } from 'react';
import { Badge, Button, EmptyState } from 'mors-component-library';
import { api } from '../api';
import { formatMoney, formatTicketWhen, formatTime } from '../format';
import { useI18n } from '../i18n';
import { ticketPath, type Navigate } from '../route';
import type { Booking } from '../types';

export function TicketsPage({ navigate }: { navigate: Navigate }) {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    let active = true;
    api
      .bookings()
      .then((rows) => {
        if (active) setBookings(rows);
      })
      .catch(() => {
        if (active) setBookings([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!bookings) return <p className="sp-loading">{t('loading')}</p>;
  if (bookings.length === 0) {
    return (
      <EmptyState
        title={t('noTickets')}
        description={t('noTicketsBody')}
        actions={<Button onClick={() => navigate('#/')}>{t('findBus')}</Button>}
      />
    );
  }

  const now = Date.now();
  const upcoming = bookings
    .filter((booking) => booking.status === 'confirmed' && new Date(booking.trip.departAt).getTime() >= now && booking.trip.status !== 'arrived' && booking.trip.status !== 'cancelled')
    .sort((a, b) => a.trip.departAt.localeCompare(b.trip.departAt));
  const past = bookings.filter((booking) => !upcoming.includes(booking));

  return (
    <div className="sp-stack">
      <h1 className="sp-page-title">{t('myTickets')}</h1>
      {upcoming.length > 0 && (
        <section className="sp-section">
          <h2>{t('upcoming')}</h2>
          <ul className="sp-ticket-list">
            {upcoming.map((booking) => (
              <li key={booking.id}>
                <TicketRow booking={booking} onOpen={() => navigate(ticketPath(booking.id))} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section className="sp-section">
          <h2>{t('departed')}</h2>
          <ul className="sp-ticket-list">
            {past.map((booking) => (
              <li key={booking.id}>
                <TicketRow booking={booking} past onOpen={() => navigate(ticketPath(booking.id))} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TicketRow({ booking, past = false, onOpen }: { booking: Booking; past?: boolean; onOpen: () => void }) {
  const { t, lang } = useI18n();
  return (
    <button type="button" className="sp-ticket-row" onClick={onOpen}>
      <span className="sp-ticket-row-top">
        <strong>
          {booking.trip.origin[lang]} <span className="sp-forward">→</span> {booking.trip.destination[lang]}
        </strong>
        {past ? (
          <Badge size="sm" tone="neutral">
            {booking.status === 'cancelled' ? t('cancelled') : t('departed')}
          </Badge>
        ) : (
          <Badge size="sm" tone="accent">
            {booking.seats.map((seat) => seat.id).join(' · ')}
          </Badge>
        )}
      </span>
      <span className="sp-ticket-row-meta">
        {formatTicketWhen(booking.trip.departAt, lang)} · {formatTime(booking.trip.departAt, lang)}
      </span>
      <span className="sp-ticket-row-meta">
        {(lang === 'ar' ? booking.trip.company.ar : booking.trip.company.en)} · {booking.id} · {formatMoney(booking.total, lang)}
      </span>
    </button>
  );
}
