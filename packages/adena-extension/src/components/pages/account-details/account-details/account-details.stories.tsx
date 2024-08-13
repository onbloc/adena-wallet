import AccountDetails, { type AccountDetailsProps } from '.';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/account-details/AccountDetails',
  component: AccountDetails,
} as Meta<typeof AccountDetails>;

export const Default: StoryObj<AccountDetailsProps> = {
  args: {
    hasPrivateKey: true,
    originName: '',
    name: '',
    address: '',
    dns: '',
    moveGnoscan: () => action('moveGnoscan'),
    moveExportPrivateKey: () => action('moveExportPrivateKey'),
    setName: () => action('setName'),
    reset: () => action('reset'),
  },
};
