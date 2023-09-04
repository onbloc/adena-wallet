import SideMenuAccountList, { type SideMenuAccountListProps } from './side-menu-account-list';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/common/SideMenuAccountList',
  component: SideMenuAccountList,
} as Meta<typeof SideMenuAccountList>;

export const Default: StoryObj<SideMenuAccountListProps> = {
  args: {
    accounts: [{
      accountId: '1',
      name: 'Account 1',
      address: 'Address1',
      balance: '123,992.09 GNOT',
      type: 'HD_WALLET',
    }, {
      accountId: '2',
      name: 'Account 2',
      address: 'Address2',
      balance: '123,992.09 GNOT',
      type: 'LEDGER',
    }, {
      accountId: '3',
      name: 'Account 3',
      address: 'Address3',
      balance: '123,992.09 GNOT',
      type: 'PRIVATE_KEY',
    }, {
      accountId: '4',
      name: 'Account 4',
      address: 'Address4',
      balance: '123,992.09 GNOT',
      type: 'WEB3_AUTH',
    }],
    changeAccount: action('changeAccount'),
    moveGnoscan: action('moveGnoscan'),
    moveAccountDetail: action('moveAccountDetail'),
  },
};