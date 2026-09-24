import { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Icon, IconButton, Select } from 'mors-component-library';
import { api } from '../api';
import { addDays, formatMoney, parseISODate, startOfToday, todayISO, toISODate } from '../format';
import { SwapGlyph } from '../icons';
import { useI18n } from '../i18n';
import { resultsPath, type Navigate, type SearchQuery } from '../route';
import { loadSearch, saveSearch } from '../storage';
import type { Catalog } from '../types';

const POPULAR: readonly (readonly [string, string])[] = [
  ['damascus', 'swida'],
  ['damascus', 'aleppo'],
  ['damascus', 'latakia'],
  ['damascus', 'tartus'],
  ['aleppo', 'damascus'],
  ['homs', 'tartus'],
];

function initialQuery(): SearchQuery {
  const saved = loadSearch();
  const today = todayISO();
  const fallback = addDays(today, 1);
  const date = saved && saved.date >= today && saved.date <= addDays(today, 13) ? saved.date : fallback;
  const from = saved?.from || 'damascus';
  const to = saved?.to || 'swida';
  const pax = saved && saved.pax >= 1 && saved.pax <= 5 ? saved.pax : 1;
  return { from, to, date, pax };
}

export function SearchPage({ navigate }: { navigate: Navigate }) {
  const { t, lang } = useI18n();
  const starting = useMemo(initialQuery, []);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [from, setFrom] = useState(starting.from);
  const [to, setTo] = useState(starting.to);
  const [date, setDate] = useState(starting.date);
  const [pax, setPax] = useState(starting.pax);
  const [sameCity, setSameCity] = useState(false);

  useEffect(() => {
    api.catalog().then(setCatalog).catch(() => setCatalog({ cities: [], fares: [] }));
  }, []);

  const options = useMemo(
    () =>
      (catalog?.cities ?? []).map((city) => ({
        value: city.id,
        label: lang === 'ar' ? `${city.ar} · ${city.en}` : `${city.en} · ${city.ar}`,
      })),
    [catalog, lang],
  );

  const bounds = useMemo(() => {
    const min = startOfToday();
    const max = parseISODate(addDays(todayISO(), 13));
    max.setHours(0, 0, 0, 0);
    return { min, max };
  }, []);

  const dateValue = useMemo(() => parseISODate(date), [date]);

  function search(query: SearchQuery) {
    if (query.from === query.to) {
      setSameCity(true);
      return;
    }
    saveSearch(query);
    navigate(resultsPath(query));
  }

  const cities = catalog?.cities ?? [];

  return (
    <div className="sp-stack sp-home">
      <header className="sp-hero">
        <p className="sp-kicker">{t('homeKicker')}</p>
        <h1>{t('homeTitle')}</h1>
        <p className="sp-lead">{t('homeLead')}</p>
      </header>

      <div className="sp-home-primary">
      <Card padding="sm" elevation="raised">
        <form
          className="sp-form sp-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            search({ from, to, date, pax });
          }}
        >
          <div className="sp-route-fields">
          <Select
            label={t('from')}
            options={options}
            value={from}
            onChange={(value) => {
              setFrom(value);
              setSameCity(false);
            }}
          />
          <div className="sp-swap-row">
            <IconButton
              label={t('swap')}
              variant="secondary"
              icon={<SwapGlyph />}
              onClick={() => {
                setFrom(to);
                setTo(from);
                setSameCity(false);
              }}
            />
          </div>
          <Select
            label={t('to')}
            options={options}
            value={to}
            error={sameCity ? t('sameCity') : undefined}
            onChange={(value) => {
              setTo(value);
              setSameCity(false);
            }}
          />
          </div>
          <DatePicker
            label={t('date')}
            value={dateValue}
            min={bounds.min}
            max={bounds.max}
            locale={lang === 'ar' ? 'ar-SY' : 'en-GB'}
            onChange={(next) => {
              if (next) setDate(toISODate(next));
            }}
          />
          <div className="sp-pax">
            <div>
              <span className="sp-pax-label" id="sp-pax-label">
                {t('passengers')}
              </span>
              <span className="sp-pax-hint">{t('passengerHint')}</span>
            </div>
            <div className="sp-stepper" role="group" aria-labelledby="sp-pax-label">
              <IconButton
                label={t('fewerPassengers')}
                icon={<Icon name="minus" />}
                variant="secondary"
                disabled={pax <= 1}
                onClick={() => setPax((count) => Math.max(1, count - 1))}
              />
              <span className="sp-stepper-value" aria-live="polite">
                {pax}
              </span>
              <IconButton
                label={t('morePassengers')}
                icon={<Icon name="plus" />}
                variant="secondary"
                disabled={pax >= 5}
                onClick={() => setPax((count) => Math.min(5, count + 1))}
              />
            </div>
          </div>
          <Button type="submit" size="lg" block disabled={!catalog}>
            {t('searchBuses')}
          </Button>
          <p className="sp-fine">{t('sampleFares')}</p>
        </form>
      </Card>
      </div>

      <div className="sp-home-secondary">
      <section className="sp-section" aria-labelledby="sp-popular-title">
        <h2 id="sp-popular-title">{t('popular')}</h2>
        <div className="sp-popular">
          {POPULAR.map(([originId, destinationId]) => {
            const origin = cities.find((city) => city.id === originId);
            const destination = cities.find((city) => city.id === destinationId);
            const fare = catalog?.fares.find((item) => item.from === originId && item.to === destinationId)?.price;
            if (!origin || !destination || fare == null) return null;
            return (
              <button
                key={`${originId}-${destinationId}`}
                type="button"
                className="sp-popular-card"
                onClick={() => search({ from: originId, to: destinationId, date, pax })}
              >
                <span className="sp-popular-route">
                  <strong>{origin[lang]}</strong>
                  <span className="sp-forward" aria-hidden="true">
                    →
                  </span>
                  <strong>{destination[lang]}</strong>
                </span>
                <span className="sp-popular-alt">
                  {lang === 'ar' ? `${origin.en} · ${destination.en}` : `${origin.ar} · ${destination.ar}`}
                </span>
                <span className="sp-popular-price">{t('fromPrice', { price: formatMoney(fare, lang) })}</span>
              </button>
            );
          })}
        </div>
      </section>
      </div>
    </div>
  );
}
