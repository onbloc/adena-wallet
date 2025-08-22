import { Meta, StoryObj } from '@storybook/react';
import StorageDeposit, { type StorageDepositProps } from './storage-deposit';

export default {
  title: 'components/common/StorageDeposit',
  component: StorageDeposit,
} as Meta<typeof StorageDeposit>;

export const Default: StoryObj<StorageDepositProps> = {
  args: {
    storageDeposit: {
      storageDeposit: 0.0048,
      unlockDeposit: 0,
    },
    isLoading: false,
    isError: false,
    errorMessage: '',
  },
};
