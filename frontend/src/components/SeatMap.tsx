import { formatAmount, formatMoney } from '../format';
import { useI18n } from '../i18n';
import { SEAT_CLASSES, type Seat, type SeatClassId, type SeatColumn } from '../types';

export function SeatMap({
  seats,
  selected,
  onToggle,
}: {
  seats: readonly Seat[];
  selected: readonly string[];
  onToggle: (seat: Seat) => void;
}) {
  const { t, lang } = useI18n();
  const selectedSet = new Set(selected);
  const classes = SEAT_CLASSES.filter((classId) => seats.some((seat) => seat.classId === classId));

  function seatControl(row: number, column: SeatColumn, classId: SeatClassId) {
    const seat = seats.find((item) => item.row === row && item.column === column && item.classId === classId);
    if (!seat) return <span key={`${row}${column}`} className="sp-seat-gap" aria-hidden="true" />;
    const isSelected = selectedSet.has(seat.id);
    const state = seat.occupied ? t('taken') : isSelected ? t('selected') : t('available');
    return (
      <button
        key={seat.id}
        type="button"
        className={isSelected ? 'sp-seat is-selected' : 'sp-seat'}
        data-class={seat.classId}
        disabled={seat.occupied}
        aria-pressed={isSelected}
        aria-label={t('seatLabel', {
          id: seat.label,
          klass: t(seat.classId),
          price: formatMoney(seat.price, lang),
          state,
        })}
        onClick={() => onToggle(seat)}
      >
        <b>{seat.label}</b>
        <small>{formatAmount(seat.price, lang)}</small>
      </button>
    );
  }

  return (
    <div className="sp-coach">
      <p className="sp-coach-front">{t('frontOfBus')}</p>
      <div className="sp-driver">
        <span>{t('driver')}</span>
      </div>
      <p className="sp-columns">{t('columnLabel', { letters: 'A B · C D' })}</p>
      {classes.map((classId) => (
        <section key={classId} className="sp-class" aria-label={t(classId)}>
          <header className="sp-class-head">
            <h2>{t(classId)}</h2>
            <p>{priceLabel(seats, classId, lang)}</p>
          </header>
          {rowsFor(seats, classId).map((row) => (
            <div key={row} className="sp-seat-row">
              {(['A', 'B'] as const).map((column) => seatControl(row, column, classId))}
              <span className="sp-aisle" aria-hidden="true" />
              {(['C', 'D'] as const).map((column) => seatControl(row, column, classId))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function rowsFor(seats: readonly Seat[], classId: SeatClassId): number[] {
  return [...new Set(seats.filter((seat) => seat.classId === classId).map((seat) => seat.row))].sort((a, b) => a - b);
}

function priceLabel(seats: readonly Seat[], classId: SeatClassId, lang: ReturnType<typeof useI18n>['lang']): string {
  const prices = seats.filter((seat) => seat.classId === classId).map((seat) => seat.price);
  if (prices.length === 0) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const currency = lang === 'ar' ? 'ل.س' : 'SYP';
  if (min === max) return `${formatAmount(min, lang)} ${currency}`;
  return `${formatAmount(min, lang)}–${formatAmount(max, lang)} ${currency}`;
}
