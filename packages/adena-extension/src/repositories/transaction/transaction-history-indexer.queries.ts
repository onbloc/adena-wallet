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

/**
 * GRC20 transfers received through a MsgRun, which the message-shape filter in
 * `makeAllTransactionHistoryQuery` cannot see: the run body is not indexed, so
 * only the sender is matched there (by `MsgRun.caller`). Merged into the
 * all-transactions result by the repository.
 */
export const makeGRC20ReceivedTransactionHistoryQuery = (address: string): string => `
query getGRC20ReceivedTransactionHistory {
  getTransactions(
    where: {
      success: { eq: true }
      response: {
        events: {
          GnoEvent: {
            type: { eq: "Transfer" }
            attrs: {
              key: { eq: "to" }
              value: { eq: "${address}" }
            }
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
 * GRC20 transfers (sent or received) for an address, scoped to a single token.
 *
 * Matched on the emitted `Transfer` event rather than on the message shape.
 * Since `grc20reg`'s write wrappers became non-crossing (`Transfer(_ int, rlm
 * realm, tokenKey, to, amount)`), MsgCall can no longer reach them, so a chain
 * without a GRC20 helper realm transfers through a MsgRun whose body the indexer
 * cannot filter on. The event is the one shape every invocation shares — direct
 * `Transfer(to, amount)`, helper `Transfer(tokenKey, to, amount)` and MsgRun all
 * emit it — carrying `token`, `from`, `to` and `value`.
 *
 * `tokenKey` is the token key `{packagePath}.{symbol}`, while the event's
 * `token` attr is `Token.ID()` = `{packagePath}.{symbol}.{sequence}`. The
 * trailing sequence is not part of the wallet's token identity, so the token is
 * matched by the `{tokenKey}.` prefix instead of an exact value.
 */
export const makeGRC20TransactionHistoryQuery = (address: string, tokenKey: string): string => {
  // `attrs` is an OR list, so the token and the party constraint each need to be
  // their own `_and` entry rather than sibling attrs of one filter.
  const partyBranch = (partyKey: 'from' | 'to'): string => `{
              GnoEvent: {
                type: { eq: "Transfer" }
                _and: [
                  {
                    attrs: {
                      key: { eq: "token" }
                      value: { like: "${tokenKey}." }
                    }
                  }
                  {
                    attrs: {
                      key: { eq: "${partyKey}" }
                      value: { eq: "${address}" }
                    }
                  }
                ]
              }
            }`;

  return `
query getGRC20TransactionHistory {
  getTransactions(
    where: {
      success: { eq: true }
      response: {
        events: {
          _or: [
            ${partyBranch('from')}
            ${partyBranch('to')}
          ]
        }
      }
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
