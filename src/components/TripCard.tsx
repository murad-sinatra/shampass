import { Badge, Icon } from 'mors-component-library';
import { cityById, companyById } from '../data';
import { formatDuration, formatMoney, formatTime } from '../format';
import { useI18n } from '../i18n';
import type { Trip } from '../trips';

export function TripCard({
  trip,
  taken,
  onSelect,
}: {
  trip: Trip;
  taken: ReadonlySet<string>;
  onSelect: () => void;
}) {
  const { t, lang } = useI18n();
  const company = companyById(trip.companyId);
  const origin = cityById(trip.originId);
  const destination = cityById(trip.destinationId);
  const free = trip.seats.filter((seat) => !seat.occupied && !taken.has(seat.id));
  const soldOut = free.length === 0;
  const price = Math.min(...(free.length > 0 ? free : trip.seats).map((seat) => seat.price));

  return (
    <button
      type="button"
      className="sp-trip"
      style={{ borderInlineStartColor: company.color }}
      onClick={onSelect}
      disabled={soldOut}
    >
      <span className="sp-trip-top">
        <span>
          <strong className="sp-company">{lang === 'ar' ? company.ar : company.en}</strong>
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
          <span className="sp-place">{origin ? origin[lang] : trip.originId}</span>
        </span>
        <span className="sp-timeline-mid">
          <Icon name="arrow-right" />
          <span>
            {formatDuration(trip.durationMin, lang)} · {t('direct')}
          </span>
        </span>
        <span className="sp-timeline-end">
          <span className="sp-time">{formatTime(trip.arriveAt, lang)}</span>
          <span className="sp-place">{destination ? destination[lang] : trip.destinationId}</span>
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
        <Badge size="sm" tone={soldOut ? 'danger' : free.length <= 8 ? 'warning' : 'success'}>
          {soldOut ? t('soldOut') : free.length === 1 ? t('seatsLeftOne') : t('seatsLeft', { n: free.length })}
        </Badge>
      </span>
    </button>
  );
}
