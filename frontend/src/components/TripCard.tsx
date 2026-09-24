import { Badge, Icon } from 'mors-component-library';
import { formatDuration, formatMoney, formatTime } from '../format';
import { useI18n } from '../i18n';
import type { TripSummary } from '../types';

export function TripCard({ trip, onSelect }: { trip: TripSummary; onSelect: () => void }) {
  const { t, lang } = useI18n();
  const soldOut = trip.freeSeats === 0 || trip.lowestPrice == null;
  const price = trip.lowestPrice ?? 0;

  return (
    <button
      type="button"
      className="sp-trip"
      style={{ borderInlineStartColor: trip.company.color }}
      onClick={onSelect}
      disabled={soldOut}
    >
      <span className="sp-trip-top">
        <span>
          <strong className="sp-company">{lang === 'ar' ? trip.company.ar : trip.company.en}</strong>
          <span className="sp-coach-name">{t('coach', { n: trip.coach })}</span>
        </span>
        <span className="sp-trip-price">
          <small>{t('from')}</small>
          <strong>{formatMoney(price, lang)}</strong>
        </span>
      </span>
      <span className="sp-timeline">
        <span>
          <span className="sp-time">{formatTime(trip.departAt, lang)}</span>
          <span className="sp-place">{trip.origin[lang]}</span>
        </span>
        <span className="sp-timeline-mid">
          <Icon name="arrow-right" />
          <span>
            {formatDuration(trip.durationMin, lang)} · {t('direct')}
          </span>
        </span>
        <span className="sp-timeline-end">
          <span className="sp-time">{formatTime(trip.arriveAt, lang)}</span>
          <span className="sp-place">{trip.destination[lang]}</span>
        </span>
      </span>
      <span className="sp-trip-meta">
        <span className="sp-amenities">
          {trip.amenities.map((amenity) => (
            <Badge key={amenity} size="sm" tone="neutral">
              {t(amenity)}
            </Badge>
          ))}
        </span>
        <Badge size="sm" tone={soldOut ? 'danger' : trip.freeSeats <= 8 ? 'warning' : 'success'}>
          {soldOut ? t('soldOut') : trip.freeSeats === 1 ? t('seatsLeftOne') : t('seatsLeft', { n: trip.freeSeats })}
        </Badge>
      </span>
    </button>
  );
}
