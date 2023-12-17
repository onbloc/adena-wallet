import SideMenu from './side-menu';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SideMenuProps } from '@types';

export default {
  title: 'components/common/SideMenu',
  component: SideMenu,
} as Meta<typeof SideMenu>;

export const Default: StoryObj<SideMenuProps> = {
  args: {
    locked: false,
    currentAccountId: '1',
    accounts: [
      {
        accountId: '1',
        name: 'Account 1',
        address: 'Address1',
        balance: '123,992.09 GNOT',
        type: 'HD_WALLET',
      },
      {
        accountId: '2',
        name: 'Account 2',
        address: 'Address2',
        balance: '123,992.09 GNOT',
        type: 'LEDGER',
      },
      {
        accountId: '3',
        name: 'Account 3',
        address: 'Address3',
        balance: '123,992.09 GNOT',
        type: 'PRIVATE_KEY',
      },
      {
        accountId: '4',
        name: 'Account 4',
        address: 'Address4',
        balance: '123,992.09 GNOT',
        type: 'WEB3_AUTH',
      },
    ],
    openLink: action('openLink'),
    changeAccount: action('changeAccount'),
    movePage: action('movePage'),
    lock: action('lock'),
    close: action('close'),
  },
};
