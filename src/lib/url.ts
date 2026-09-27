/**
 * Returns a link target only for http(s) URLs, so user-entered values like
 * `javascript:...` are never rendered as clickable links. Bare domains
 * ("example.com") are treated as https.
 */
export function safeHref(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
