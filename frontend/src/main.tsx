import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App.tsx';

// Sentry Error & Performance Monitoring - Initialized exclusively in Production
const SENTRY_DSN =
  import.meta.env.VITE_SENTRY_DSN ||
  'https://eef6d927e7f21b89ec7c0b4926bef1e5@o4512248443437056.ingest.us.sentry.io/4512248500125696';

if (import.meta.env.PROD && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // Protect customer PII (phone, address, card details)
        blockAllMedia: true,
      }),
    ],
    // Tracing: sample 20% in production to conserve quota while maintaining visibility
    tracesSampleRate: 0.2,
    tracePropagationTargets: ['localhost', /^\/api/],
    // Session Replay: capture 10% of standard sessions, but 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE || 'production',
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
