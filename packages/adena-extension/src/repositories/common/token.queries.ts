import { Grc20TokenPackage } from '@common/utils/grc20reg-config';

/** The grc721 package whose Mint/Transfer events identify GRC721 activity. */
export const GRC721_PACKAGE_PATH = 'gno.land/p/nt/grc721/v0';

export const makeGRC721TransferEventsQuery = (packagePath: string, address: string): string => `
query getGRC721TransferEvents {
  getTransactions(
    where: {
      response: {
        events: {
          _or: [
            {
              GnoEvent: {
                pkg_path: { eq: "${GRC721_PACKAGE_PATH}" }
                type: { eq: "Mint" } 
                _and: [
                  {
                    attrs: {
                      key: { eq: "tokenId" }
                      value: { eq: "${packagePath}" }
                    }
                  }
                  {
                    attrs: {
                      key: { eq: "to" }
                      value: { eq: "${address}" }
                    }
                  }
                ]
              }
            }
            {
              GnoEvent: {
                pkg_path: { eq: "${GRC721_PACKAGE_PATH}" }
                type: { eq: "Transfer" } 
                _and: [
                  {
                    attrs: {
                      key: { eq: "tokenId" }
                      value: { eq: "${packagePath}" }
                    }
                  }
                  {
                    attrs: {
                      key: { eq: "to" }
                      value: { eq: "${address}" }
                    }
                  }
                ]
              }
            }
            {
              GnoEvent: {
                pkg_path: { eq: "${GRC721_PACKAGE_PATH}" }
                type: { eq: "Transfer" } 
                _and: [
                  {
                    attrs: {
                      key: { eq: "tokenId" }
                      value: { eq: "${packagePath}" }
                    }
                  }
                  {
                    attrs: {
                      key: { eq: "from" }
                      value: { eq: "${address}" }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    }
    order: {
      heightAndIndex: DESC
    }
  ) {
    hash
    index
    success
    block_height
    response {
      events {
        ...on GnoEvent {
          type
          pkg_path
          attrs {
            key
            value
          }
        }
      }
    }
  }
}`;

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

export const makeAllTransferEventsQueryBy = (
  address: string,
  tokenPackages: Grc20TokenPackage[],
): string => `
query getTokenTransferEvents {
  getTransactions(
    where: {
      response: {
        events: {
          _or: [${makeGRC20TransferEventBranches(address, tokenPackages)}
            {
              GnoEvent: {
                pkg_path: { eq: "${GRC721_PACKAGE_PATH}" }
                type: { eq: "Mint" } 
                attrs: {
                  key: { eq: "to" }
                  value: { eq: "${address}" }
                }
              }
            }
            {
              GnoEvent: {
                pkg_path: { eq: "${GRC721_PACKAGE_PATH}" }
                type: { eq: "Transfer" } 
                attrs: {
                  key: { eq: "to" }
                  value: { eq: "${address}" }
                }
              }
            }
            {
              GnoEvent: {
                pkg_path: { eq: "${GRC721_PACKAGE_PATH}" }
                type: { eq: "Transfer" } 
                attrs: {
                  key: { eq: "from" }
                  value: { eq: "${address}" }
                }
              }
            }
          ]
        }
      }
    }
    order: {
      heightAndIndex: DESC
    }
  ) {
    hash
    index
    success
    block_height
    response {
      events {
        ...on GnoEvent {
          type
          pkg_path
          attrs {
            key
            value
          }
        }
      }
    }
  }
}`;
