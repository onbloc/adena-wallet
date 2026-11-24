import { Activity, ActivityFilter, ActivityFilterKind } from '../../../../domain/activity';
import { ChainFamily, Network } from '../../../../domain/network';
import { Page } from '../../../../domain/nft';
import { HistoryScope, OnblocApiClient } from '../../../../infrastructure/http/onbloc-api.client';
import { HistoryRepository } from '../../history-repository';
import { mapApiHistoryItem } from './gno-api-history.mapper';

const toScope = (filter: ActivityFilter): HistoryScope => {
  switch (filter.kind) {
    case ActivityFilterKind.ALL:
      return { kind: ActivityFilterKind.ALL };
    case ActivityFilterKind.NATIVE:
      return { kind: ActivityFilterKind.NATIVE };
    case ActivityFilterKind.GRC20:
      return { kind: ActivityFilterKind.GRC20, tokenKey: filter.tokenId };
  }
};

// History is served by the onbloc API only; networks without `apiUrl` report it as unsupported.
export class GnoHistoryRepository implements HistoryRepository {
  readonly family = ChainFamily.GNO;

  constructor(private readonly api: OnblocApiClient) {}

  isSupported(network: Network): boolean {
    return Boolean(network.apiUrl);
  }

  async getActivities(address: string, network: Network, filter: ActivityFilter, cursor?: string | null): Promise<Page<Activity>> {
    if (!network.apiUrl) {
      return { items: [], cursor: null, hasNext: false };
    }

    const { items, page } = await this.api.getTransactions(network.apiUrl, address, toScope(filter), cursor);

    return {
      items: items.map(item => mapApiHistoryItem(item, address)),
      cursor: page.cursor ?? null,
      hasNext: page.hasNext,
    };
  }
}
