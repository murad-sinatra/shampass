import { useState } from 'react';
import { Alert, Button, ConfirmDialog, EmptyState, useToast } from 'mors-component-library';
import { QrCode } from '../components/QrCode';
import { FlowSteps } from '../components/FlowSteps';
import { cityById, companyById } from '../data';
import { formatMoney, formatTicketWhen, formatTime } from '../format';
import { useI18n } from '../i18n';
import type { Navigate } from '../route';
import { removeBooking, type Booking, type TicketSeat } from '../storage';
import { useBookings } from '../useBookings';

export function TicketPage({ id, navigate }: { id: string; navigate: Navigate }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const bookings = useBookings();
  const booking = bookings.find((item) => item.id === id);
  const [confirming, setConfirming] = useState(false);

  if (!booking) {
    return (
      <EmptyState
        title={t('ticketMissing')}
        description={t('ticketMissingBody')}
        actions={<Button onClick={() => navigate('#/')}>{t('findBus')}</Button>}
      />
    );
  }

  const origin = cityById(booking.trip.originId);
  const destination = cityById(booking.trip.destinationId);
  const company = companyById(booking.trip.companyId);
  const method = t(booking.paymentMethod);

  async function share() {
    const text = t('shareText', {
      ref: booking!.id,
      from: origin?.[lang] ?? booking!.trip.originId,
      to: destination?.[lang] ?? booking!.trip.destinationId,
      when: formatTicketWhen(booking!.trip.departAt, lang),
      seats: booking!.seats.map((seat) => seat.id).join(', '),
    });
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ShamPass', text });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t('copied'), tone: 'success' });
    } catch {
      toast({ title: booking!.id, tone: 'info' });
    }
  }

  return (
    <div className="sp-stack">
      <FlowSteps current={2} />
      <header className="sp-ticket-intro">
        <p className="sp-kicker">{t('reference')}</p>
        <h1>{booking.id}</h1>
        <p className="sp-lead">{t('booked')}</p>
        <p>{t('showQr')}</p>
      </header>
      <Alert tone="success" title={t('paidWith', { method: `${method} ····${booking.paymentLast4}` })}>
        {t('demoTicket')}
      </Alert>
      {booking.seats.map((seat) => (
        <BoardingPass
          key={seat.id}
          booking={booking}
          seat={seat}
          companyName={lang === 'ar' ? company.ar : company.en}
          companyColor={company.color}
          origin={origin?.[lang] ?? booking.trip.originId}
          destination={destination?.[lang] ?? booking.trip.destinationId}
        />
      ))}
      <div className="sp-ticket-actions">
        <Button variant="secondary" block onClick={() => void share()}>
          {t('share')}
        </Button>
        <Button variant="ghost" block onClick={() => setConfirming(true)}>
          {t('remove')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        tone="danger"
        title={t('removeTitle')}
        description={t('removeBody')}
        confirmLabel={t('removeConfirm')}
        cancelLabel={t('cancel')}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          removeBooking(booking.id);
          setConfirming(false);
          navigate('#/tickets', 'replace');
        }}
      />
    </div>
  );
}

function BoardingPass({
  booking,
  seat,
  companyName,
  companyColor,
  origin,
  destination,
}: {
  booking: Booking;
  seat: TicketSeat;
  companyName: string;
  companyColor: string;
  origin: string;
  destination: string;
}) {
  const { t, lang } = useI18n();
  const payload = `SHAMPASS|${booking.id}|${seat.id}|${booking.trip.originId}|${booking.trip.destinationId}|${booking.trip.departAt}`;
  return (
    <article className="sp-pass" style={{ borderBlockStartColor: companyColor }}>
      <header className="sp-pass-top">
        <strong>{companyName}</strong>
        <span>{t('coach', { n: booking.trip.coach })}</span>
      </header>
      <div className="sp-pass-route">
        <div>
          <span className="sp-time">{formatTime(booking.trip.departAt, lang)}</span>
          <span className="sp-place">{origin}</span>
        </div>
        <span className="sp-forward" aria-hidden="true">
          →
        </span>
        <div className="sp-timeline-end">
          <span className="sp-time">{formatTime(booking.trip.arriveAt, lang)}</span>
          <span className="sp-place">{destination}</span>
        </div>
      </div>
      <p className="sp-pass-date">{formatTicketWhen(booking.trip.departAt, lang)}</p>
      <dl className="sp-pass-facts">
        <div>
          <dt>{t('passengerName')}</dt>
          <dd>{seat.passengerName}</dd>
        </div>
        <div>
          <dt>{t('seat')}</dt>
          <dd>{seat.id}</dd>
        </div>
        <div>
          <dt>{t('seatClass')}</dt>
          <dd>{t(seat.classId)}</dd>
        </div>
        <div>
          <dt>{t('total')}</dt>
          <dd>{formatMoney(seat.price, lang)}</dd>
        </div>
      </dl>
      <div className="sp-pass-qr">
        <QrCode value={payload} label={t('qrAlt', { ref: booking.id, seat: seat.id })} />
        <p>{booking.id}</p>
      </div>
    </article>
  );
}
