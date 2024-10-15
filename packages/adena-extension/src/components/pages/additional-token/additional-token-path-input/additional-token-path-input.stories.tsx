import { Meta, StoryObj } from '@storybook/react';
import AdditionalTokenPathInput, {
  type AdditionalTokenPathInputProps,
} from './additional-token-path-input';

export default {
  title: 'components/additional-token/AdditionalTokenPathInput',
  component: AdditionalTokenPathInput,
} as Meta<typeof AdditionalTokenPathInput>;

export const Default: StoryObj<AdditionalTokenPathInputProps> = {
  args: {},
};
