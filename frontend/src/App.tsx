import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  AppShell,
  Button,
  Icon,
  IconButton,
  Sidebar,
  SidebarHeader,
  SidebarItem,
  SidebarNav,
  SidebarSection,
  SkipLink,
  TabBar,
  TabBarItem,
} from 'mors-component-library';
import { useAuth } from './auth';
import { cityLabel } from './cities';
import { BusMark, TicketGlyph } from './icons';
import { useDocumentLang, useI18n } from './i18n';
import { AccountPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { CheckoutPage } from './pages/CheckoutPage';
import { LandingPage } from './pages/LandingPage';
import { SearchPage } from './pages/HomePage';
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

let activeTransition: { skipTransition: () => void } | null = null;

function playTransition(direction: 'forward' | 'back', update: () => void) {
  if (!motionOk()) {
    delete document.documentElement.dataset.spNav;
    update();
    return;
  }
  document.documentElement.dataset.spNav = direction;
  const replay = document.documentElement.dataset.spVt === 'b' ? 'a' : 'b';
  document.documentElement.dataset.spVt = replay;
  document.documentElement.style.setProperty('--sp-vt-in', replay === 'b' ? '461ms' : '460ms');
  document.documentElement.style.setProperty('--sp-vt-out', replay === 'b' ? '281ms' : '280ms');
  try {
    activeTransition?.skipTransition();
  } catch {
    /* The previous move already finished. */
  }
  try {
    activeTransition = document.startViewTransition(() => {
      flushSync(update);
    });
  } catch {
    update();
  }
}

function useHashRoute(): [AppRoute, Navigate] {
  const [route, setRoute] = useState<AppRoute>(() => parseHash(window.location.hash));
  const hashRef = useRef(window.location.hash);
  const capturing = useRef(false);
  const popBack = useRef(false);

  useEffect(() => {
    const onPop = () => {
      const nextHash = window.location.hash;
      const prevHash = hashRef.current;
      if (prevHash === nextHash) {
        popBack.current = true;
        return;
      }
      hashRef.current = nextHash;
      popBack.current = false;
      if (transitionKey(prevHash) !== transitionKey(nextHash)) {
        capturing.current = true;
        playTransition('back', () => setRoute(parseHash(nextHash)));
        capturing.current = false;
        return;
      }
      setRoute(parseHash(nextHash));
    };
    const onHash = () => {
      const nextHash = window.location.hash;
      if (hashRef.current === nextHash && !capturing.current) return;
      const prevHash = hashRef.current;
      hashRef.current = nextHash;
      if (capturing.current) {
        setRoute(parseHash(nextHash));
        return;
      }
      const popped = popBack.current;
      popBack.current = false;
      const apply = () => setRoute(parseHash(nextHash));
      if (transitionKey(prevHash) !== transitionKey(nextHash)) {
        playTransition(navDirection(prevHash, nextHash, popped), apply);
        return;
      }
      apply();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const navigate = useCallback<Navigate>((hash, mode) => {
    const nextHash = hash.startsWith('#') ? hash : `#${hash}`;
    const prevHash = window.location.hash;
    const apply = () => {
      capturing.current = true;
      go(nextHash, mode);
      capturing.current = false;
    };
    if (transitionKey(prevHash) !== transitionKey(nextHash)) {
      playTransition(navDirection(prevHash, nextHash, false), apply);
      return;
    }
    delete document.documentElement.dataset.spNav;
    apply();
  }, []);
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
  const tab =
    route.name === 'home'
      ? ''
      : provider
        ? route.name === 'providerBookings'
          ? 'bookings'
          : 'desk'
        : route.name === 'tickets' || route.name === 'ticket'
          ? 'tickets'
          : route.name === 'search' || route.name === 'results'
            ? 'search'
            : '';

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
      data-mors-palette="retro"
      sidebar={provider && showTabs ? <AppSidebar route={route} navigate={navigate} /> : undefined}
      header={
        <header className="sp-header">
          <SkipLink href="#sp-main">{t('skip')}</SkipLink>
          <div className="sp-header-inner">
            <div className="sp-header-start">
              <button type="button" className="sp-brand-link" onClick={() => navigate('#/')}>
                <span className="sp-header-mark">
                  <BusMark />
                </span>
                <span className="sp-brand">ShamPass</span>
              </button>
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
          <TabBar value={tab} visibility="mobile" aria-label="ShamPass">
            {provider ? (
              <>
                <TabBarItem value="desk" label={t('deskTab')} icon={<Icon name="home" />} onClick={() => navigate('#/provider')} />
                <TabBarItem value="bookings" label={t('bookingsTab')} icon={<TicketGlyph />} onClick={() => navigate('#/provider/bookings')} />
              </>
            ) : (
              <>
                <TabBarItem value="search" label={t('searchTab')} icon={<Icon name="search" />} onClick={() => navigate('#/search')} />
                <TabBarItem value="tickets" label={t('ticketsTab')} icon={<TicketGlyph />} onClick={() => navigate(user ? '#/tickets' : loginPath('/tickets'))} />
              </>
            )}
          </TabBar>
        ) : undefined
      }
    >
      <div id="sp-main" tabIndex={-1} className={showTabs ? 'sp-page' : 'sp-page sp-page--dock'}>
        {!provider && showTabs && (
          <nav className="sp-nav" aria-label="ShamPass">
            <button type="button" className={tab === 'search' ? 'is-current' : undefined} onClick={() => navigate('#/search')}>
              <Icon name="search" />
              {t('searchTab')}
            </button>
            <button
              type="button"
              className={tab === 'tickets' ? 'is-current' : undefined}
              onClick={() => navigate(user ? '#/tickets' : loginPath('/tickets'))}
            >
              <TicketGlyph />
              {t('ticketsTab')}
            </button>
          </nav>
        )}
        <div key={route.name} className="sp-view">
          {back && (
            <button type="button" className="sp-back" onClick={() => navigate(back)}>
              <Icon name={dir === 'rtl' ? 'chevron-right' : 'chevron-left'} />
              {backLabel(route, t, lang, provider)}
            </button>
          )}
          {!ready && needsAccount ? (
            <p className="sp-loading">{t('loading')}</p>
          ) : needsAccount && !user ? (
            <LoginPage next={currentNext} navigate={navigate} />
          ) : (
            <>
              {route.name === 'home' && <LandingPage navigate={navigate} />}
              {route.name === 'search' && <SearchPage navigate={navigate} />}
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
      </div>
    </AppShell>
  );
}

function AppSidebar({ route, navigate }: { route: AppRoute; navigate: Navigate }) {
  const { t } = useI18n();
  return (
    <Sidebar className="sp-sidebar" aria-label="ShamPass">
      <SidebarHeader>
        <BusMark />
        <span className="sp-brand">ShamPass</span>
      </SidebarHeader>
      <SidebarNav>
        <SidebarSection>
          <SidebarItem active={route.name === 'provider'} icon={<Icon name="home" />} onClick={() => navigate('#/provider')}>
            {t('deskTab')}
          </SidebarItem>
          <SidebarItem active={route.name === 'buses' || route.name === 'bus'} icon={<Icon name="folder" />} onClick={() => navigate('#/provider/buses')}>
            {t('buses')}
          </SidebarItem>
          <SidebarItem
            active={route.name === 'routes' || route.name === 'routeEdit'}
            icon={<Icon name="arrow-right" />}
            onClick={() => navigate('#/provider/routes')}
          >
            {t('routesNav')}
          </SidebarItem>
          <SidebarItem active={route.name === 'trips' || route.name === 'tripEdit'} icon={<Icon name="calendar" />} onClick={() => navigate('#/provider/trips')}>
            {t('tripsNav')}
          </SidebarItem>
          <SidebarItem active={route.name === 'providerBookings'} icon={<TicketGlyph />} onClick={() => navigate('#/provider/bookings')}>
            {t('bookingsTab')}
          </SidebarItem>
        </SidebarSection>
      </SidebarNav>
    </Sidebar>
  );
}

function motionOk(): boolean {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof document.startViewTransition === 'function';
}

function screenPath(hash: string): string {
  const raw = (hash.startsWith('#') ? hash.slice(1) : hash).split('?')[0];
  return raw || '/';
}

function transitionKey(hash: string): string {
  const route = parseHash(hash.startsWith('#') ? hash : `#${hash}`);
  if (route.name === 'pay') return `pay:${route.tripId}`;
  return routeKey(route);
}

function screenDepth(path: string): number {
  if (path === '/' || path === '/search' || path === '/tickets' || path === '/provider') return 0;
  if (path === '/seats' || path === '/ticket' || path === '/register' || path === '/provider/bus' || path === '/provider/route' || path === '/provider/trip') {
    return 2;
  }
  if (path === '/pay') return 3;
  return 1;
}

function navDirection(currentHash: string, nextHash: string, popped: boolean): 'forward' | 'back' {
  if (popped) return 'back';
  const current = parseHash(currentHash.startsWith('#') ? currentHash : `#${currentHash}`);
  const nextPath = screenPath(nextHash);
  const backs = [backHash(current, false), backHash(current, true)];
  if (backs.some((hash) => hash !== null && screenPath(hash) === nextPath)) return 'back';
  if (screenDepth(nextPath) < screenDepth(screenPath(currentHash))) return 'back';
  return 'forward';
}

function pageTitle(route: AppRoute, t: ReturnType<typeof useI18n>['t'], lang: ReturnType<typeof useI18n>['lang']): string {
  switch (route.name) {
    case 'home':
    case 'login':
    case 'register':
      return 'ShamPass';
    case 'search':
      return t('searchTab');
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

function backLabel(
  route: AppRoute,
  t: ReturnType<typeof useI18n>['t'],
  lang: ReturnType<typeof useI18n>['lang'],
  provider: boolean,
): string {
  const hash = backHash(route, provider);
  if (!hash) return t('back');
  const target = parseHash(hash);
  if (target.name === 'home') return 'ShamPass';
  if (target.name === 'provider') return t('deskTab');
  return pageTitle(target, t, lang);
}

function backHash(route: AppRoute, provider: boolean): string | null {
  switch (route.name) {
    case 'results':
      return '#/search';
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
