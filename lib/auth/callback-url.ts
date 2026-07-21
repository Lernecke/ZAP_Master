/**
 * Validiert `callbackUrl`-Query-Parameter als internen, relativen Pfad (Abschnitt 8.3 des
 * Architektur-Briefings). `callbackUrl` kommt aus der URL und ist damit Angreifer-kontrollierter
 * Input, unabhängig davon, dass der Proxy ihn beim Setzen selbst nur aus `request.nextUrl.pathname`
 * befüllt -- ein Link mit einem manipulierten `?callbackUrl=` kann denselben Parameter beliebig
 * setzen. Verwirft Protokoll-relative (`//evil.com`), absolute (`https://evil.com`), Backslash-
 * (`/\evil.com`, von manchen Browsern wie `//` behandelt) und kodierte externe Ziele
 * (`/%2F%2Fevil.com`).
 */
function looksExternal(value: string): boolean {
  return (
    value.startsWith('//') ||
    value.startsWith('/\\') ||
    value.includes('://') ||
    /^[a-z][a-z0-9+.-]*:/i.test(value.replace(/^\/+/, ''))
  )
}

export function getSafeCallbackUrl(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || !raw.startsWith('/')) return fallback

  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return fallback
  }

  if (looksExternal(raw) || looksExternal(decoded)) {
    return fallback
  }

  return raw
}
