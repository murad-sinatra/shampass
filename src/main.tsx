import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from 'mors-component-library';
import { App } from './App';
import { I18nProvider } from './i18n';
import 'mors-component-library/styles.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ToastProvider position="top-center">
        <App />
      </ToastProvider>
    </I18nProvider>
  </StrictMode>,
);
