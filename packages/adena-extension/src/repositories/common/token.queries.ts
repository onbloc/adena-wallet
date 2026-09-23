import { Grc20TokenPackage } from '@common/utils/grc20reg-config';
import { Grc721TokenPackage } from '@common/utils/grc721-config';

/**
 * Event selection set shared by the token discovery queries. The indexer
 * returns the matched transactions under `getTransactions`, each carrying *all*
 * of its events — the `where` clause selects transactions, not events — so
 * every caller still has to filter the event list itself.
 */
const EVENT_TRANSACTION_FIELDS = `
  block_height
  response {
    events {
      ... on GnoEvent {
        type
        pkg_path
        attrs {
          key
          value
        }
      }
    }
  }
`;

const makeGRC20TransferEventBranches = (
  address: string,
  tokenPackages: Grc20TokenPackage[],
): string =>
  tokenPackages
    .flatMap(({ path, transferEvent }) =>
      [transferEvent.toAttr, transferEvent.fromAttr].map(
        (partyAttr) => `
            {
              GnoEvent: {
                pkg_path: { eq: "${path}" }
                type: { eq: "${transferEvent.type}" }
                attrs: {
                  key: { eq: "${partyAttr}" }
                  value: { eq: "${address}" }
                }
              }
            }`,
      ),
    )
    .join('');

/** GRC20 transfer events (sent or received) for an address, across every configured version. */
export const makeAllTransferEventsQueryBy = (
  address: string,
  tokenPackages: Grc20TokenPackage[],
): string => `
query getTokenTransferEvents {
  getTransactions(
    where: {
      success: { eq: true }
      response: {
        events: {
          _or: [${makeGRC20TransferEventBranches(address, tokenPackages)}
          ]
        }
      }
    }
    order: {
      heightAndIndex: DESC
    }
  ) {
    ${EVENT_TRANSACTION_FIELDS}
  }
}`;

/**
 * Every GRC721 collection ever created on the chain.
 *
 * `NewToken` is emitted by `grc721.NewToken`, the only constructor of a
 * `Token`, so the event stream is the complete collection list — there is no
 * on-chain grc721 registry to read instead.
 */
export const makeGRC721NewTokenEventsQuery = (tokenPackages: Grc721TokenPackage[]): string => {
  const branches = tokenPackages
    .map(
      ({ path, events }) => `
            {
              GnoEvent: {
                pkg_path: { eq: "${path}" }
                type: { eq: "${events.newTokenType}" }
              }
            }`,
    )
    .join('');

  return `
query getGRC721NewTokenEvents {
  getTransactions(
    where: {
      success: { eq: true }
      response: {
        events: {
          _or: [${branches}
          ]
        }
      }
    }
    order: {
      heightAndIndex: ASC
    }
  ) {
    ${EVENT_TRANSACTION_FIELDS}
  }
}`;
};

/**
 * The GRC721 tokens of one realm an address has ever *received*, newest first.
 *
 * Only the receiving side is matched on purpose. GRC721 publishes no
 * enumeration function, so the event log is the only way to learn which token
 * ids to ask about — but it does not have to be the authority on ownership: a
 * token the account owns must have been received at least once, and whether it
 * still owns it is settled by an `OwnerOf` RPC call afterwards. That keeps the
 * indexer out of the ownership decision entirely, so no replay ordering, send
 * or burn handling is needed here.
 *
 * `token` is matched by the `{packagePath}.` prefix rather than by an exact
 * collection id, so a realm hosting several collections is covered by one
 * query.
 */
export const makeGRC721ReceivedTokensQuery = (
  packagePath: string,
  address: string,
  tokenPackages: Grc721TokenPackage[],
): string => {
  // `attrs` is an OR list, so the token and the recipient constraint each need
  // their own `_and` entry rather than sibling attrs of one filter.
  const branches = tokenPackages
    .map(
      ({ path, events }) => `
            {
              GnoEvent: {
                pkg_path: { eq: "${path}" }
                type: { eq: "${events.transferType}" }
                _and: [
                  {
                    attrs: {
                      key: { eq: "${events.tokenAttr}" }
                      value: { like: "${packagePath}." }
                    }
                  }
                  {
                    attrs: {
                      key: { eq: "${events.toAttr}" }
                      value: { eq: "${address}" }
                    }
                  }
                ]
              }
            }`,
    )
    .join('');

  return `
query getGRC721ReceivedTokens {
  getTransactions(
    where: {
      success: { eq: true }
      response: {
        events: {
          _or: [${branches}
          ]
        }
      }
    }
    order: {
      heightAndIndex: DESC
    }
  ) {
    ${EVENT_TRANSACTION_FIELDS}
  }
}`;
};
