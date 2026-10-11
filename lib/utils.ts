import { POSITIONS } from './constants';

// Only allow http(s) links so a stored "javascript:..." value can never become a clickable href.
export function safeUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

// True if `value` is an http(s) URL whose host is `host` or one of its subdomains.
export function isUrlOnHost(value: string, host: string): boolean {
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return u.hostname === host || u.hostname.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

export function positionRank(position: string): number {
  const i = (POSITIONS as readonly string[]).indexOf(position);
  return i === -1 ? POSITIONS.length : i;
}
