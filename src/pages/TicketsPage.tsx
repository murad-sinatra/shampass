import { Badge, Button, EmptyState } from 'mors-component-library';
import { cityById, companyById } from '../data';
import { formatMoney, formatTicketWhen, formatTime } from '../format';
import { useI18n } from '../i18n';
import { ticketPath, type Navigate } from '../route';
import type { Booking } from '../storage';
import { useBookings } from '../useBookings';

export function TicketsPage({ navigate }: { navigate: Navigate }) {
  const { t } = useI18n();
  const bookings = useBookings();
  const now = Date.now();
  const upcoming = bookings
    .filter((booking) => new Date(booking.trip.departAt).getTime() >= now)
    .sort((a, b) => a.trip.departAt.localeCompare(b.trip.departAt));
  const past = bookings
    .filter((booking) => new Date(booking.trip.departAt).getTime() < now)
    .sort((a, b) => b.trip.departAt.localeCompare(a.trip.departAt));

  if (bookings.length === 0) {
    return (
      <EmptyState
        title={t('noTickets')}
        description={t('noTicketsBody')}
        actions={<Button onClick={() => navigate('#/')}>{t('findBus')}</Button>}
      />
    );
  }

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
  const origin = cityById(booking.trip.originId);
  const destination = cityById(booking.trip.destinationId);
  const company = companyById(booking.trip.companyId);
  return (
    <button type="button" className="sp-ticket-row" onClick={onOpen}>
      <span className="sp-ticket-row-top">
        <strong>
          {origin?.[lang]} <span className="sp-forward">→</span> {destination?.[lang]}
        </strong>
        {past ? (
          <Badge size="sm" tone="neutral">
            {t('departed')}
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
        {lang === 'ar' ? company.ar : company.en} · {booking.id} · {formatMoney(booking.total, lang)}
      </span>
    </button>
  );
}
