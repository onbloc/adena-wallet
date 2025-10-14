export const makeAllRealmsQuery = (): string => `
{
  getTransactions(
    where:{
      success: {
        eq: true
      }
      messages: {
        typeUrl: {
          eq: "add_package"
        }
        value: {
          MsgAddPackage: {
            package: {
              files: {
                _or: [
                  {
                    body: {
                    	like: "gno.land/p/demo/tokens/grc20"
                  	} 
                  }
                  {
                    body: {
                    	like: "gno.land/p/demo/tokens/grc721"
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
          ... on MsgAddPackage {
            creator
            package {
              path
              name
              files {
                name
                body
              }
            }
          }
        }
    }
  }
}
`;

export const makeGRC721TransferEventsQuery = (packagePath: string, address: string): string => `
{
  getTransactions(
    where:{
      success: {
        eq: true
      }
      messages: {
        typeUrl: {
          eq: "exec"
        }
      }
      response: {
        events: {
          GnoEvent: {
            type: {
              eq: "Transfer"
            }
            pkg_path: {
              eq: "${packagePath}"
            }
            attrs: {
              _or: [
                {
                  key: {
                    eq: "to"
                  }
                  value: {
                    eq: "${address}"
                  }
                }
                {
                  key: {
                    eq: "from"
                  }
                  value: {
                    eq: "${address}"
                  }
                }
              ]
            }
          }
        }
      }
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
}
`;

export const makeAllTransferEventsQueryBy = (address: string): string => `
{
  getTransactions(
    where:{
      success: {
        eq: true
      }
      response: {
        events: {
          GnoEvent: {
            type: {
              eq: "Transfer"
            }
            attrs: {
              key: {
                eq: "to"
              }
              value: {
                eq: "${address}"
              }
            }
          }
        }
      }
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
