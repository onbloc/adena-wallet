import { ReactElement, useMemo } from 'react';
import { useMatch } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import styled from 'styled-components';

import IconDeposit from '@assets/icon-deposit';
import IconSend from '@assets/icon-send';
import IconSign from '@assets/icon-sign';
import { Loading, MainActionButton, SkeletonBoxStyle } from '@components/atoms';
import { WalletState } from '@states';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import { RoutePath } from '@types';

const Wrapper = styled.div`
  ${mixins.flex({ align: 'stretch', justify: 'flex-start' })};
  position: fixed;
  top: 48px;
  left: 0;
  right: 0;
  bottom: 60px;
  padding: 37px 20px 24px;
  z-index: 3;
  background-color: ${getTheme('neutral', '_8')};
  overflow-y: auto;
`;

const BalancePlaceholder = styled.div`
  ${mixins.flex({ align: 'flex-start', justify: 'center' })};
  width: 100%;
  height: 80px;
  gap: 8px;
`;

const ButtonsRow = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  gap: 8px;
  margin: 14px 0 30px;
`;

const TokenList = styled.div`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  gap: 12px;
`;

const TokenSkeletonRow = styled(SkeletonBoxStyle)`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  height: 60px;
  background-color: ${getTheme('neutral', '_9')};
  padding: 13px;
`;

const TokenInfo = styled.div`
  ${mixins.flex({ align: 'flex-start', justify: 'center' })};
  gap: 6px;
  flex: 1;
  margin-left: 12px;
`;

const TokenBalancePlaceholder = styled.div`
  ${mixins.flex({ align: 'flex-end', justify: 'center' })};
  gap: 6px;
`;

const LoadingMain = (): ReactElement => {
  const [state] = useRecoilState(WalletState.state);
  const isApproveHardwarePath = useMatch(RoutePath.WebConnectLedger + '/*');
  const isNotMatch = useMatch('/approve/wallet/*');
  const isPopupMatch = useMatch('/popup/*');

  const loading = useMemo(() => {
    if (isApproveHardwarePath || isNotMatch || isPopupMatch) {
      return false;
    }
    if (state === 'CREATE' || state === 'LOGIN' || state === 'FINISH') {
      return false;
    }
    return true;
  }, [isPopupMatch, state, isApproveHardwarePath, isNotMatch]);

  return loading ? (
    <Wrapper>
      <BalancePlaceholder>
        <Loading.Round width='180px' height='18px' radius='8px' />
        <Loading.Round width='100px' height='14px' radius='8px' />
      </BalancePlaceholder>

      <ButtonsRow>
        <MainActionButton icon={<IconDeposit />} label='Deposit' />
        <MainActionButton icon={<IconSend />} label='Send' />
        <MainActionButton icon={<IconSign />} label='Sign' />
      </ButtonsRow>

      <TokenList>
        {Array.from({ length: 3 }, (_, i) => (
          <TokenSkeletonRow key={i}>
            <Loading.Circle width='34px' height='34px' />
            <TokenInfo>
              <Loading.Round width='80px' height='10px' radius='8px' />
              <Loading.Round width='50px' height='8px' radius='8px' />
            </TokenInfo>
            <TokenBalancePlaceholder>
              <Loading.Round width='100px' height='10px' radius='8px' />
              <Loading.Round width='56px' height='8px' radius='8px' />
            </TokenBalancePlaceholder>
          </TokenSkeletonRow>
        ))}
      </TokenList>
    </Wrapper>
  ) : (
    <></>
  );
};

export default LoadingMain;
