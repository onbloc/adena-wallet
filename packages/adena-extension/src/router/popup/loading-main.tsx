import React, { ReactElement, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import styled from 'styled-components';
import { useMatch } from 'react-router-dom';

import { Loading, SkeletonBoxStyle } from '@components/atoms';
import { RoutePath } from '@types';
import { useTokenBalance } from '@hooks/use-token-balance';
import { CommonState, WalletState } from '@states';
import { useNetwork } from '@hooks/use-network';
import { GhostButtons } from '@components/molecules';
import { getTheme } from '@styles/theme';
import mixins from '@styles/mixins';

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'stretch' })};
  position: absolute;
  width: 100%;
  height: 100%;
  padding: 78px 24px;
  top: 0px;
  z-index: 99;
  background-color: ${getTheme('neutral', '_8')};
`;

const RoundsBox = styled.div`
  ${mixins.flex({ align: 'flex-end' })};
  margin-left: auto;
`;

const ListBoxWrap = styled.div`
  ${mixins.flex({ justify: 'flex-start' })}
  width: 100%;
  gap: 12px;
  margin-top: 31px;
`;

const SkeletonBox = styled(SkeletonBoxStyle)`
  ${mixins.flex({ direction: 'row', justify: 'flex-start' })}
  width: 100%;
  height: 60px;
`;

const LoadingMain = (): ReactElement => {
  const [state] = useRecoilState(WalletState.state);
  const { currentNetwork } = useNetwork();
  const [failedNetwork] = useRecoilState(CommonState.failedNetwork);
  const isApproveHardwarePath = useMatch(RoutePath.WebConnectLedger + '/*');
  const { currentBalances } = useTokenBalance();
  const isNotMatch = useMatch('/approve/wallet/*');
  const isPopupMatch = useMatch('/popup/*');

  const loading = useMemo(() => {
    if (isApproveHardwarePath || isNotMatch || isPopupMatch) {
      return false;
    }
    if (state === 'CREATE' || state === 'LOGIN') {
      return false;
    }
    if (state === 'FINISH') {
      if (failedNetwork[currentNetwork.id] === true) {
        return false;
      } else if (failedNetwork[currentNetwork.id] === false) {
        if (currentBalances.length > 0) {
          return false;
        }
      }
    }
    return true;
  }, [state, currentBalances, failedNetwork, currentNetwork.rpcUrl, useMatch]);

  return loading ? (
    <Wrapper>
      <Loading.Round width='163px' height='14px' radius='24px' />
      <Loading.Round width='91px' height='14px' radius='24px' margin='36px 0px 31px' />
      <GhostButtons left='Deposit' right='Send' />
      <ListBoxWrap>
        {Array.from({ length: 3 }, (v, i) => (
          <SkeletonBox key={i}>
            <Loading.Circle width='34px' height='34px' margin='0px 15px 0px 0px' />
            <Loading.Round width='91px' height='10px' radius='24px' />
            <RoundsBox>
              <Loading.Round width='100px' height='10px' radius='24px' />
              <Loading.Round width='58px' height='10px' radius='24px' margin='10px 0px 0px' />
            </RoundsBox>
          </SkeletonBox>
        ))}
      </ListBoxWrap>
    </Wrapper>
  ) : (
    <></>
  );
};

export default LoadingMain;
