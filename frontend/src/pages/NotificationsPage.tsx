import { useEffect, useState } from 'react';
import { Button, EmptyState } from 'mors-component-library';
import { api } from '../api';
import { useAuth } from '../auth';
import { formatTicketWhen } from '../format';
import { useI18n } from '../i18n';
import type { Notice } from '../types';

export function NotificationsPage() {
  const { t, lang } = useI18n();
  const { refreshUnread } = useAuth();
  const [items, setItems] = useState<Notice[] | null>(null);

  async function load() {
    const data = await api.notifications();
    setItems(data.items);
    await refreshUnread();
  }

  useEffect(() => {
    let active = true;
    api
      .notifications()
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        void refreshUnread();
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [refreshUnread]);

  if (!items) return <p className="sp-loading">{t('loading')}</p>;
  if (items.length === 0) {
    return <EmptyState title={t('noNotifications')} description={t('noNotificationsBody')} />;
  }

  return (
    <div className="sp-stack">
      <div className="sp-section-head">
        <h1 className="sp-page-title">{t('notifications')}</h1>
        <Button
          variant="ghost"
          onClick={() => {
            void api.readAll().then(load);
          }}
        >
          {t('markAllRead')}
        </Button>
      </div>
      <ul className="sp-notes">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={item.readAt ? 'sp-note' : 'sp-note is-unread'}
              onClick={() => {
                if (item.readAt) return;
                void api.readNotification(item.id).then(load);
              }}
            >
              <strong>{lang === 'ar' ? item.titleAr : item.titleEn}</strong>
              <span>{lang === 'ar' ? item.bodyAr : item.bodyEn}</span>
              <small>{formatTicketWhen(item.createdAt, lang)}</small>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
