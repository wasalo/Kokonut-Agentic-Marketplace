/**
 * Phase 45a i18n foundation (skeleton — no routing wired).
 *
 * The `next-intl` package is installed as a dependency so future work has a
 * starting point. To enable locale routing:
 *
 * 1. Create `apps/web/messages/{en,es,zh}.json` with translated keys.
 * 2. Create `apps/web/src/i18n/request.ts` and `apps/web/src/i18n/routing.ts`
 *    using `defineRouting` and `getRequestConfig` from `next-intl/server`.
 * 3. Add `apps/web/middleware.ts` that uses `createMiddleware` from
 *    `next-intl/middleware`.
 * 4. Update `apps/web/next.config.js` to wrap the config with
 *    `createNextIntlPlugin('./src/i18n/request.ts')`.
 * 5. Replace the hardcoded `<html lang="en">` in `apps/web/app/layout.tsx`
 *    with `<html lang={locale}>` populated from `params.locale`.
 *
 * Once wiring is complete, the helpers below can be re-exported from
 * `next-intl` directly without going through this stub.
 */
import { getLocale as nextIntlGetLocale, getTranslations as nextIntlGetTranslations } from 'next-intl/server';

export const SUPPORTED_LOCALES = ['en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Returns the active locale. Currently always `en` because routing is not
 * wired. Re-exported from `next-intl/server` so consumers can import from
 * one place once middleware is in place.
 */
export function getLocale(): Promise<string> {
  return nextIntlGetLocale();
}

export function getTranslations(namespace: string) {
  return nextIntlGetTranslations(namespace);
}
