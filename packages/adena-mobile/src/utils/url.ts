// Hostname of an http(s) URL without userinfo or port; parsed by hand because RN's URL is a partial shim.
export const hostOf = (url: string): string | undefined => {
  const authority = /^https?:\/\/([^/?#\\]*)/i.exec(url)?.[1];
  const host = authority?.slice(authority.lastIndexOf('@') + 1).replace(/:\d*$/, '').toLowerCase();

  return host || undefined;
};
