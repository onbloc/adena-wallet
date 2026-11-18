import { action } from 'storybook/actions';
import { Meta, StoryObj } from '@storybook/react-vite';
import { NetworkFeeSettingType } from '@types';
import NetworkFeeSetting, { type NetworkFeeSettingProps } from './network-fee-setting';

export default {
  title: 'components/change-network/NetworkFeeSetting',
  component: NetworkFeeSetting,
} as Meta<typeof NetworkFeeSetting>;

export const Default: StoryObj<NetworkFeeSettingProps> = {
  args: {
    networkFeeSettingType: NetworkFeeSettingType.AVERAGE,
    setNetworkFeeSetting: action('setNetworkFeeSetting'),
    networkFeeSettings: [],
    onClickBack: action('onClickBack'),
    onClickSave: action('onClickSave'),
  },
};
