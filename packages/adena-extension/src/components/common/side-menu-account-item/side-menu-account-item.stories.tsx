import SideMenuAccountItem, { type SideMenuAccountItemProps } from './side-menu-account-item';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/common/SideMenuAccountItem',
  component: SideMenuAccountItem,
} as Meta<typeof SideMenuAccountItem>;

export const Default: StoryObj<SideMenuAccountItemProps> = {
  args: {
    account: {
      accountId: '1',
      name: 'Account 1',
      address: 'Address1',
      balance: '123,992.09 GNOT',
      type: 'HD_WALLET',
    },
    changeAccount: action('changeAccount'),
    moveGnoscan: action('moveGnoscan'),
    moveAccountDetail: action('moveAccountDetail'),
  },
};

export const Ledger: StoryObj<SideMenuAccountItemProps> = {
  args: {
    account: {
      accountId: '1',
      name: 'Account 1',
      address: 'Address1',
      balance: '123,992.09 GNOT',
      type: 'LEDGER',
    },
    changeAccount: action('changeAccount'),
    moveGnoscan: action('moveGnoscan'),
    moveAccountDetail: action('moveAccountDetail'),
  },
};

export const Import: StoryObj<SideMenuAccountItemProps> = {
  args: {
    account: {
      accountId: '1',
      name: 'Account 1',
      address: 'Address1',
      balance: '123,992.09 GNOT',
      type: 'PRIVATE_KEY',
    },
    changeAccount: action('changeAccount'),
    moveGnoscan: action('moveGnoscan'),
    moveAccountDetail: action('moveAccountDetail'),
  },
};

export const Google: StoryObj<SideMenuAccountItemProps> = {
  args: {
    account: {
      accountId: '1',
      name: 'Account 1',
      address: 'Address1',
      balance: '123,992.09 GNOT',
      type: 'WEB3_AUTH',
    },
    changeAccount: action('changeAccount'),
    moveGnoscan: action('moveGnoscan'),
    moveAccountDetail: action('moveAccountDetail'),
  },
};