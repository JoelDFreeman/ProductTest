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
let currentSupportingText: string | undefined;
let currentAction: (() => void) | undefined;
let currentActionLabel = 'View';
let currentSecondaryAction: (() => void) | undefined;
let currentSecondaryLabel = 'Dismiss';
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Show a toast from anywhere in the app. */
export function showToast(message: string, action?: () => void, supportingText?: string, actionLabel = 'View', secondaryAction?: () => void, secondaryLabel = 'Dismiss'): void {
  current = message;
  currentSupportingText = supportingText;
  currentAction = action;
  currentActionLabel = actionLabel;
  currentSecondaryAction = secondaryAction;
  currentSecondaryLabel = secondaryLabel;
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export interface ToastController {
  message: string | null;
  supportingText?: string;
  action?: () => void;
  actionLabel: string;
  secondaryAction?: () => void;
  secondaryLabel: string;
  dismiss: () => void;
}

export function useToastMessage(): ToastController {
  const message = useSyncExternalStore(subscribe, () => current);
  const action = useSyncExternalStore(subscribe, () => currentAction);
  const dismiss = useCallback(() => {
    current = null;
    currentSupportingText = undefined;
    currentAction = undefined;
    currentActionLabel = 'View';
    currentSecondaryAction = undefined;
    currentSecondaryLabel = 'Dismiss';
    emit();
  }, []);
  const supportingText = useSyncExternalStore(subscribe, () => currentSupportingText);
  const actionLabel = useSyncExternalStore(subscribe, () => currentActionLabel);
  const secondaryAction = useSyncExternalStore(subscribe, () => currentSecondaryAction);
  const secondaryLabel = useSyncExternalStore(subscribe, () => currentSecondaryLabel);
  return { message, supportingText, action, actionLabel, secondaryAction, secondaryLabel, dismiss };
}
