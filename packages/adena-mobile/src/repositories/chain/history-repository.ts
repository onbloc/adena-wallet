import { Activity, ActivityFilter } from '../../domain/activity';
import { ChainFamily, Network } from '../../domain/network';
import { Page } from '../../domain/nft';

export interface HistoryRepository {
  readonly family: ChainFamily;
  isSupported(network: Network): boolean;
  getActivities(address: string, network: Network, filter: ActivityFilter, cursor?: string | null): Promise<Page<Activity>>;
}
