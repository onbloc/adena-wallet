export const makeGetGRC20RegisterEventsQuery = (): string => `
query getGRC20RegisterEvents {
  getTransactions(
    where: {
      success: {eq: true}, 
      response: {
        events: {
          GnoEvent: {
            type: { eq: "register" }
            pkg_path: { eq: "gno.land/r/demo/defi/grc20reg" }
          }
        }
      }
    }
  ) {
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
  }
}`;

export const makeGetGRC721AddPackagePathsQuery = (): string => `
query getGRC721AddPackagePaths {
  getTransactions(
    where: {
      success: {eq: true}, 
      messages: {
        value: {
          MsgAddPackage: {
            package: {
              path: {
                like: "gno.land/r/"
              }
              files: {
                _and: [
                  {
                    body: {
                      like: "gno.land/p/demo/tokens/grc721"
                    }
                  }
                  {
                    body: {
                      like: "func BalanceOf\\("
                    }
                  }
                  {
                    body: {
                      like: "func OwnerOf\\("
                    }
                  }
                  {
                    body: {
                      like: "func TransferFrom\\("
                    }
                  }
                  {
                    body: {
                      like: "func Approve\\("
                    }
                  }
                  {
                    body: {
                      like: "func SetApprovalForAll\\("
                    }
                  }
                  {
                    body: {
                      like: "func GetApproved\\("
                    }
                  }
                  {
                    body: {
                      like: "func IsApprovedForAll\\("
                    }
                  }
                  {
                    body: {
                      like: "func SafeTransferFrom\\("
                    }
                  }
                  {
                    body: {
                      like: "func Name\\("
                    }
                  }
                  {
                    body: {
                      like: "func Symbol\\("
                    }
                  }
                  {
                    body: {
                      like: "func TokenURI\\("
                    }
                  }
                  {
                    body: {
                      like: "func SetTokenURI\\("
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  ) {
    messages {
      value {
        ...on MsgAddPackage {
          package {
            path
          }
        }
      }
    }
  }
}`;

export const makeGRC721TransferEventsQuery = (packagePath: string, address: string): string => `
query getGRC721TransferEvents {
  getTransactions(
    where: {
      response: {
        events: {
          _or: [
            {
              GnoEvent: {
                pkg_path: { eq: "gno.land/p/demo/tokens/grc721" }
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
                pkg_path: { eq: "gno.land/p/demo/tokens/grc721" }
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
                pkg_path: { eq: "gno.land/p/demo/tokens/grc721" }
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

export const makeAllTransferEventsQueryBy = (address: string): string => `
query getTokenTransferEvents {
  getTransactions(
    where: {
      response: {
        events: {
          _or: [
            {
              GnoEvent: {
                pkg_path: { eq: "gno.land/p/demo/tokens/grc20" }
                type: { eq: "Transfer" } 
                attrs: {
                  key: { eq: "to" }
                  value: { eq: "${address}" }
                }
              }
            }
            {
              GnoEvent: {
                pkg_path: { eq: "gno.land/p/demo/tokens/grc20" }
                type: { eq: "Transfer" } 
                attrs: {
                  key: { eq: "from" }
                  value: { eq: "${address}" }
                }
              }
            }
            {
              GnoEvent: {
                pkg_path: { eq: "gno.land/p/demo/tokens/grc721" }
                type: { eq: "Mint" } 
                attrs: {
                  key: { eq: "to" }
                  value: { eq: "${address}" }
                }
              }
            }
            {
              GnoEvent: {
                pkg_path: { eq: "gno.land/p/demo/tokens/grc721" }
                type: { eq: "Transfer" } 
                attrs: {
                  key: { eq: "to" }
                  value: { eq: "${address}" }
                }
              }
            }
            {
              GnoEvent: {
                pkg_path: { eq: "gno.land/p/demo/tokens/grc721" }
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
