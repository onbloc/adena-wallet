const SIMULATOR_HOSTS = ['127.0.0.1', '10.0.2.2'];

/** Parses an Onbloc MCP endpoint; throws TypeError unless it is `https://<host>/mcp` (or a simulator loopback when allowed). */
export function parseOnblocEndpoint(endpoint: string, allowLoopbackHttp?: true): URL {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new TypeError('Not a valid URL.');
  }
  const simulator = allowLoopbackHttp === true && url.protocol === 'http:' && SIMULATOR_HOSTS.includes(url.hostname);
  if ((!simulator && url.protocol !== 'https:') || url.username || url.password || url.pathname !== '/mcp' || url.search || url.hash) {
    throw new TypeError('Use an approved HTTPS Onbloc MCP endpoint; HTTP requires explicit simulator configuration.');
  }
  return url;
}
