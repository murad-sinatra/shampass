import { formatAmount, formatMoney } from '../format';
import { useI18n } from '../i18n';
import { SEAT_CLASSES, classRows, type Seat, type SeatClassId, type SeatColumn } from '../trips';

export function SeatMap({
  seats,
  taken,
  selected,
  onToggle,
}: {
  seats: readonly Seat[];
  taken: ReadonlySet<string>;
  selected: readonly string[];
  onToggle: (seat: Seat) => void;
}) {
  const { t, lang } = useI18n();
  const selectedSet = new Set(selected);

  function seatControl(row: number, column: SeatColumn) {
    const seat = seats.find((item) => item.row === row && item.column === column);
    if (!seat) return <span key={`${row}${column}`} className="sp-seat-gap" aria-hidden="true" />;
    const isTaken = seat.occupied || taken.has(seat.id);
    const isSelected = selectedSet.has(seat.id);
    const state = isTaken ? t('taken') : isSelected ? t('selected') : t('available');
    return (
      <button
        key={seat.id}
        type="button"
        className={isSelected ? 'sp-seat is-selected' : 'sp-seat'}
        data-class={seat.classId}
        disabled={isTaken}
        aria-pressed={isSelected}
        aria-label={t('seatLabel', {
          id: seat.id,
          klass: t(seat.classId),
          price: formatMoney(seat.price, lang),
          state,
        })}
        onClick={() => onToggle(seat)}
      >
        <b>{seat.id}</b>
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
      {SEAT_CLASSES.map((classId) => (
        <section key={classId} className="sp-class" aria-label={t(classId)}>
          <header className="sp-class-head">
            <h2>{t(classId)}</h2>
            <p>{priceLabel(seats, classId, lang)}</p>
          </header>
          {classRows(classId).map((row) => (
            <div key={row} className="sp-seat-row">
              {(['A', 'B'] as const).map((column) => seatControl(row, column))}
              <span className="sp-aisle" aria-hidden="true" />
              {(['C', 'D'] as const).map((column) => seatControl(row, column))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function priceLabel(seats: readonly Seat[], classId: SeatClassId, lang: ReturnType<typeof useI18n>['lang']): string {
  const prices = seats.filter((seat) => seat.classId === classId).map((seat) => seat.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const currency = lang === 'ar' ? 'ل.س' : 'SYP';
  if (min === max) return `${formatAmount(min, lang)} ${currency}`;
  return `${formatAmount(min, lang)}–${formatAmount(max, lang)} ${currency}`;
}
