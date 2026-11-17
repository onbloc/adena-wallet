/**
 * Origin of an http(s) URL, or null. Parsed by hand because React Native's
 * URL implementation does not provide `origin`/`hostname`. URLs with
 * credentials (`https://user@host`) are rejected: they are a phishing trick
 * that makes another host look like the destination.
 */
export function originOf(url: string): string | null {
  const match = /^(https?):\/\/([^/?#]*)/i.exec(url.trim());
  if (!match) {
    return null;
  }
  const scheme = match[1].toLowerCase();
  const authority = match[2].toLowerCase();
  if (!authority || authority.includes('@')) {
    return null;
  }
  const host = authority.replace(scheme === 'https' ? /:443$/ : /:80$/, '');
  return `${scheme}://${host}`;
}

export function splitOrigin(origin: string): {
  protocol: string;
  hostname: string;
} {
  const [scheme, rest] = origin.split('://');
  return {protocol: `${scheme}:`, hostname: rest};
}

/** Only https pages may use the wallet; plain http only for a local dev node. */
export function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) {
    return false;
  }
  if (origin.startsWith('https://')) {
    return true;
  }
  return __DEV__ && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

/** Shows IDN (punycode) hosts as-is so look-alike Unicode domains are visible. */
export function displayHost(origin: string): string {
  const host = splitOrigin(origin).hostname;
  return host.split('.').some(label => label.startsWith('xn--'))
    ? `${host} (international domain)`
    : host;
}
