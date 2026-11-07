// Gno connect payload types, kept apart from `methods/gno-connect.ts` (which
// reads the page DOM) so code that only passes these values around does not
// depend on DOM types.

export interface GnoConnectInfo {
  rpc: string;
  chainId: string;
}

export interface GnoMessageInfo {
  packagePath: string;
  functionName: string;
  send: string;
  maxDeposit: string;
  args: GnoArgumentInfo[] | null;
}

export interface GnoArgumentInfo {
  index: number;
  key: string;
  value: string;
  type?: string;
}
