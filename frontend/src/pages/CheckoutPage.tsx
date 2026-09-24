import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, EmptyState, TextField } from 'mors-component-library';
import { api, explain } from '../api';
import { useAuth } from '../auth';
import { FlowSteps } from '../components/FlowSteps';
import { formatDuration, formatLongDate, formatMoney, formatTime } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import {
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  normalizeSyrianMobile,
  validPersonName,
  validatePayment,
  type PayIssue,
  type PayMethod,
} from '../payment';
import { loginPath, resultsPath, seatsPath, ticketPath, type Navigate, type SearchQuery } from '../route';
import { loadCheckoutDraft, saveCheckoutDraft } from '../storage';
import type { AmenityId, Seat, Trip } from '../types';

export function CheckoutPage({
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
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const draft = useMemo(() => loadCheckoutDraft(tripId), [tripId]);
  const [names, setNames] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const id of seatIds) initial[id] = draft?.names[id] ?? '';
    return initial;
  });
  const [phone, setPhone] = useState(draft?.phone ?? user?.phone ?? '');
  const [method, setMethod] = useState<PayMethod>(draft?.method ?? 'shamcash');
  const [otp, setOtp] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [nameErrors, setNameErrors] = useState<string[]>([]);
  const [issue, setIssue] = useState<PayIssue | null>(null);
  const [formError, setFormError] = useState('');
  const [paying, setPaying] = useState(false);

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

  useEffect(() => {
    saveCheckoutDraft({ tripId, names, phone, method });
  }, [tripId, names, phone, method]);

  const seats = useMemo(() => {
    if (!trip) return [];
    return seatIds
      .map((id) => trip.seats.find((seat) => seat.id === id))
      .filter((seat): seat is Seat => Boolean(seat && !seat.occupied));
  }, [trip, seatIds]);

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
  if (!user) {
    const next = payPath(query, tripId, seatIds).slice(1);
    return (
      <EmptyState
        title={t('loginContinue')}
        description={t('loginToContinue')}
        actions={<Button onClick={() => navigate(loginPath(next))}>{t('login')}</Button>}
      />
    );
  }
  if (seats.length === 0) {
    return (
      <EmptyState
        title={t('takenSeat')}
        description={t('changeSeats')}
        actions={<Button onClick={() => navigate(seatsPath(query, trip.id, []))}>{t('chooseSeats')}</Button>}
      />
    );
  }

  const total = seats.reduce((sum, seat) => sum + seat.price, 0);
  const missing = seatIds.length !== seats.length;

  function issueText(next: PayIssue | null, field: PayIssue['field']): string | undefined {
    if (!next || next.field !== field) return undefined;
    if (next.key === 'brandMismatch') return t(next.key, { brand: t(method) });
    return t(next.key);
  }

  async function pay() {
    if (paying) return;
    const badNames = seats.filter((seat) => !validPersonName(names[seat.id] ?? '')).map((seat) => seat.id);
    setNameErrors(badNames);
    const result = validatePayment({ method, walletPhone: phone, otp, cardName, cardNumber, expiry, cvc });
    if ('field' in result || badNames.length > 0) {
      setIssue('field' in result ? result : null);
      return;
    }
    if (method !== 'shamcash' && !normalizeSyrianMobile(phone)) {
      setIssue({ field: 'phone', key: 'phoneError' });
      return;
    }
    setIssue(null);
    setFormError('');
    setPaying(true);
    try {
      const booking = await api.createBooking({
        tripId: trip!.id,
        phone,
        payMethod: method,
        otp,
        cardName,
        cardNumber,
        expiry,
        cvc,
        seats: seats.map((seat) => ({
          seatId: seat.id,
          passengerName: (names[seat.id] ?? '').trim().replace(/\s+/g, ' '),
        })),
      });
      navigate(ticketPath(booking.id), 'replace');
    } catch (error) {
      setFormError(explain(error, t));
      if (error instanceof Error && 'code' in error && error.code === 'SEAT_TAKEN') {
        navigate(seatsPath(query, trip!.id, []), 'replace');
      }
    } finally {
      setPaying(false);
    }
  }

  return (
    <form
      className="sp-stack"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        void pay();
      }}
    >
      <div className="sp-checkout">
      <div className="sp-checkout-intro">
      <FlowSteps current={1} />
      {missing && (
        <Alert tone="warning" title={t('takenSeat')}>
          {t('changeSeats')}
        </Alert>
      )}
      </div>
      <aside className="sp-checkout-aside">
      <section className="sp-section sp-panel sp-summary">
        <div className="sp-section-head">
          <h2>{t('tripSummary')}</h2>
          <Button variant="link" onClick={() => navigate(seatsPath(query, trip.id, seats.map((seat) => seat.id)))}>
            {t('changeSeats')}
          </Button>
        </div>
        <p className="sp-summary-company">
          <span className="sp-summary-mark" style={{ background: trip.company.color }} aria-hidden="true" />
          <span>
            <strong>{lang === 'ar' ? trip.company.ar : trip.company.en}</strong>
            <span>{t('coach', { n: trip.coach })}</span>
          </span>
        </p>
        <p className="sp-summary-date">{formatLongDate(query.date, lang)}</p>
        <div className="sp-route-graph">
          <div className="sp-route-stop">
            <span className="sp-route-dot" aria-hidden="true" />
            <span>
              <small>{t('departs')}</small>
              <strong className="sp-time">{formatTime(trip.departAt, lang)}</strong>
              <span className="sp-place">{trip.origin[lang]}</span>
            </span>
          </div>
          <div className="sp-route-leg">
            <span className="sp-route-stem" aria-hidden="true" />
            <span className="sp-route-chip">
              <span className="sp-route-bar" aria-hidden="true">
                <span />
              </span>
              {formatDuration(trip.durationMin, lang)} · {t('direct')}
            </span>
          </div>
          <div className="sp-route-stop">
            <span className="sp-route-dot is-end" aria-hidden="true" />
            <span>
              <small>{t('arrives')}</small>
              <strong className="sp-time">{formatTime(trip.arriveAt, lang)}</strong>
              <span className="sp-place">{trip.destination[lang]}</span>
            </span>
          </div>
        </div>
        {trip.amenities.length > 0 && (
          <ul className="sp-amenity-row">
            {trip.amenities.map((amenity) => (
              <li key={amenity}>
                <AmenityIcon id={amenity} />
                {t(amenity)}
              </li>
            ))}
          </ul>
        )}
        <h3>{t('yourSeats')}</h3>
        <ul className="sp-fare-list">
          {seats.map((seat) => (
            <li key={seat.id}>
              <span>
                <SeatIcon />
                {seat.label} · {t(seat.classId)}
              </span>
              <strong>{formatMoney(seat.price, lang)}</strong>
            </li>
          ))}
          <li className="is-total">
            <span>{t('total')}</span>
            <strong>{formatMoney(total, lang)}</strong>
          </li>
        </ul>
      </section>
      </aside>
      <div className="sp-checkout-main">
      <section className="sp-section sp-panel sp-fields">
        <h2>{t('passengers')}</h2>
        {seats.map((seat) => (
          <TextField
            key={seat.id}
            label={t('passengerFor', { seat: seat.label })}
            name={`passenger-${seat.id}`}
            autoComplete="name"
            value={names[seat.id] ?? ''}
            error={nameErrors.includes(seat.id) ? t('nameError') : undefined}
            onChange={(event) => {
              const value = event.target.value;
              setNames((current) => ({ ...current, [seat.id]: value }));
              setNameErrors((current) => current.filter((id) => id !== seat.id));
            }}
          />
        ))}
        <TextField
          label={t('phone')}
          description={t('phoneHint')}
          name="phone"
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel"
          value={phone}
          error={issueText(issue, 'phone')}
          onChange={(event) => {
            setPhone(event.target.value);
            if (issue?.field === 'phone') setIssue(null);
          }}
        />
      </section>
      <section className="sp-section sp-panel">
        <h2>{t('payWith')}</h2>
        <div className="sp-pay-list" role="radiogroup" aria-label={t('payWith')}>
          {(['shamcash', 'visa', 'mastercard'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={method === option}
              className={method === option ? 'sp-pay-card is-selected' : 'sp-pay-card'}
              onClick={() => {
                setMethod(option);
                setIssue(null);
              }}
            >
              <PayMark method={option} />
              <span>
                <strong>{t(option)}</strong>
                <small>{t(`${option}Hint` as MessageKey)}</small>
              </span>
              <span className="sp-radio" aria-hidden="true" />
            </button>
          ))}
        </div>
        {method === 'shamcash' ? (
          <TextField
            label={t('otp')}
            description={t('otpHint')}
            name="otp"
            inputMode="numeric"
            dir="ltr"
            autoComplete="one-time-code"
            value={otp}
            error={issueText(issue, 'otp')}
            onChange={(event) => {
              setOtp(digitsOnly(event.target.value, 6));
              if (issue?.field === 'otp') setIssue(null);
            }}
          />
        ) : (
          <div className="sp-card-fields">
            <TextField
              label={t('cardName')}
              name="cc-name"
              autoComplete="off"
              value={cardName}
              error={issueText(issue, 'cardName')}
              onChange={(event) => {
                setCardName(event.target.value);
                if (issue?.field === 'cardName') setIssue(null);
              }}
            />
            <TextField
              label={t('cardNumber')}
              name="cc-number"
              inputMode="numeric"
              dir="ltr"
              autoComplete="off"
              value={cardNumber}
              error={issueText(issue, 'cardNumber')}
              onChange={(event) => {
                setCardNumber(formatCardNumber(event.target.value));
                if (issue?.field === 'cardNumber') setIssue(null);
              }}
            />
            <div className="sp-split">
              <TextField
                label={t('expiry')}
                name="cc-exp"
                inputMode="numeric"
                dir="ltr"
                autoComplete="off"
                placeholder="MM/YY"
                value={expiry}
                error={issueText(issue, 'expiry')}
                onChange={(event) => {
                  setExpiry(formatExpiry(event.target.value));
                  if (issue?.field === 'expiry') setIssue(null);
                }}
              />
              <TextField
                label={t('cvc')}
                name="cc-csc"
                inputMode="numeric"
                dir="ltr"
                autoComplete="off"
                value={cvc}
                error={issueText(issue, 'cvc')}
                onChange={(event) => {
                  setCvc(digitsOnly(event.target.value, 3));
                  if (issue?.field === 'cvc') setIssue(null);
                }}
              />
            </div>
          </div>
        )}
        <Alert tone="info" title={t('demoPay')}>
          {t('demoCards')}
        </Alert>
        {formError && <Alert tone="danger" title={formError} />}
      </section>
      </div>
      </div>
      <div className="sp-dock">
        <div className="sp-dock-inner">
          <div className="sp-dock-copy">
            <strong>{t('total')}</strong>
            <span>{formatMoney(total, lang)}</span>
          </div>
          <Button type="submit" size="lg" loading={paying}>
            {t('pay', { price: formatMoney(total, lang) })}
          </Button>
        </div>
      </div>
    </form>
  );
}

function AmenityIcon({ id }: { id: AmenityId }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true as const, focusable: 'false' as const, className: 'sp-mini-icon' };
  if (id === 'ac') {
    return (
      <svg {...common}>
        <path d="M12 3v10M8 7l4 4 4-4M6 17h12M8 20h8" />
      </svg>
    );
  }
  if (id === 'usb') {
    return (
      <svg {...common}>
        <path d="M12 3v8M9 6h6M10 14v7M14 14v7M10 18h4" />
      </svg>
    );
  }
  if (id === 'wifi') {
    return (
      <svg {...common}>
        <path d="M5 10a10 10 0 0 1 14 0M8 13a6 6 0 0 1 8 0M12 17h.01" />
      </svg>
    );
  }
  if (id === 'water') {
    return (
      <svg {...common}>
        <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 16V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M4 16h16M7 19h.01M17 19h.01" />
    </svg>
  );
}

function SeatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="sp-mini-icon">
      <path d="M7 4h6a2 2 0 0 1 2 2v9H7zM5 15h14v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM9 20v1M15 20v1" />
    </svg>
  );
}

function PayMark({ method }: { method: PayMethod }) {
  if (method === 'shamcash') return <span className="sp-mark sp-mark--sham">ش</span>;
  if (method === 'visa') return <span className="sp-mark sp-mark--visa">VISA</span>;
  return <span className="sp-mark sp-mark--mc">MC</span>;
}

function payPath(query: SearchQuery, tripId: string, seatIds: string[]): string {
  return `#/pay?from=${query.from}&to=${query.to}&date=${query.date}&pax=${query.pax}&trip=${tripId}&seats=${seatIds.join(',')}`;
}
