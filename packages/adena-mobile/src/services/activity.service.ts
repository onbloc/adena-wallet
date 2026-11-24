import { Account } from '../domain/account';
import { Activity, ActivityFilter } from '../domain/activity';
import { Network } from '../domain/network';
import { Page } from '../domain/nft';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { AccountService } from './account.service';

export class ActivityService {
  constructor(private readonly chainRegistry: ChainRegistry, private readonly accountService: AccountService) {}

  isSupported(network: Network): boolean {
    return this.chainRegistry.history(network).isSupported(network);
  }

  getActivities(account: Account, network: Network, filter: ActivityFilter, cursor?: string | null): Promise<Page<Activity>> {
    const address = this.accountService.getAddress(account, network);

    return this.chainRegistry.history(network).getActivities(address, network, filter, cursor);
  }
}
