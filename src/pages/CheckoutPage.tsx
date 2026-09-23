import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, EmptyState, TextField } from 'mors-component-library';
import { FlowSteps } from '../components/FlowSteps';
import { cityById, companyById } from '../data';
import { formatMoney, formatTime } from '../format';
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
import { resultsPath, seatsPath, ticketPath, type Navigate, type SearchQuery } from '../route';
import {
  bookedSeatIds,
  loadCheckoutDraft,
  newReference,
  saveBooking,
  saveCheckoutDraft,
  type Booking,
} from '../storage';
import { findTrip, type Seat } from '../trips';
import { useBookings } from '../useBookings';

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
  const bookings = useBookings();
  const trip = useMemo(() => findTrip(tripId), [tripId]);
  const draft = useMemo(() => loadCheckoutDraft(tripId), [tripId]);
  const taken = useMemo(() => (trip ? bookedSeatIds(trip.id, bookings) : new Set<string>()), [trip, bookings]);

  const seats = useMemo(() => {
    if (!trip) return [];
    return seatIds
      .map((id) => trip.seats.find((seat) => seat.id === id))
      .filter((seat): seat is Seat => Boolean(seat && !seat.occupied && !taken.has(seat.id)));
  }, [trip, seatIds, taken]);

  const [names, setNames] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const id of seatIds) initial[id] = draft?.names[id] ?? '';
    return initial;
  });
  const [phone, setPhone] = useState(draft?.phone ?? '');
  const [method, setMethod] = useState<PayMethod>(draft?.method ?? 'shamcash');
  const [otp, setOtp] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [nameErrors, setNameErrors] = useState<string[]>([]);
  const [issue, setIssue] = useState<PayIssue | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    saveCheckoutDraft({ tripId, names, phone, method });
  }, [tripId, names, phone, method]);

  if (!trip) {
    return (
      <EmptyState
        title={t('tripMissing')}
        description={t('tripMissingBody')}
        actions={<Button onClick={() => navigate(resultsPath(query))}>{t('changeSearch')}</Button>}
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

  const origin = cityById(trip.originId);
  const destination = cityById(trip.destinationId);
  const company = companyById(trip.companyId);
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
    const result = validatePayment({
      method,
      walletPhone: phone,
      otp,
      cardName,
      cardNumber,
      expiry,
      cvc,
    });
    if ('field' in result || badNames.length > 0) {
      setIssue('field' in result ? result : null);
      return;
    }
    if (method !== 'shamcash' && !normalizeSyrianMobile(phone)) {
      setIssue({ field: 'phone', key: 'phoneError' });
      return;
    }

    setIssue(null);
    setPaying(true);
    await new Promise((resolve) => setTimeout(resolve, 700));

    const stillFree = seats.every((seat) => !bookedSeatIds(trip!.id).has(seat.id) && !seat.occupied);
    if (!stillFree) {
      setPaying(false);
      setIssue(null);
      navigate(seatsPath(query, trip!.id, []), 'replace');
      return;
    }

    const normalized = normalizeSyrianMobile(phone) ?? phone;
    const booking: Booking = {
      id: newReference(),
      createdAt: new Date().toISOString(),
      trip: {
        id: trip!.id,
        companyId: trip!.companyId,
        originId: trip!.originId,
        destinationId: trip!.destinationId,
        departAt: trip!.departAt,
        arriveAt: trip!.arriveAt,
        durationMin: trip!.durationMin,
        coach: trip!.coach,
      },
      seats: seats.map((seat) => ({
        id: seat.id,
        classId: seat.classId,
        price: seat.price,
        passengerName: (names[seat.id] ?? '').trim().replace(/\s+/g, ' '),
      })),
      phone: normalized,
      paymentMethod: method,
      paymentLast4: result.last4,
      total,
    };
    saveBooking(booking);
    setPaying(false);
    navigate(ticketPath(booking.id), 'replace');
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
      <FlowSteps current={1} />
      <div className="sp-ride">
        <strong>
          {lang === 'ar' ? company.ar : company.en}
          {' · '}
          {t('coach', { n: trip.coach })}
        </strong>
        <span>
          {formatTime(trip.departAt, lang)} {origin?.[lang]}
        <span className="sp-forward" aria-hidden="true">→</span>
        {formatTime(trip.arriveAt, lang)} {destination?.[lang]}
        </span>
      </div>

      {missing && (
        <Alert tone="warning" title={t('takenSeat')}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(seatsPath(query, trip.id, seats.map((seat) => seat.id)))}
          >
            {t('changeSeats')}
          </Button>
        </Alert>
      )}

      <section className="sp-section">
        <div className="sp-section-head">
          <h2>{t('yourSeats')}</h2>
          <Button variant="link" onClick={() => navigate(seatsPath(query, trip.id, seats.map((seat) => seat.id)))}>
            {t('changeSeats')}
          </Button>
        </div>
        <ul className="sp-fare-list">
          {seats.map((seat) => (
            <li key={seat.id}>
              <span>
                {seat.id} · {t(seat.classId)}
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

      <section className="sp-section">
        {seats.map((seat) => (
          <TextField
            key={seat.id}
            label={t('passengerFor', { seat: seat.id })}
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

      <section className="sp-section">
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
      </section>

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

function PayMark({ method }: { method: PayMethod }) {
  if (method === 'shamcash') return <span className="sp-mark sp-mark--sham">ش</span>;
  if (method === 'visa') return <span className="sp-mark sp-mark--visa">VISA</span>;
  return <span className="sp-mark sp-mark--mc">MC</span>;
}
