import { Account, TokenBalance } from '../domain/account';
import { Network } from '../domain/network';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { AccountService } from './account.service';

export class BalanceService {
  constructor(
    private readonly chainRegistry: ChainRegistry,
    private readonly accountService: AccountService,
  ) {}

  getNativeBalance(account: Account, network: Network): Promise<TokenBalance> {
    const address = this.accountService.getAddress(account, network);

    return this.chainRegistry.forNetwork(network).getNativeBalance(address, network);
  }
}
