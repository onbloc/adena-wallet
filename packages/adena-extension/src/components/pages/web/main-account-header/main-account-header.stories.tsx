import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { WebMainAccountHeader } from '.';
import { Account } from 'adena-module';

export default {
  title: 'components/pages/WebMainAccountHeader',
  component: WebMainAccountHeader,
} as Meta<typeof WebMainAccountHeader>;

const mockAccount: Account = {
  id: 'id',
  index: 1,
  type: 'HD_WALLET',
  name: 'name',
  keyringId: 'keyringId',
  publicKey: [] as unknown as Uint8Array,
  toData: () => ({
    index: 1,
    type: 'HD_WALLET',
    name: 'name',
    keyringId: 'keyringId',
    publicKey: [],
  }),
  getAddress: async () => 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
}

export const Default: StoryObj<typeof WebMainAccountHeader> = {
  args: {
    account: mockAccount,
    onClickGoBack: action('click back'),
  },
};