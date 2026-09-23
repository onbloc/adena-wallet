import { Grc20TokenPackage } from '@common/utils/grc20reg-config';
import { Grc721TokenPackage } from '@common/utils/grc721-config';

// `where` selects transactions, not events, so each match carries all of its
// events and callers still filter the list themselves.
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
 * Every GRC721 collection on the chain. `NewToken` is emitted by the only
 * constructor of a `Token`, and there is no grc721 registry to read instead.
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
 * Every GRC721 collection an address has ever received a token of. Narrows the
 * chain-wide catalog to the account before any per-collection RPC call.
 */
export const makeGRC721ReceivedCollectionsQuery = (
  address: string,
  tokenPackages: Grc721TokenPackage[],
): string => {
  const branches = tokenPackages
    .map(
      ({ path, events }) => `
            {
              GnoEvent: {
                pkg_path: { eq: "${path}" }
                type: { eq: "${events.transferType}" }
                attrs: {
                  key: { eq: "${events.toAttr}" }
                  value: { eq: "${address}" }
                }
              }
            }`,
    )
    .join('');

  return `
query getGRC721ReceivedCollections {
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

/**
 * The GRC721 tokens of one realm an address has ever *received*, newest first.
 * Only the receiving side: an owned token was received at least once, and
 * `OwnerOf` decides afterwards, so sends and burns need no handling here.
 * `token` matches by `{packagePath}.` prefix to cover every collection of a
 * realm in one query.
 */
export const makeGRC721ReceivedTokensQuery = (
  packagePath: string,
  address: string,
  tokenPackages: Grc721TokenPackage[],
): string => {
  // `attrs` is an OR list, so each constraint needs its own `_and` entry.
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
