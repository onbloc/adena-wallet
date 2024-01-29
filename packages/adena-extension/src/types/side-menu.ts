import { KeyringType } from 'adena-module';

export interface SideMenuAccountInfo {
  accountId: string;
  name: string;
  address: string;
  type: KeyringType;
  balance: string;
}

export interface SideMenuProps {
  locked: boolean;
  currentAccountId: string | null;
  accounts: SideMenuAccountInfo[];
  changeAccount: (accountId: string) => void;
  openLink: (link: string) => void;
  openWebLink: (link: string) => void;
  movePage: (link: string) => void;
  lock: () => void;
  close: () => void;
}

export interface SideMenuAccountItemProps {
  selected: boolean;
  account: SideMenuAccountInfo;
  changeAccount: (accountId: string) => void;
  moveGnoscan: (address: string) => void;
  moveAccountDetail: (accountId: string) => void;
}

export interface SideMenuAccountListProps {
  currentAccountId: string | null;
  accounts: SideMenuAccountInfo[];
  changeAccount: (accountId: string) => void;
  moveGnoscan: (address: string) => void;
  moveAccountDetail: (accountId: string) => void;
}
