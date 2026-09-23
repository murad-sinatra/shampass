import { useCallback, useEffect, useState } from 'react';
import {
  AppShell,
  Button,
  Icon,
  IconButton,
  SkipLink,
  TabBar,
  TabBarItem,
} from 'mors-component-library';
import { BusMark, TicketGlyph } from './icons';
import { useDocumentLang, useI18n } from './i18n';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { ResultsPage } from './pages/ResultsPage';
import { SeatsPage } from './pages/SeatsPage';
import { TicketPage } from './pages/TicketPage';
import { TicketsPage } from './pages/TicketsPage';
import { cityById } from './data';
import {
  go,
  parseHash,
  resultsPath,
  routeKey,
  seatsPath,
  type AppRoute,
  type Navigate,
} from './route';
import { useBookings } from './useBookings';

function useHashRoute(): [AppRoute, Navigate] {
  const [route, setRoute] = useState<AppRoute>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = useCallback<Navigate>((hash, mode) => go(hash, mode), []);
  return [route, navigate];
}

function pageTitle(route: AppRoute, t: ReturnType<typeof useI18n>['t'], lang: ReturnType<typeof useI18n>['lang']): string {
  if (route.name === 'home') return 'ShamPass';
  if (route.name === 'tickets') return t('myTickets');
  if (route.name === 'ticket') return t('ticketTitle');
  if (route.name === 'seats') return t('chooseSeats');
  if (route.name === 'pay') return t('payWith');
  const from = cityById(route.query.from);
  const to = cityById(route.query.to);
  return t('resultsTitle', { from: from?.[lang] ?? '', to: to?.[lang] ?? '' });
}

function backHash(route: AppRoute): string | null {
  switch (route.name) {
    case 'results':
      return '#/';
    case 'seats':
      return resultsPath(route.query);
    case 'pay':
      return seatsPath(route.query, route.tripId, route.seatIds);
    case 'ticket':
      return '#/tickets';
    default:
      return null;
  }
}

export function App() {
  const { t, lang, dir, setLang } = useI18n();
  useDocumentLang();
  const [route, navigate] = useHashRoute();
  const bookings = useBookings();
  const key = routeKey(route);
  const back = backHash(route);
  const showTabs = route.name === 'home' || route.name === 'results' || route.name === 'tickets' || route.name === 'ticket';
  const tab = route.name === 'tickets' || route.name === 'ticket' ? 'tickets' : 'search';
  const title = pageTitle(route, t, lang);

  useEffect(() => {
    document.title = title === 'ShamPass' ? 'ShamPass' : `${title} · ShamPass`;
  }, [title]);

  useEffect(() => {
    document.querySelector('.sp-shell .mors-app-shell-main')?.scrollTo(0, 0);
  }, [key]);

  return (
    <AppShell
      className="sp-shell mors-scope"
      header={
        <header className="sp-header">
          <SkipLink href="#sp-main">{t('skip')}</SkipLink>
          <div className="sp-header-inner">
            <div className="sp-header-start">
              {back ? (
                <IconButton
                  label={t('back')}
                  icon={<Icon name={dir === 'rtl' ? 'chevron-right' : 'chevron-left'} />}
                  onClick={() => navigate(back)}
                />
              ) : (
                <BusMark />
              )}
              {route.name === 'home' ? (
                <span className="sp-brand">ShamPass</span>
              ) : (
                <span className="sp-header-title">{title}</span>
              )}
            </div>
            <Button
              variant="ghost"
              aria-label={t('switchLang')}
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            >
              {lang === 'en' ? 'عربي' : 'EN'}
            </Button>
          </div>
        </header>
      }
      tabBar={
        showTabs ? (
          <TabBar value={tab} visibility="always" aria-label="ShamPass">
            <TabBarItem value="search" label={t('searchTab')} icon={<Icon name="search" />} onClick={() => navigate('#/')} />
            <TabBarItem
              value="tickets"
              label={t('ticketsTab')}
              icon={<TicketGlyph />}
              badge={bookings.length > 0 ? bookings.length : undefined}
              onClick={() => navigate('#/tickets')}
            />
          </TabBar>
        ) : undefined
      }
    >
      <div id="sp-main" tabIndex={-1} className={showTabs ? 'sp-page' : 'sp-page sp-page--dock'}>
        {route.name === 'home' && <HomePage navigate={navigate} />}
        {route.name === 'results' && <ResultsPage key={key} query={route.query} navigate={navigate} />}
        {route.name === 'seats' && (
          <SeatsPage query={route.query} tripId={route.tripId} seatIds={route.seatIds} navigate={navigate} />
        )}
        {route.name === 'pay' && (
          <CheckoutPage key={key} query={route.query} tripId={route.tripId} seatIds={route.seatIds} navigate={navigate} />
        )}
        {route.name === 'ticket' && <TicketPage key={key} id={route.id} navigate={navigate} />}
        {route.name === 'tickets' && <TicketsPage navigate={navigate} />}
      </div>
    </AppShell>
  );
}
