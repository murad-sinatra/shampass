import { useState } from 'react';
import { Alert, Button, TextField } from 'mors-component-library';
import { api, explain } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { loginPath, registerPath, type Navigate } from '../route';

export function LoginPage({ next, navigate }: { next: string; navigate: Navigate }) {
  const { t } = useI18n();
  const { setSession } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const result = await api.login(username, password);
      setSession(result.token, result.user);
      navigate(destination(next, result.user.role), 'replace');
    } catch (reason) {
      setError(explain(reason, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="sp-stack"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <header className="sp-hero">
        <h1>{t('login')}</h1>
        <p className="sp-lead">{t('accountHint')}</p>
      </header>
      <TextField label={t('username')} name="username" autoComplete="username" dir="ltr" value={username} onChange={(event) => setUsername(event.target.value)} />
      <TextField
        label={t('password')}
        name="password"
        type="password"
        autoComplete="current-password"
        dir="ltr"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error && <Alert tone="danger" title={error} />}
      <Button type="submit" size="lg" block loading={busy}>
        {t('login')}
      </Button>
      <Button variant="ghost" block onClick={() => navigate(registerPath(next))}>
        {t('noAccount')} {t('register')}
      </Button>
      <p className="sp-fine">{t('demoAccounts')}</p>
    </form>
  );
}

export function RegisterPage({ next, navigate }: { next: string; navigate: Navigate }) {
  const { t } = useI18n();
  const { setSession } = useAuth();
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyNameAr, setCompanyNameAr] = useState('');
  const [companyNameEn, setCompanyNameEn] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const result = await api.register({
        username,
        password,
        name,
        phone,
        role,
        companyNameAr,
        companyNameEn,
      });
      setSession(result.token, result.user);
      navigate(destination(next, result.user.role), 'replace');
    } catch (reason) {
      setError(explain(reason, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="sp-stack"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <header className="sp-hero">
        <h1>{t('register')}</h1>
        <p className="sp-lead">{t('roleHint')}</p>
      </header>
      <div className="sp-sort" role="group" aria-label={t('accountRole')}>
        {(['customer', 'provider'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={role === option ? 'sp-sort-btn is-selected' : 'sp-sort-btn'}
            aria-pressed={role === option}
            onClick={() => setRole(option)}
          >
            {t(option === 'customer' ? 'customerRole' : 'providerRole')}
          </button>
        ))}
      </div>
      <TextField label={t('displayName')} name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label={t('username')} name="username" autoComplete="username" dir="ltr" value={username} onChange={(event) => setUsername(event.target.value)} />
      <TextField
        label={t('password')}
        description={t('passwordHint')}
        name="password"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <TextField label={t('phone')} description={t('optional')} name="phone" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} />
      {role === 'provider' && (
        <>
          <TextField label={t('companyNameAr')} name="company-ar" value={companyNameAr} onChange={(event) => setCompanyNameAr(event.target.value)} />
          <TextField label={t('companyNameEn')} name="company-en" dir="ltr" value={companyNameEn} onChange={(event) => setCompanyNameEn(event.target.value)} />
        </>
      )}
      {error && <Alert tone="danger" title={error} />}
      <Button type="submit" size="lg" block loading={busy}>
        {t('register')}
      </Button>
      <Button variant="ghost" block onClick={() => navigate(loginPath(next))}>
        {t('haveAccount')} {t('login')}
      </Button>
    </form>
  );
}

export function AccountPage({ navigate }: { navigate: Navigate }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="sp-stack">
      <header className="sp-hero">
        <h1>{t('account')}</h1>
        <p className="sp-lead">{t('signedInAs', { name: user.name })}</p>
      </header>
      <p className="sp-sub">
        {user.username} · {user.role === 'provider' ? t('providerRole') : t('customerRole')}
      </p>
      {user.company && (
        <p className="sp-sub">
          {user.company.ar} · {user.company.en}
        </p>
      )}
      <p className="sp-fine">{t('accountHint')}</p>
      <Button
        variant="secondary"
        onClick={() => {
          logout();
          navigate('#/', 'replace');
        }}
      >
        {t('logout')}
      </Button>
    </div>
  );
}

function destination(next: string, role: 'customer' | 'provider'): string {
  if (next.startsWith('/')) {
    if (role === 'provider' && !next.startsWith('/provider') && next !== '/notifications' && next !== '/account') {
      return '#/provider';
    }
    return `#${next}`;
  }
  return role === 'provider' ? '#/provider' : '#/';
}
