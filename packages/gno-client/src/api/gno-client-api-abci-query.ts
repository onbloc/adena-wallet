import { GnoClientResnpose } from '.';

export interface GnoClientApiAbciQuery {
  getAccount: (address: string) => Promise<GnoClientResnpose.Account>;

  getBalances: (address: string) => Promise<GnoClientResnpose.Balances>;
}
