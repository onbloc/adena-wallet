import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import MemoInput, { type MemoInputProps } from './memo-input';

export default {
  title: 'components/transfer/MemoInput',
  component: MemoInput,
} as Meta<typeof MemoInput>;

export const Default: StoryObj<MemoInputProps> = {
  args: {
    memo: '132123123123',
    onChangeMemo: action('change memo'),
  },
};
