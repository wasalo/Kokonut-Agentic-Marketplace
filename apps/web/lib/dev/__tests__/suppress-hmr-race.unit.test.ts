/**
 * Unit tests for the SuppressHmrRace dev-only window.error handler.
 * Verifies:
 *   - First occurrence: event.preventDefault() (no reload)
 *   - Second occurrence within 2s: window.location.reload() (and preventDefault)
 *   - After 2s quiet window: counter resets
 *   - Non-HMR-race errors are NOT intercepted
 *   - Idempotent registration (multiple mounts only arm once)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createHmrRaceHandler,
  isHmrRaceError,
  HMR_RACE_MESSAGE,
  SuppressHmrRace,
  _resetHmrRaceForTests,
} from '@/lib/dev/suppress-hmr-race';

const HMR_ERROR = new Error(`Internal Next.js error: ${HMR_RACE_MESSAGE}.`);
const OTHER_ERROR = new Error('Some other unrelated error.');

function mkEvent(error: unknown) {
  return { error, preventDefault: vi.fn() };
}

describe('isHmrRaceError', () => {
  it('matches the canonical Next.js HMR race error', () => {
    expect(isHmrRaceError(HMR_ERROR)).toBe(true);
  });

  it('rejects other errors', () => {
    expect(isHmrRaceError(OTHER_ERROR)).toBe(false);
  });

  it('rejects non-error values', () => {
    expect(isHmrRaceError(undefined)).toBe(false);
    expect(isHmrRaceError(null)).toBe(false);
    expect(isHmrRaceError('string')).toBe(false);
    expect(isHmrRaceError({})).toBe(false);
    expect(isHmrRaceError({ message: 42 })).toBe(false);
  });
});

describe('createHmrRaceHandler', () => {
  let now = 0;
  const reload = vi.fn();

  beforeEach(() => {
    now = 1_000_000;
    reload.mockReset();
  });

  it('suppresses the first HMR-race event (preventDefault, no reload)', () => {
    const h = createHmrRaceHandler(() => now, reload);
    const ev = mkEvent(HMR_ERROR);
    h(ev);
    expect(ev.preventDefault).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads on the second HMR-race event within 2s', () => {
    const h = createHmrRaceHandler(() => now, reload);
    h(mkEvent(HMR_ERROR));
    now += 500;
    const ev2 = mkEvent(HMR_ERROR);
    h(ev2);
    expect(ev2.preventDefault).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload on the second event if the 2s quiet window has expired', () => {
    const h = createHmrRaceHandler(() => now, reload);
    h(mkEvent(HMR_ERROR));
    now += 3_000;
    const ev2 = mkEvent(HMR_ERROR);
    h(ev2);
    expect(ev2.preventDefault).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('only reloads once even if many events arrive in a burst', () => {
    const h = createHmrRaceHandler(() => now, reload);
    h(mkEvent(HMR_ERROR));
    now += 100;
    h(mkEvent(HMR_ERROR));
    h(mkEvent(HMR_ERROR));
    h(mkEvent(HMR_ERROR));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('passes through unrelated errors without preventing default', () => {
    const h = createHmrRaceHandler(() => now, reload);
    const ev = mkEvent(OTHER_ERROR);
    h(ev);
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('passes through events with no error property', () => {
    const h = createHmrRaceHandler(() => now, reload);
    const ev = mkEvent(undefined);
    h(ev);
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('resets state after quiet window so a later burst can reload again', () => {
    const h = createHmrRaceHandler(() => now, reload);
    h(mkEvent(HMR_ERROR));
    now += 100;
    h(mkEvent(HMR_ERROR));
    expect(reload).toHaveBeenCalledTimes(1);
    now += 3_000;
    h(mkEvent(HMR_ERROR));
    now += 100;
    const ev = mkEvent(HMR_ERROR);
    h(ev);
    expect(reload).toHaveBeenCalledTimes(2);
    expect(ev.preventDefault).toHaveBeenCalledTimes(1);
  });
});

describe('SuppressHmrRace component', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetHmrRaceForTests();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    _resetHmrRaceForTests();
  });

  it('renders null', () => {
    expect(SuppressHmrRace()).toBeNull();
  });

  it('registers exactly one window error listener on mount', () => {
    SuppressHmrRace();
    const errorCalls = addEventListenerSpy.mock.calls.filter(([type]: [string]) => type === 'error');
    expect(errorCalls.length).toBe(1);
  });

  it('only arms once across multiple mounts (idempotent)', () => {
    SuppressHmrRace();
    SuppressHmrRace();
    SuppressHmrRace();
    const errorCalls = addEventListenerSpy.mock.calls.filter(([type]: [string]) => type === 'error');
    expect(errorCalls.length).toBe(1);
  });

  it('is a no-op in non-browser environments', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    try {
      _resetHmrRaceForTests();
      addEventListenerSpy.mockClear();
      expect(SuppressHmrRace()).toBeNull();
      expect(addEventListenerSpy).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: originalWindow,
      });
    }
  });
});
