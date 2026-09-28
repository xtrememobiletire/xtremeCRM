import { useEffect } from 'react';

type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

/**
 * Binds global keyboard shortcuts while the component is mounted.
 *
 * Key format: modifier(s) + key name joined by '+', e.g.
 *   'Alt+Enter', 'Alt+ArrowDown', 'Ctrl+Shift+S'
 *
 * Matching is case-insensitive for the key name.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Meta');
      parts.push(e.key);

      const combo = parts.join('+');

      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo](e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // Re-register whenever the shortcut map reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts]);
}
