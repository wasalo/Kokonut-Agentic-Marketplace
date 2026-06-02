/**
 * Workaround for Next.js 16 dev-mode HMR race condition.
 *
 * In dev mode, the HMR websocket can dispatch a router refresh action
 * (ACTION_HMR_REFRESH) before the page's React tree has finished hydrating
 * and `useActionQueue` has initialized the module-level `dispatch` variable.
 * The throw site is in `node_modules/next/dist/client/components/use-action-queue.ts`:
 *
 *   let dispatch = null
 *   export function dispatchAppRouterAction(action) {
 *     if (dispatch === null) {
 *       throw new Error('Internal Next.js error: Router action dispatched before initialization.')
 *     }
 *     dispatch(action)
 *   }
 *
 * The error is dev-only (hmrRefresh is gated on NODE_ENV !== 'production') and
 * CI-immune (playwright.config.ts uses `next start` in CI). It is functionally
 * harmless: the dropped HMR message just means the next file save will trigger
 * a fresh refresh. But it spams the browser console on every hot reload during
 * the initial hydration window.
 *
 * Behavior:
 *   - First occurrence:  silently suppress (event.preventDefault).
 *   - Second occurrence within 2s: suppress + window.location.reload() to
 *     ensure a clean post-hydration state, so subsequent HMR works normally.
 *   - After 2s of quiet, the counter resets.
 *
 * Upstream tracking: Next.js issue around `dispatchAppRouterAction` initialisation
 * race. Not fixed in 16.2.7 (changelog mentions hydration-cache fix #93492 but
 * not this specific race). Safe to delete this file once upstream lands a fix.
 */
'use client';

export const HMR_RACE_MESSAGE = 'Router action dispatched before initialization';
const RELOAD_QUIET_WINDOW_MS = 2_000;

export function isHmrRaceError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message.includes(HMR_RACE_MESSAGE)
  );
}

export interface HmrRaceState {
  firstSeenAt: number | null;
  reloading: boolean;
}

export function createHmrRaceHandler(
  now: () => number = Date.now,
  reload: () => void = () => window.location.reload(),
): (event: { error: unknown; preventDefault: () => void }) => void {
  const state: HmrRaceState = { firstSeenAt: null, reloading: false };

  return (event) => {
    if (!isHmrRaceError(event.error)) return;

    const t = now();
    const quietWindowExpired =
      state.firstSeenAt === null || t - state.firstSeenAt > RELOAD_QUIET_WINDOW_MS;

    if (quietWindowExpired) {
      state.firstSeenAt = t;
      state.reloading = false;
      event.preventDefault();
      return;
    }

    if (state.reloading) return;
    state.reloading = true;
    event.preventDefault();
    reload();
  };
}

let armState: { handler: ((event: ErrorEvent) => void) | null } = { handler: null };

function armHandler(): void {
  if (typeof window === 'undefined') return;
  if (armState.handler) return;

  const handler = createHmrRaceHandler();
  armState.handler = handler as unknown as (event: ErrorEvent) => void;
  window.addEventListener('error', armState.handler);
}

export function SuppressHmrRace(): null {
  armHandler();
  return null;
}

export function _resetHmrRaceForTests(): void {
  armState = { handler: null };
}
