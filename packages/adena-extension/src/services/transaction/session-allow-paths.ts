// AllowPaths matcher for account sessions. Current chain state stores typed
// entries such as "*", "bank/send", or "vm/exec:gno.land/r/foo". Raw
// gno.land paths are still accepted locally for older imported metadata.

const ALLOW_PATHS_WILDCARD = '*';
const PATH_BEARING_ROUTE_TYPE = 'vm/exec';
const VALID_SESSION_ROUTE_TYPES = new Set([
  'vm/exec',
  'vm/run',
  'bank/send',
]);

// Maps proto endpoint -> chain route/type used in allow_paths entries.
// Stays in sync with gno msg Route() / Type() implementations.
type RouteType = { route: string; type: string };
const PROTO_TO_ROUTE_TYPE: Record<string, RouteType> = {
  '/vm.m_call': { route: 'vm', type: 'exec' },
  '/vm.m_run': { route: 'vm', type: 'run' },
  '/bank.MsgSend': { route: 'bank', type: 'send' },
};

export interface DecodedMessageForGuard {
  type: string;
  value: { pkg_path?: string };
}

interface AllowPathsEntry {
  wildcard: boolean;
  route: string;
  type: string;
  path: string;
}

function parseAllowPathsEntry(raw: string): AllowPathsEntry | null {
  if (raw === ALLOW_PATHS_WILDCARD) {
    return { wildcard: true, route: '', type: '', path: '' };
  }
  if (raw.startsWith('gno.land/')) {
    return { wildcard: false, route: 'vm', type: 'exec', path: raw };
  }
  const colonIdx = raw.indexOf(':');
  const routeType = colonIdx === -1 ? raw : raw.slice(0, colonIdx);
  const path = colonIdx === -1 ? '' : raw.slice(colonIdx + 1);
  const slashIdx = routeType.indexOf('/');
  if (slashIdx === -1) {
    return null;
  }
  if (!VALID_SESSION_ROUTE_TYPES.has(routeType)) {
    return null;
  }
  // Only "vm/exec" is allowed to carry a path; reject malformed entries
  // defensively even though the builder is supposed to have already
  // validated them at creation time.
  if (colonIdx !== -1 && (path === '' || routeType !== PATH_BEARING_ROUTE_TYPE)) {
    return null;
  }
  if (path.endsWith('/')) {
    return null;
  }
  return {
    wildcard: false,
    route: routeType.slice(0, slashIdx),
    type: routeType.slice(slashIdx + 1),
    path,
  };
}

function entryMatchesMsg(entry: AllowPathsEntry, message: DecodedMessageForGuard): boolean {
  if (entry.wildcard) {
    return true;
  }
  const rt = PROTO_TO_ROUTE_TYPE[message.type];
  if (!rt) {
    return false;
  }
  if (entry.route !== rt.route || entry.type !== rt.type) {
    return false;
  }
  if (entry.path === '') {
    return true;
  }
  const pkgPath = message.value?.pkg_path;
  if (!pkgPath) {
    return false;
  }
  // Exact match OR sub-path guarded by "/" to prevent prefix-attack
  // (e.g. allow="gno.land/r/demo" must not match "gno.land/r/demoX").
  return pkgPath === entry.path || pkgPath.startsWith(entry.path + '/');
}

// True iff at least one entry in allowPaths accepts the message.
export function matchesAllowPaths(
  message: DecodedMessageForGuard,
  allowPaths: string[],
): boolean {
  for (const raw of allowPaths) {
    const entry = parseAllowPathsEntry(raw);
    if (!entry) continue;
    if (entryMatchesMsg(entry, message)) {
      return true;
    }
  }
  return false;
}

// True iff every message in the tx is accepted by allowPaths.
export function allMessagesMatchAllowPaths(
  messages: DecodedMessageForGuard[],
  allowPaths: string[],
): boolean {
  return messages.every((m) => matchesAllowPaths(m, allowPaths));
}
