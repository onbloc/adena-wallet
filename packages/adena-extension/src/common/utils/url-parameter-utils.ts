// URL-parameter and origin helpers with no UI dependencies, shared by the
// extension's popup and by dApp message handling on every platform.

export const parseParameters = (url: string): { [x: string]: string } => {
  const hash = url.split('?');
  if (hash.length < 2) {
    return {};
  }

  const params: { [key in string]: string } = {};
  for (const hashValue of hash) {
    for (const parameterValue of hashValue.split('&')) {
      // Split on the first '=' only so base64 '=' padding inside the value
      // is preserved verbatim.
      const eqIdx = parameterValue.indexOf('=');
      if (eqIdx > 0) {
        const key = parameterValue.slice(0, eqIdx);
        const value = parameterValue.slice(eqIdx + 1);
        params[key] = value;
      }
    }
  }

  return params;
};

// Swap '+' and '/' for URL-safe alternatives so the base64 payload survives
// being embedded in a URL query string (where '+' may be decoded as space and
// '/' has its own meaning). '=' padding is preserved as-is and is handled by
// parseParameters' first-'=' boundary rule.
const toUrlSafeBase64 = (value: string): string => value.replace(/\+/g, '-').replace(/\//g, '_');
const fromUrlSafeBase64 = (value: string): string => value.replace(/-/g, '+').replace(/_/g, '/');

const encodeParameterReplacer = (_key: string, value: unknown): unknown => {
  return typeof value === 'bigint' ? value.toString() : value;
};

export const encodeParameter = (data: { [key in string]: any }): string => {
  try {
    const encodedValue = encodeURI(JSON.stringify(data, encodeParameterReplacer));
    return toUrlSafeBase64(toBase64(encodedValue));
  } catch (error) {
    console.log(error);
  }
  return '';
};

export const decodeParameter = (data: string): any => {
  if (!data) {
    return {};
  }

  try {
    const decodedString = fromBase64(fromUrlSafeBase64(data));
    if (!decodedString) {
      return {};
    }

    const decodedValue = JSON.parse(decodeURI(decodedString));
    return decodedValue;
  } catch (error) {
    console.log(error);
  }
  return {};
};

export const toBase64 = (data: string): string => {
  try {
    return btoa(data);
  } catch (error) {
    console.log(error);
  }
  return '';
};

export const fromBase64 = (data: string): string => {
  try {
    return atob(data);
  } catch (error) {
    console.log(error);
  }
  return '';
};

// TODO: CHECK SSL
export const getSiteName = (protocol: string | undefined, hostname: string | undefined): string => {
  return `${protocol}//${hostname}`;
};
