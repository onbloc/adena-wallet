import WalletConnect, { type WalletConnectProps } from './wallet-connect';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';

export default {
  title: 'components/approve/WalletConnect',
  component: WalletConnect,
} as Meta<typeof WalletConnect>;

export const Default: StoryObj<WalletConnectProps> = {
  args: {
    domain: '',
    loading: true,
    logo: '',
    app: '',
    processing: true,
    done: false,
    onClickConnect: action('cancel'),
    onClickCancel: action('connect'),
    onResponse: action('response'),
    onTimeout: action('timeout'),
  },
};