import {GNOT_TOKEN} from '@common/constants/token.constant';
import {toHexHash} from '@common/utils/hash-utils';
import {
  makeTransactionScannerUrl,
  toScannerNetworkInfo,
} from '@common/utils/scanner-utils';
import {TransactionHistoryMapper} from '@repositories/transaction/mapper/transaction-history-mapper';
import type {
  NetworkMetainfo,
  TokenModel,
  TransactionInfo,
  TransactionWithPageInfo,
} from '@types';
import BigNumber from 'bignumber.js';

import {isGRC20TokenModel} from './tokens';
import type {NetworkServices} from './services';

export type HistoryScope =
  | {kind: 'all'}
  | {kind: 'native'}
  | {kind: 'grc20'; tokenPath: string};

/** Indexer networks return everything at once; it is shown this many at a time. */
export const INDEXER_PAGE_SIZE = 20;

export function fetchHistoryPage(
  net: NetworkServices,
  address: string,
  scope: HistoryScope,
  cursor: string | null,
): Promise<TransactionWithPageInfo> {
  const service = net.transactionHistoryService;
  if (scope.kind === 'native') {
    return service.fetchNativeTransactionHistory(address, cursor);
  }
  if (scope.kind === 'grc20') {
    return service.fetchGRC20TransactionHistory(address, scope.tokenPath, cursor);
  }
  return service.fetchAllTransactionHistory(address, cursor);
}

interface TokenUnit {
  symbol: string;
  decimals: number;
  /** What the history row shows as its logo. */
  logo: Pick<TokenModel, 'type' | 'image'>;
}

const GNOT_UNIT: TokenUnit = {
  symbol: GNOT_TOKEN.symbol,
  decimals: GNOT_TOKEN.decimals,
  logo: {type: 'gno-native', image: ''},
};

/**
 * The extension's getTokenAmount lookup: GNOT by denom, GRC20 by token path,
 * then by package path (history only carries the realm path).
 */
export function makeUnitMap(tokens: TokenModel[]): Record<string, TokenUnit> {
  const map: Record<string, TokenUnit> = {[GNOT_TOKEN.denom]: GNOT_UNIT};
  for (const token of tokens) {
    if (isGRC20TokenModel(token)) {
      const unit = {
        symbol: token.symbol,
        decimals: token.decimals,
        logo: {type: token.type, image: token.image},
      };
      map[token.tokenId] = unit;
      if (!(token.pkgPath in map)) {
        map[token.pkgPath] = unit;
      }
    }
  }
  return map;
}

/** A raw history amount in whole tokens; unknown denoms show their last path part. */
export function displayAmount(
  amount: {value: string; denom: string},
  units: Record<string, TokenUnit>,
): {value: string; denom: string} {
  const unit = units[amount.denom];
  if (!unit) {
    const parts = amount.denom.split('/');
    return {...amount, denom: parts[parts.length - 1] || amount.denom};
  }
  return {
    value: BigNumber(amount.value).shiftedBy(-unit.decimals).toString(),
    denom: unit.symbol,
  };
}

/**
 * Amounts in whole tokens and a date on every item. Indexer items carry only a
 * block height, so their time is read per block (cached by the service).
 */
export async function prepareForDisplay(
  net: NetworkServices,
  transactions: TransactionInfo[],
  units: Record<string, TokenUnit>,
): Promise<TransactionInfo[]> {
  const service = net.transactionHistoryService;
  return Promise.all(
    transactions.map(async transaction => {
      const date = service.supportedApi
        ? transaction.date
        : (await service.fetchBlockTime(Number(transaction.height || 1))) ?? '';
      return {
        ...transaction,
        // The token's logo travels as JSON in `logo`, as the extension
        // puts the logo URL there.
        logo:
          transaction.type === 'TRANSFER' && units[transaction.amount.denom]
            ? JSON.stringify(units[transaction.amount.denom].logo)
            : '',
        amount:
          transaction.type === 'TRANSFER_GRC721'
            ? transaction.amount
            : displayAmount(transaction.amount, units),
        networkFee: displayAmount(
          transaction.networkFee ?? {value: '0', denom: GNOT_TOKEN.denom},
          units,
        ),
        date,
      };
    }),
  );
}

/** Items grouped under "Today" / "Mon D, YYYY", newest first as fetched. */
export function groupByDay(
  transactions: TransactionInfo[],
): {title: string; transactions: TransactionInfo[]}[] {
  return TransactionHistoryMapper.queryToDisplay(transactions);
}

/** GnoScan's page for a transaction on this network (hex hash, as the extension). */
export function transactionScannerUrl(
  network: NetworkMetainfo,
  hash: string,
): string {
  return makeTransactionScannerUrl(
    toScannerNetworkInfo(network),
    toHexHash(hash),
    network.linkUrl || undefined,
  );
}
