import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Circle, GhostButtons, Round } from '@components/loadings';
import { SkeletonBoxStyle } from '@components/loadings';
import { useMatch } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { useTokenBalance } from '@hooks/use-token-balance';
import { useRecoilState } from 'recoil';
import { CommonState, WalletState } from '@states/index';
import { useNetwork } from '@hooks/use-network';

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'stretch')};
  position: absolute;
  width: 100%;
  height: 100%;
  padding: 78px 24px;
  top: 0px;
  z-index: 99;
  background-color: ${({ theme }) => theme.color.neutral[7]};
`;

const RoundsBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-end', 'center')};
  margin-left: auto;
`;

const ListBoxWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')}
  width: 100%;
  gap: 12px;
  margin-top: 31px;
`;

const SkeletonBox = styled(SkeletonBoxStyle)`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'flex-start')}
  width: 100%;
  height: 60px;
`;

const LoadingMain = () => {
  const [state] = useRecoilState(WalletState.state);
  const { currentNetwork } = useNetwork();
  const [failedNetwork] = useRecoilState(CommonState.failedNetwork);
  const isApproveHardwarePath = useMatch(RoutePath.ApproveHardwareWalletConnect + '/*');
  const { displayTokenBalances } = useTokenBalance();
  const isNotMatch = useMatch('/approve/wallet/*');
  const isPopupMatch = useMatch('/popup/*');

  const isLoading = useCallback(() => {
    if (isApproveHardwarePath || isNotMatch || isPopupMatch) {
      return false;
    }
    if (state === 'NONE' || state === 'LOADING') {
      return true;
    }
    if (failedNetwork[currentNetwork.id] === true) {
      return false;
    }
    if (state === 'FINISH' && (displayTokenBalances.length === 0)) {
      return true;
    }
    return false;
  }, [state, isApproveHardwarePath, isNotMatch, displayTokenBalances, failedNetwork, currentNetwork]);

  return isLoading() ? (
    <Wrapper>
      <Round width='163px' height='14px' radius='24px' />
      <Round width='91px' height='14px' radius='24px' margin='36px 0px 31px' />
      <GhostButtons left='Deposit' right='Send' />
      <ListBoxWrap>
        {Array.from({ length: 3 }, (v, i) => (
          <SkeletonBox key={i}>
            <Circle width='34px' height='34px' margin='0px 15px 0px 0px' />
            <Round width='91px' height='10px' radius='24px' />
            <RoundsBox>
              <Round width='100px' height='10px' radius='24px' />
              <Round width='58px' height='10px' radius='24px' margin='10px 0px 0px' />
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
