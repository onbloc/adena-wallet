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
  options?: { helperPath?: string; tokenKey?: string },
): string => {
  const partyFilter = `_or: [
              { caller: { eq: "${address}" } }
              { args: { eq: "${address}" } }
            ]`;

  // Direct token transfer: pkg_path is the token realm, func Transfer.
  const directBranch = `{
          value: {
            MsgCall: {
              pkg_path: { eq: "${packagePath}" }
              func: { eq: "Transfer" }
              ${partyFilter}
            }
          }
        }`;

  // Helper-routed transfer: helperPath.Transfer(tokenKey, to, amount). Match by
  // the helper realm and the token key carried in args[0].
  const helperPath = options?.helperPath;
  const tokenKey = options?.tokenKey;
  const helperBranch =
    helperPath && tokenKey
      ? `{
          value: {
            MsgCall: {
              pkg_path: { eq: "${helperPath}" }
              func: { eq: "Transfer" }
              args: { eq: "${tokenKey}" }
              ${partyFilter}
            }
          }
        }`
      : null;

  const messagesFilter = helperBranch
    ? `messages: {
        _or: [
          ${directBranch}
          ${helperBranch}
        ]
      }`
    : `messages: {
        value: {
          MsgCall: {
            pkg_path: { eq: "${packagePath}" }
            func: { eq: "Transfer" }
            ${partyFilter}
          }
        }
      }`;

  return `
query getGRC20TransactionHistory {
  getTransactions(
    where: {
      success: { eq: true }
      ${messagesFilter}
    }
    order: { heightAndIndex: DESC }
  ) {
    ${TRANSACTION_FIELDS}
  }
}
`;
};

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
