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

/**
 * `block_height: { gt: N }` clause for resuming a walk, or nothing when
 * starting from genesis. The indexer applies it server-side, so a resumed walk
 * transfers only the blocks added since the last one.
 */
const makeFromBlockHeightClause = (fromBlockHeight?: number): string =>
  fromBlockHeight && fromBlockHeight > 0 ? `block_height: { gt: ${fromBlockHeight} }` : '';

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
export const makeGRC721NewTokenEventsQuery = (
  tokenPackages: Grc721TokenPackage[],
  fromBlockHeight?: number,
): string => {
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
  latestBlockHeight
  getTransactions(
    where: {
      success: { eq: true }
      ${makeFromBlockHeightClause(fromBlockHeight)}
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
