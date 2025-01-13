import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { NetworkFeeSettingType } from '@types';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NetworkFeeSetting, { NetworkFeeSettingProps } from './network-fee-setting';

describe('NetworkFeeSetting Component', () => {
  it('NetworkFeeSetting render', () => {
    const args: NetworkFeeSettingProps = {
      gasPriceRatio: '1.5',
      setGasPriceRatio: () => {
        return;
      },
      networkFeeSettingType: NetworkFeeSettingType.AVERAGE,
      changedGasPrice: {
        amount: '0.0001',
        denom: 'ugnot',
      },
      setNetworkFeeSetting: () => {
        return;
      },
      networkFeeSettings: [],
      onClickBack: () => {
        return;
      },
      onClickSave: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NetworkFeeSetting {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
