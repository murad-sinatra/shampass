import { Button } from 'mors-component-library';
import { BusMark } from '../icons';
import { useI18n } from '../i18n';
import type { Navigate } from '../route';

const STATIONS = [
  { en: 'Damascus', ar: 'دمشق' },
  { en: 'Homs', ar: 'حمص' },
  { en: 'Hama', ar: 'حماة' },
  { en: 'Tartus', ar: 'طرطوس' },
  { en: 'Latakia', ar: 'اللاذقية' },
  { en: 'Aleppo', ar: 'حلب' },
  { en: 'Swida', ar: 'السويداء' },
] as const;

export function LandingPage({ navigate }: { navigate: Navigate }) {
  const { t, lang } = useI18n();

  return (
    <div className="sp-land">
      <header className="sp-land-hero">
        <div>
          <p className="sp-kicker">{t('landKicker')}</p>
          <h1>{t('landTitle')}</h1>
          <p className="sp-lead">{t('landLead')}</p>
          <Button size="lg" onClick={() => navigate('#/search')}>
            {t('landCta')}
          </Button>
        </div>
        <div className="sp-land-plate" aria-hidden="true">
          <span className="sp-land-mark">
            <BusMark size={72} />
          </span>
          <strong>ShamPass</strong>
          <span>{t('landPlate')}</span>
        </div>
      </header>

      <section className="sp-section" aria-labelledby="sp-network-title">
        <h2 id="sp-network-title">{t('landNetwork')}</h2>
        <ol className="sp-rail">
          {STATIONS.map((station) => (
            <li key={station.en}>
              <span className="sp-rail-stop" />
              <strong>{lang === 'ar' ? station.ar : station.en}</strong>
              <small>{lang === 'ar' ? station.en : station.ar}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="sp-land-points" aria-label={t('landHow')}>
        <article>
          <span>01</span>
          <h2>{t('land1')}</h2>
          <p>{t('land1b')}</p>
        </article>
        <article>
          <span>02</span>
          <h2>{t('land2')}</h2>
          <p>{t('land2b')}</p>
        </article>
        <article>
          <span>03</span>
          <h2>{t('land3')}</h2>
          <p>{t('land3b')}</p>
        </article>
      </section>
    </div>
  );
}
