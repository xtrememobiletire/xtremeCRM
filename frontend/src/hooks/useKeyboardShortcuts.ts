import { useEffect, useCallback } from 'react';

type ShortcutMap = Record<string, () => void>;

export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName || '';
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // If user is typing in an input field and not holding Alt, ignore to allow standard typing
      if (isInput && !e.altKey && e.key !== 'Escape') {
        return;
      }

      const parts: string[] = [];
      if (e.altKey) parts.push('Alt');
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      parts.push(e.key);

      const combo = parts.join('+');

      // Check case-insensitive match or direct match
      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
        return;
      }

      // Check lowercase key fallback, e.g. "Alt+w" when e.key is "W" or "w"
      const lowerCombo = parts
        .map((p, i) => (i === parts.length - 1 ? p.toLowerCase() : p))
        .join('+');
      if (shortcuts[lowerCombo]) {
        e.preventDefault();
        shortcuts[lowerCombo]();
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
