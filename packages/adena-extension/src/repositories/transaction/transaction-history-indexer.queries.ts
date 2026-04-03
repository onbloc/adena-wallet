export const makeAccountTransactionsQuery = (
  address: string,
  cursor: string | null,
  size = 20,
): string => `
  {
    transactions(
      filter: {
        message: [
          {
            type_url: send
            bank_param: {
              send: {
                from_address: "${address}"
              }
            }
          }
          {
            type_url: send
            bank_param: {
              send: {
                to_address: "${address}"
              }
            }
          }
          {
            type_url: exec
            vm_param: {
              exec: {
                caller: "${address}"
              }
              add_package: {
                creator: "${address}"
              }
              run: {
                caller: "${address}"
              }
            }
          }
          {
            type_url: exec
            vm_param: {
              exec: {
                func: "Transfer"
                args: ["${address}"]
              }
            }
          }
          {
            type_url: exec
            vm_param: {
              exec: {
                func: "TransferFrom"
                args: ["", "${address}"]
              }
            }
          }
        ]
      }
      size: ${size}
      ascending: false
      after: ${cursor ? `"${cursor}"` : 'null'}
    ) {
      pageInfo {
        last
        hasNext
      }
      edges {
        cursor
        transaction {
          hash
          index
          success
          block_height
          gas_wanted
          gas_used
          gas_fee {
            amount
            denom
          }
          messages {
            typeUrl
            value {
              ... on BankMsgSend {
                from_address
                to_address
                amount
              }
              ... on MsgCall {
                caller
                send
                func
                max_deposit
                pkg_path
                args
              }
              ... on MsgAddPackage {
                creator
                send
                max_deposit
                package {
                  path
                }
              }
              ... on MsgRun {
                caller
                send
                max_deposit
                package {
                  path
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const makeNativeTransactionsQuery = (
  address: string,
  cursor: string | null,
  size = 20,
): string => `
  {
    transactions(
      filter: {
        message: [
          {
            type_url: send
            bank_param: {
              send: {
                from_address: "${address}"
              }
            }
          }
          {
            type_url: send
            bank_param: {
              send: {
                to_address: "${address}"
              }
            }
          }
        ]
      }
      size: ${size}
      ascending: false
      after: ${cursor ? `"${cursor}"` : 'null'}
    ) {
      pageInfo {
        last
        hasNext
      }
      edges {
        cursor
        transaction {
          hash
          index
          success
          block_height
          gas_wanted
          gas_used
          gas_fee {
            amount
            denom
          }
          messages {
            typeUrl
            value {
              ... on BankMsgSend {
                from_address
                to_address
                amount
              }
            }
          }
        }
      }
    }
  }
`;

export const makeGRC20TransferTransactionsQuery = (
  address: string,
  packagePath: string,
  cursor: string | null,
  size = 20,
): string => `
  {
    transactions(
      filter: {
        message: [
          {
            type_url: exec
            vm_param: {
              exec: {
                pkg_path: "${packagePath}"
                func: "Transfer"
                caller: "${address}"
              }
            }
          }
          {
            type_url: exec
            vm_param: {
              exec: {
                pkg_path: "${packagePath}"
                func: "Transfer"
                args: ["${address}"]
              }
            }
          }
        ]
      }
      size: ${size}
      ascending: false
      after: ${cursor ? `"${cursor}"` : 'null'}
    ) {
      pageInfo {
        last
        hasNext
      }
      edges {
        cursor
        transaction {
          hash
          index
          success
          block_height
          gas_wanted
          gas_used
          gas_fee {
            amount
            denom
          }
          messages {
            typeUrl
            value {
              ...on MsgCall {
                caller
                send
                max_deposit
                pkg_path
                func
                args
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * XXX: The fix is required after the indexer's pagination update.
 */
export const makeGRC20ReceivedTransactionsByAddressQuery = (address: string): string => `
{
  transactions(filter: {
    message: {
      type_url: exec
      vm_param: {
        exec: {
          func: "Transfer"
          args: ["${address}"]
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        ...on MsgCall {
          caller
          send
          pkg_path
          func
          args
        }
      }
    }
  }
}
`;

/**
 * XXX: The fix is required after the indexer's pagination update.
 */
export const makeVMTransactionsByAddressQuery = (address: string): string => `
{
  transactions(filter: {
    message: {
      route: vm
      vm_param: {
        exec: {
          caller: "${address}"
        }
        add_package: {
          creator: "${address}"
        }
        run: {
          caller: "${address}"
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        ... on BankMsgSend {
          from_address
          to_address
          amount
        }
        ... on MsgCall {
          caller
          send
          max_deposit
          func
          pkg_path
          args
        }
        ... on MsgAddPackage {
          creator
          package {
            path
          }
        }
        ... on MsgRun {
          caller
          send
          package {
            path
          }
        }
      }
    }
  }
}
`;

export const makeNativeTokenSendTransactionsByAddressQuery = (address: string): string => `
{
  transactions(filter: {
    message: {
      type_url: send
      bank_param: {
        send: {
          from_address: "${address}"
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        ...on BankMsgSend{
          from_address
          to_address
          amount
        }
      }
    }
  }
}
`;

/**
 * XXX: The fix is required after the indexer's pagination update.
 */
export const makeNativeTokenReceivedTransactionsByAddressQuery = (address: string): string => `
{
  transactions(filter: {
    message: {
      type_url: send
      bank_param: {
        send: {
          to_address: "${address}"
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        ...on BankMsgSend{
          from_address
          to_address
          amount
        }
      }
    }
  }
}
`;

/**
 * XXX: The fix is required after the indexer's pagination update.
 */
export const makeGRC20ReceivedTransactionsByAddressQueryByPackagePath = (
  address: string,
  packagePath: string,
): string => `
{
  transactions(filter: {
    message: {
      type_url: exec
      vm_param: {
        exec: {
          func: "Transfer"
          pkg_path: "${packagePath}"
          args: ["${address}"]
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        ...on MsgCall {
          caller
          send
          pkg_path
          func
          args
        }
      }
    }
  }
}
`;

/**
 * XXX: The fix is required after the indexer's pagination update.
 */
export const makeGRC20SendTransactionsByAddressQueryByPackagePath = (
  address: string,
  packagePath: string,
): string => `
{
  transactions(filter: {
    message: {
      type_url: exec
      vm_param: {
        exec: {
          pkg_path: "${packagePath}"
          caller: "${address}"
        }
      }
    }
  }) {
    hash
    index
    success
    block_height
    gas_wanted
    gas_used
    gas_fee {
      amount
      denom
    }
    messages {
      value {
        ... on MsgCall {
          caller
          send
          max_deposit
          func
          pkg_path
          args
        }
      }
    }
  }
}
`;

export const makeBlockTimeQuery = (blockHeight: number): string => `
{
  blocks(filter: {
    from_height: ${blockHeight}
    to_height: ${blockHeight + 1}
  },
    size: 1
  ) {
    edges {
      block {
        height
        time
      }
    }
  }
}
`;

/**
 * XXX: The fix is required after the indexer's pagination update.
 */
export const makeBlockTimeLegacyQuery = (blockHeight: number): string => `
{
  blocks(filter: {
    from_height: ${blockHeight}
    to_height: ${blockHeight + 1}
  }) {
    height
    time
  }
}
`;
