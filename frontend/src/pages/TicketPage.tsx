import { useEffect, useState } from 'react';
import { Alert, Button, ConfirmDialog, EmptyState, useToast } from 'mors-component-library';
import { api, explain } from '../api';
import { useAuth } from '../auth';
import { FlowSteps } from '../components/FlowSteps';
import { QrCode } from '../components/QrCode';
import { formatMoney, formatTicketWhen, formatTime } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import type { Navigate } from '../route';
import type { Booking, TicketSeat, TripStatus } from '../types';

const FLOW: TripStatus[] = ['scheduled', 'boarding', 'departed', 'arrived'];
const STATUS_KEY: Record<TripStatus, MessageKey> = {
  scheduled: 'statusScheduled',
  boarding: 'statusBoarding',
  departed: 'statusDeparted',
  arrived: 'statusArrived',
  cancelled: 'statusCancelled',
};

export function TicketPage({ id, navigate }: { id: string; navigate: Navigate }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { refreshUnread } = useAuth();
  const [booking, setBooking] = useState<Booking | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = () => {
      api
        .booking(id)
        .then((next) => {
          if (active) setBooking(next);
        })
        .catch(() => {
          if (active) setBooking(null);
        });
    };
    load();
    const timer = window.setInterval(load, 12000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [id]);

  if (booking === undefined) return <p className="sp-loading">{t('loading')}</p>;
  if (!booking) {
    return (
      <EmptyState
        title={t('ticketMissing')}
        description={t('ticketMissingBody')}
        actions={<Button onClick={() => navigate('#/')}>{t('findBus')}</Button>}
      />
    );
  }

  const method = t(booking.paymentMethod);
  const cancelled = booking.status === 'cancelled' || booking.trip.status === 'cancelled';

  async function share() {
    const text = t('shareText', {
      ref: booking!.id,
      from: booking!.trip.origin[lang],
      to: booking!.trip.destination[lang],
      when: formatTicketWhen(booking!.trip.departAt, lang),
      seats: booking!.seats.map((seat) => seat.id).join(', '),
    });
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ShamPass', text });
        return;
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
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
        <p className="sp-lead">{cancelled ? t('bookingCancelled') : t('booked')}</p>
        {!cancelled && <p>{t('showQr')}</p>}
      </header>
      <Alert tone={cancelled ? 'warning' : 'success'} title={t('paidWith', { method: `${method} ····${booking.paymentLast4}` })}>
        {t('demoTicket')}
      </Alert>
      <section className="sp-section" aria-label={t('followTitle')}>
        <h2>{t('followTitle')}</h2>
        <ol className="sp-follow">
          {FLOW.map((status) => {
            const index = FLOW.indexOf(status);
            const current = FLOW.indexOf(booking.trip.status);
            const className = booking.trip.status === 'cancelled' ? undefined : index < current ? 'is-done' : index === current ? 'is-current' : undefined;
            return (
              <li key={status} className={className}>
                <span>{index + 1}</span>
                {t(STATUS_KEY[status])}
              </li>
            );
          })}
        </ol>
        {booking.trip.status === 'cancelled' && <Alert tone="danger" title={t('statusCancelled')} />}
      </section>
      {booking.seats.map((seat) => (
        <BoardingPass key={seat.id} booking={booking} seat={seat} />
      ))}
      {error && <Alert tone="danger" title={error} />}
      <div className="sp-ticket-actions">
        <Button variant="secondary" block onClick={() => void share()}>
          {t('share')}
        </Button>
        {booking.status === 'confirmed' && booking.trip.status === 'scheduled' && (
          <Button variant="ghost" block onClick={() => setConfirming(true)}>
            {t('cancelBooking')}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        tone="danger"
        title={t('cancelBookingTitle')}
        description={t('cancelBookingBody')}
        confirmLabel={t('cancelConfirm')}
        cancelLabel={t('keepBooking')}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          void api
            .cancelBooking(booking.id)
            .then((next) => {
              setBooking(next);
              setConfirming(false);
              void refreshUnread();
            })
            .catch((cancelError: unknown) => {
              setError(explain(cancelError, t));
              setConfirming(false);
            });
        }}
      />
    </div>
  );
}

function BoardingPass({ booking, seat }: { booking: Booking; seat: TicketSeat }) {
  const { t, lang } = useI18n();
  const payload = `SHAMPASS|${booking.id}|${seat.id}|${booking.trip.origin.id}|${booking.trip.destination.id}|${booking.trip.departAt}`;
  return (
    <article className="sp-pass" style={{ borderBlockStartColor: booking.trip.company.color }}>
      <header className="sp-pass-top">
        <strong>{lang === 'ar' ? booking.trip.company.ar : booking.trip.company.en}</strong>
        <span>{t('coach', { n: booking.trip.coach })}</span>
      </header>
      <div className="sp-pass-route">
        <div>
          <span className="sp-time">{formatTime(booking.trip.departAt, lang)}</span>
          <span className="sp-place">{booking.trip.origin[lang]}</span>
        </div>
        <span className="sp-forward" aria-hidden="true">
          →
        </span>
        <div className="sp-timeline-end">
          <span className="sp-time">{formatTime(booking.trip.arriveAt, lang)}</span>
          <span className="sp-place">{booking.trip.destination[lang]}</span>
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
