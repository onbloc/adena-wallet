import { GnoClientResnpose } from '.';

export interface GnoClientApiAbciQuery {
  getAccount: (address: string) => Promise<GnoClientResnpose.Account>;

  getBalances: (address: string) => Promise<GnoClientResnpose.Balances>;

  queryRender: (packagePath: string, datas?: Array<string>) => Promise<GnoClientResnpose.AbciQuery | null>;

  queryEval: (packagePath: string, functionName: string, datas?: Array<string>) => Promise<GnoClientResnpose.AbciQuery | null>;

  queryPackage: (packagePath: string) => Promise<GnoClientResnpose.AbciQuery | null>;

  queryFile: (packagePath: string) => Promise<GnoClientResnpose.AbciQuery | null>;

  queryFunctions: (packagePath: string) => Promise<GnoClientResnpose.AbciQuery | null>;

  queryStore: (packagePath: string) => Promise<GnoClientResnpose.AbciQuery | null>;
}
