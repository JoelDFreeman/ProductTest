import { useCallback, useSyncExternalStore } from 'react';

/**
 * toastStore — a global, app-wide transient toast message. Any code can call
 * `showToast(message)` (e.g. favourites toggles from row/detail menus); a
 * single `<Toast>` rendered in `App` subscribes and displays it.
 *
 * The `Toast` component owns its own auto-dismiss timer, so this store only
 * holds the current message and a `dismiss` to clear it.
 */

let current: string | null = null;
let currentAction: (() => void) | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Show a toast from anywhere in the app. */
export function showToast(message: string, action?: () => void): void {
  current = message;
  currentAction = action;
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export interface ToastController {
  message: string | null;
  action?: () => void;
  dismiss: () => void;
}

export function useToastMessage(): ToastController {
  const message = useSyncExternalStore(subscribe, () => current);
  const action = useSyncExternalStore(subscribe, () => currentAction);
  const dismiss = useCallback(() => {
    current = null;
    currentAction = undefined;
    emit();
  }, []);
  return { message, action, dismiss };
}
