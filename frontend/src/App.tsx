import { useCallback, useEffect, useState } from 'react';
import { AppShell, Button, Icon, IconButton, SkipLink, TabBar, TabBarItem } from 'mors-component-library';
import { useAuth } from './auth';
import { cityLabel } from './cities';
import { BusMark, TicketGlyph } from './icons';
import { useDocumentLang, useI18n } from './i18n';
import { AccountPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { BusPage, BusesPage, ProviderBookingsPage, ProviderHome, RoutePage, RoutesPage, TripPage, TripsPage } from './pages/ProviderPages';
import { ResultsPage } from './pages/ResultsPage';
import { SeatsPage } from './pages/SeatsPage';
import { TicketPage } from './pages/TicketPage';
import { TicketsPage } from './pages/TicketsPage';
import {
  go,
  loginPath,
  parseHash,
  resultsPath,
  routeKey,
  seatsPath,
  type AppRoute,
  type Navigate,
} from './route';

const PROVIDER_ROUTES = new Set<AppRoute['name']>([
  'provider',
  'buses',
  'bus',
  'routes',
  'routeEdit',
  'trips',
  'tripEdit',
  'providerBookings',
]);

const ACCOUNT_ROUTES = new Set<AppRoute['name']>([
  'tickets',
  'ticket',
  'notifications',
  'account',
  ...PROVIDER_ROUTES,
]);

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

export function App() {
  const { t, lang, dir, setLang } = useI18n();
  useDocumentLang();
  const { ready, user, unread } = useAuth();
  const [route, navigate] = useHashRoute();
  const key = routeKey(route);
  const provider = user?.role === 'provider';

  useEffect(() => {
    if (!ready || !user) return;
    if (user.role === 'customer' && PROVIDER_ROUTES.has(route.name)) navigate('#/', 'replace');
    if (user.role === 'provider' && (route.name === 'tickets' || route.name === 'ticket' || route.name === 'pay')) {
      navigate('#/provider/bookings', 'replace');
    }
  }, [ready, user, route, navigate]);

  const title = pageTitle(route, t, lang);
  const back = backHash(route, provider);
  const showTabs = route.name !== 'seats' && route.name !== 'pay' && route.name !== 'login' && route.name !== 'register';
  const tab = provider
    ? route.name === 'providerBookings'
      ? 'bookings'
      : 'desk'
    : route.name === 'tickets' || route.name === 'ticket'
      ? 'tickets'
      : 'search';

  useEffect(() => {
    document.title = title === 'ShamPass' ? 'ShamPass' : `${title} · ShamPass`;
  }, [title]);

  useEffect(() => {
    document.querySelector('.sp-shell .mors-app-shell-main')?.scrollTo(0, 0);
  }, [key]);

  const needsAccount = ACCOUNT_ROUTES.has(route.name);
  const currentNext = window.location.hash.replace(/^#/, '') || '/';

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
              {route.name === 'home' || route.name === 'provider' ? (
                <span className="sp-brand">ShamPass</span>
              ) : (
                <span className="sp-header-title">{title}</span>
              )}
            </div>
            <div className="sp-header-actions">
              {user && (
                <Button variant="ghost" aria-label={t('notify')} onClick={() => navigate('#/notifications')}>
                  <Icon name="bell" />
                  {unread > 0 ? <span className="sp-count">{unread}</span> : null}
                </Button>
              )}
              <IconButton label={t('account')} icon={<Icon name="user" />} onClick={() => navigate(user ? '#/account' : loginPath(currentNext))} />
              <Button variant="ghost" aria-label={t('switchLang')} onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
                {lang === 'en' ? 'عربي' : 'EN'}
              </Button>
            </div>
          </div>
        </header>
      }
      tabBar={
        showTabs ? (
          <TabBar value={tab} visibility="always" aria-label="ShamPass">
            {provider ? (
              <>
                <TabBarItem value="desk" label={t('deskTab')} icon={<Icon name="home" />} onClick={() => navigate('#/provider')} />
                <TabBarItem value="bookings" label={t('bookingsTab')} icon={<TicketGlyph />} onClick={() => navigate('#/provider/bookings')} />
              </>
            ) : (
              <>
                <TabBarItem value="search" label={t('searchTab')} icon={<Icon name="search" />} onClick={() => navigate('#/')} />
                <TabBarItem value="tickets" label={t('ticketsTab')} icon={<TicketGlyph />} onClick={() => navigate(user ? '#/tickets' : loginPath('/tickets'))} />
              </>
            )}
          </TabBar>
        ) : undefined
      }
    >
      <div id="sp-main" tabIndex={-1} className={showTabs ? 'sp-page' : 'sp-page sp-page--dock'}>
        {!ready && needsAccount ? (
          <p className="sp-loading">{t('loading')}</p>
        ) : needsAccount && !user ? (
          <LoginPage next={currentNext} navigate={navigate} />
        ) : (
          <>
            {route.name === 'home' && <HomePage navigate={navigate} />}
            {route.name === 'results' && <ResultsPage key={key} query={route.query} navigate={navigate} />}
            {route.name === 'seats' && <SeatsPage query={route.query} tripId={route.tripId} seatIds={route.seatIds} navigate={navigate} />}
            {route.name === 'pay' && <CheckoutPage key={key} query={route.query} tripId={route.tripId} seatIds={route.seatIds} navigate={navigate} />}
            {route.name === 'ticket' && user && <TicketPage key={key} id={route.id} navigate={navigate} />}
            {route.name === 'tickets' && user && <TicketsPage navigate={navigate} />}
            {route.name === 'login' && <LoginPage next={route.next} navigate={navigate} />}
            {route.name === 'register' && <RegisterPage next={route.next} navigate={navigate} />}
            {route.name === 'notifications' && user && <NotificationsPage />}
            {route.name === 'account' && user && <AccountPage navigate={navigate} />}
            {route.name === 'provider' && user && <ProviderHome navigate={navigate} />}
            {route.name === 'buses' && user && <BusesPage navigate={navigate} />}
            {route.name === 'bus' && user && <BusPage id={route.id} navigate={navigate} />}
            {route.name === 'routes' && user && <RoutesPage navigate={navigate} />}
            {route.name === 'routeEdit' && user && <RoutePage id={route.id} navigate={navigate} />}
            {route.name === 'trips' && user && <TripsPage navigate={navigate} />}
            {route.name === 'tripEdit' && user && <TripPage id={route.id} navigate={navigate} />}
            {route.name === 'providerBookings' && user && <ProviderBookingsPage />}
          </>
        )}
      </div>
    </AppShell>
  );
}

function pageTitle(route: AppRoute, t: ReturnType<typeof useI18n>['t'], lang: ReturnType<typeof useI18n>['lang']): string {
  switch (route.name) {
    case 'home':
    case 'login':
    case 'register':
      return 'ShamPass';
    case 'tickets':
      return t('myTickets');
    case 'ticket':
      return t('ticketTitle');
    case 'seats':
      return t('chooseSeats');
    case 'pay':
      return t('payWith');
    case 'results':
      return t('resultsTitle', { from: cityLabel(route.query.from, lang), to: cityLabel(route.query.to, lang) });
    case 'notifications':
      return t('notifications');
    case 'account':
      return t('account');
    case 'provider':
      return t('providerHome');
    case 'buses':
    case 'bus':
      return t('buses');
    case 'routes':
    case 'routeEdit':
      return t('routesNav');
    case 'trips':
    case 'tripEdit':
      return t('tripsNav');
    case 'providerBookings':
      return t('bookingsTab');
  }
}

function backHash(route: AppRoute, provider: boolean): string | null {
  switch (route.name) {
    case 'results':
      return '#/';
    case 'seats':
      return resultsPath(route.query);
    case 'pay':
      return seatsPath(route.query, route.tripId, route.seatIds);
    case 'ticket':
      return provider ? '#/provider/bookings' : '#/tickets';
    case 'notifications':
    case 'account':
    case 'login':
    case 'register':
      return provider ? '#/provider' : '#/';
    case 'buses':
    case 'routes':
    case 'trips':
    case 'providerBookings':
      return '#/provider';
    case 'bus':
      return '#/provider/buses';
    case 'routeEdit':
      return '#/provider/routes';
    case 'tripEdit':
      return '#/provider/trips';
    default:
      return null;
  }
}
