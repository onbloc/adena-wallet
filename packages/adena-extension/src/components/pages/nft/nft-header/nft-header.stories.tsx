import { action } from 'storybook/actions';
import { Meta, StoryObj } from '@storybook/react-vite';
import NFTHeader, { type NFTHeaderProps } from './nft-header';

export default {
  title: 'components/nft/NFTHeader',
  component: NFTHeader,
} as Meta<typeof NFTHeader>;

export const Default: StoryObj<NFTHeaderProps> = {
  args: {
    moveDepositPage: action('moveDepositPage'),
    openGnoscan: action('openGnoscan'),
  },
};
