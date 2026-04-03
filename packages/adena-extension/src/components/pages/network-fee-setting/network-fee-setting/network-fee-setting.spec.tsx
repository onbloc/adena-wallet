import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { NetworkFeeSettingType } from '@types';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

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
      }
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NetworkFeeSetting {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
