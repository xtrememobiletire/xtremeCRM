import { lazy, type ComponentType } from 'react';

/**
 * Resilient dynamic import wrapper with automatic retry.
 * Handles transient network disconnects when waking from laptop sleep/screen idle,
 * and auto-reloads if deployment chunk hashes changed.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  interval = 800
) {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (remaining: number) => {
        factory()
          .then(resolve)
          .catch((error: any) => {
            if (remaining <= 0) {
              const chunkError =
                error?.message?.includes('Failed to fetch dynamically imported module') ||
                error?.message?.includes('Loading chunk') ||
                error?.message?.includes('error loading dynamically imported module') ||
                error?.name === 'ChunkLoadError';

              if (chunkError && typeof window !== 'undefined') {
                const reloadKey = `chunk_reload_${window.location.pathname}`;
                const hasReloaded = sessionStorage.getItem(reloadKey);
                if (!hasReloaded) {
                  sessionStorage.setItem(reloadKey, 'true');
                  window.location.reload();
                  return;
                }
              }
              reject(error);
              return;
            }

            setTimeout(() => {
              attempt(remaining - 1);
            }, interval);
          });
      };

      attempt(retries);
    })
  );
}
export default lazyWithRetry;
