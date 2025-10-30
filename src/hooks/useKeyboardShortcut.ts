import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  callback: () => void;
  description?: string;
}

/**
 * Keyboard Shortcut Hook
 * Adds keyboard shortcuts for better keyboard navigation
 * WCAG 2.1.1 - Keyboard
 */
export function useKeyboardShortcut(config: ShortcutConfig) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const {
        key,
        ctrlKey = false,
        shiftKey = false,
        altKey = false,
        metaKey = false,
        callback,
      } = config;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrlKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey &&
        event.metaKey === metaKey
      ) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config]);
}

/**
 * Multiple Keyboard Shortcuts Hook
 * Registers multiple keyboard shortcuts at once
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const {
          key,
          ctrlKey = false,
          shiftKey = false,
          altKey = false,
          metaKey = false,
          callback,
        } = shortcut;

        if (
          event.key.toLowerCase() === key.toLowerCase() &&
          event.ctrlKey === ctrlKey &&
          event.shiftKey === shiftKey &&
          event.altKey === altKey &&
          event.metaKey === metaKey
        ) {
          event.preventDefault();
          callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
