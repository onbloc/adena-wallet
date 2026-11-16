import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { NetworkFeeSettingType } from '@types';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import NetworkFeeSetting, { NetworkFeeSettingProps } from './network-fee-setting';

describe('NetworkFeeSetting Component', () => {
  it('NetworkFeeSetting render', () => {
    const args: NetworkFeeSettingProps = {
      gasAdjustment: '1.5',
      isFetchedPriceTiers: true,
      setGasAdjustment: () => {
        return;
      },
      networkFeeSettingType: NetworkFeeSettingType.AVERAGE,
      changedGasInfo: null,
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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NetworkFeeSetting {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
