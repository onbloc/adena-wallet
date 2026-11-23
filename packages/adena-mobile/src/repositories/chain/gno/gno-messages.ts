// Message type URLs follow the names the Adena extension exposes to dApps.
export const GnoMessageType = {
  BANK_MSG_SEND: '/bank.MsgSend',
  VM_CALL: '/vm.m_call',
  VM_ADDPKG: '/vm.m_addpkg',
  VM_RUN: '/vm.m_run',
} as const;

export type GnoMessageType = (typeof GnoMessageType)[keyof typeof GnoMessageType];

export interface GnoMemPackage {
  name: string;
  path: string;
  files: { name: string; body: string }[];
}

export interface BankSendValue {
  from_address: string;
  to_address: string;
  amount: string;
}

export interface VmCallValue {
  caller: string;
  send: string;
  max_deposit: string;
  pkg_path: string;
  func: string;
  args: string[] | null;
}

export interface VmAddPackageValue {
  creator: string;
  send: string;
  max_deposit: string;
  package: GnoMemPackage;
}

export interface VmRunValue {
  caller: string;
  send: string;
  max_deposit: string;
  package: GnoMemPackage;
}

export type GnoMessage
  = | { type: typeof GnoMessageType.BANK_MSG_SEND; value: BankSendValue }
    | { type: typeof GnoMessageType.VM_CALL; value: VmCallValue }
    | { type: typeof GnoMessageType.VM_ADDPKG; value: VmAddPackageValue }
    | { type: typeof GnoMessageType.VM_RUN; value: VmRunValue };
