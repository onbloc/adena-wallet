import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import AccountDetails, { type AccountDetailsProps } from '.';

export default {
  title: 'components/account-details/AccountDetails',
  component: AccountDetails,
} as Meta<typeof AccountDetails>;

export const Default: StoryObj<AccountDetailsProps> = {
  args: {
    hasPrivateKey: true,
    hasSeedPhrase: true,
    hasSessions: false,
    originName: '',
    name: '',
    address: '',
    moveGnoscan: () => action('moveGnoscan'),
    moveRevealSeedPhrase: () => action('moveRevealSeedPhrase'),
    moveExportPrivateKey: () => action('moveExportPrivateKey'),
    moveManageSessions: () => action('moveManageSessions'),
    setName: () => action('setName'),
    reset: () => action('reset'),
  },
};
