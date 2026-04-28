import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import styled, { useTheme } from 'styled-components';

import disconnected from '@assets/disconnected.svg';
import DefaultImage from '@assets/favicon-default-small.svg';
import { ListBox, ListHierarchy, Text } from '@components/atoms';
import { CloseShadowButton, LoadingNft } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { EstablishSite } from '@repositories/wallet';
import { WalletState } from '@states';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

// `source` disambiguates which service owns the entry so disconnect routes to
// the matching repository. AtomOne entries carry a concrete chainId (e.g.
// `atomone-1`) that the service's sibling-chain revoke logic expects.
type EnrichedSite = EstablishSite & { source: 'gno' | 'cosmos' };

export const ConnectedApps = (): JSX.Element => {
  const theme = useTheme();
  const { establishService, establishAtomOneService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { goBack } = useAppNavigate();
  const [state] = useRecoilState(WalletState.state);
  const [data, setData] = useState<EnrichedSite[]>([]);

  useEffect(() => {
    updateData();
  }, []);

  const onClickDisconnect = async (item: EnrichedSite): Promise<void> => {
    if (!currentAccount) {
      return;
    }
    if (item.source === 'cosmos') {
      await establishAtomOneService.unEstablishBy(
        currentAccount.id,
        item.hostname,
        item.chainId,
      );
    } else {
      await establishService.unEstablishBy(currentAccount.id, item.hostname);
    }
    await updateData();
  };

  const updateData = async (): Promise<void> => {
    if (!currentAccount) {
      return;
    }
    const [gnoSites, cosmosSites] = await Promise.all([
      establishService.getEstablishedSitesBy(currentAccount.id),
      establishAtomOneService.getEstablishedSitesBy(currentAccount.id),
    ]);
    const merged: EnrichedSite[] = [
      ...gnoSites.map((site) => ({ ...site, source: 'gno' as const })),
      ...cosmosSites.map((site) => ({ ...site, source: 'cosmos' as const })),
    ];
    setData(merged);
  };

  const renderAppItem = (item: EnrichedSite, index: number): JSX.Element => {
    return (
      <ListBox
        left={
          <img
            className='logo'
            src={item.favicon !== null ? item.favicon : DefaultImage}
            alt='logo image'
          />
        }
        center={
          <div className='connected-center'>
            <Text type='body2Bold' className='connected-hostname'>
              {item.hostname}
            </Text>
            {item.source === 'cosmos' && (
              <Text type='captionReg' className='connected-chain' color={theme.neutral.a}>
                {item.chainId}
              </Text>
            )}
          </div>
        }
        right={
          <DisconnectedBtn onClick={(): Promise<void> => onClickDisconnect(item)}>
            <img src={disconnected} alt='disconnected button' />
          </DisconnectedBtn>
        }
        cursor='default'
        hoverAction={false}
        key={`${item.source}:${item.hostname}:${item.chainId}:${index}`}
        mode={ListHierarchy.Static}
      />
    );
  };

  return (
    <Wrapper>
      <Text type='header4' margin='0px 0px 12px'>
        Connected Apps
      </Text>
      {state === 'FINISH' ? (
        <>
          {data.length > 0 ? (
            data.map(renderAppItem)
          ) : (
            <Text className='desc' type='body1Reg' color={theme.neutral.a}>
              No connections
            </Text>
          )}

          <div className='empty-box' />

          <CloseShadowButton onClick={goBack} />
        </>
      ) : (
        <LoadingNft />
      )}
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 120px;
  background-color: ${getTheme('neutral', '_8')};

  .logo {
    width: 20px;
    height: 20px;
    margin-right: 8px;
  }

  .desc {
    position: absolute;
    top: 210px;
    left: 0px;
    width: 100%;
    text-align: center;
  }

  .connected-hostname {
    max-width: 234px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .connected-center {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .connected-chain {
    opacity: 0.7;
  }

  .empty-box {
    ${mixins.flex({ direction: 'row' })};
    flex-shrink: 0;
    width: 100%;
    height: 96px;
    margin-top: 20px;
  }
`;

const DisconnectedBtn = styled.button`
  ${mixins.flex({ direction: 'row' })};
  flex-shrink: 0;
  width: 25px;
  height: 25px;
  border-radius: 35px;
  background-color: ${getTheme('red', '_5')};
  transition: all ease 0.4s;
  margin-left: auto;
  &:hover {
    background-color: #bb160b;
  }
`;
