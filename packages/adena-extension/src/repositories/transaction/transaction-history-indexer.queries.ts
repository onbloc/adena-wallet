/**
 * Selection set shared by every transaction query — keeps the existing
 * `TransactionResponse` shape consumed by the mappers
 * (transaction-history-query.mapper.ts) intact.
 */
const TRANSACTION_FIELDS = `
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
        max_deposit
        pkg_path
        func
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
`;

/**
 * All transaction history for an address: native sends/receives, GRC20/GRC721
 * receives (by Transfer/TransferFrom args), and any VM message the address
 * caused (caller/creator).
 */
export const makeAllTransactionHistoryQuery = (address: string): string => `
query getAllTransactionHistory {
  getTransactions(
    where: {
      success: { eq: true }
      messages: {
        _or: [
          {
            value: {
              BankMsgSend: {
                from_address: { eq: "${address}" }
              }
            }
          }
          {
            value: {
              BankMsgSend: {
                to_address: { eq: "${address}" }
              }
            }
          }
          {
            value: {
              MsgCall: {
                caller: { eq: "${address}" }
              }
            }
          }
          {
            value: {
              MsgCall: {
                func: { eq: "Transfer" }
                args: { eq: "${address}" }
              }
            }
          }
          {
            value: {
              MsgCall: {
                func: { eq: "TransferFrom" }
                args: { eq: "${address}" }
              }
            }
          }
          {
            value: {
              MsgAddPackage: {
                creator: { eq: "${address}" }
              }
            }
          }
          {
            value: {
              MsgRun: {
                caller: { eq: "${address}" }
              }
            }
          }
        ]
      }
    }
    order: { heightAndIndex: DESC }
  ) {
    ${TRANSACTION_FIELDS}
  }
}
`;

/** Native (BankMsgSend) sends and receives for an address. */
export const makeNativeTransactionHistoryQuery = (address: string): string => `
query getNativeTransactionHistory {
  getTransactions(
    where: {
      success: { eq: true }
      messages: {
        value: {
          BankMsgSend: {
            _or: [
              { from_address: { eq: "${address}" } }
              { to_address: { eq: "${address}" } }
            ]
          }
        }
      }
    }
    order: { heightAndIndex: DESC }
  ) {
    ${TRANSACTION_FIELDS}
  }
}
`;

/**
 * GRC20 transfers (sent or received) for an address, scoped to a single
 * token package. `caller eq address` catches sends; `args eq address`
 * catches the recipient slot of `Transfer(to, amount)`.
 */
export const makeGRC20TransactionHistoryQuery = (
  address: string,
  packagePath: string,
): string => `
query getGRC20TransactionHistory {
  getTransactions(
    where: {
      success: { eq: true }
      messages: {
        value: {
          MsgCall: {
            pkg_path: { eq: "${packagePath}" }
            func: { eq: "Transfer" }
            _or: [
              { caller: { eq: "${address}" } }
              { args: { eq: "${address}" } }
            ]
          }
        }
      }
    }
    order: { heightAndIndex: DESC }
  ) {
    ${TRANSACTION_FIELDS}
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
