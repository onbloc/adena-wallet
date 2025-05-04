import styled, { useTheme } from 'styled-components';

import IconGnoLand from '@assets/web/gnoland.svg';
import IconGnoSwap from '@assets/web/gnoswap.svg';
import IconGnoScan from '@assets/web/gnoscan.svg';
import AnimationAllSet from '@assets/web/lottie/you-are-all-set.json';

import { View, WebButton, WebMain, WebText, WebImg, Row } from '@components/atoms';
import useLink from '@hooks/use-link';
import Lottie from '@components/atoms/lottie';
import IconPin from '@assets/web/pin.svg';

const StyledContainer = styled(Row)`
  flex-shrink: 0;
  width: fit-content;
  height: auto;
  column-gap: 56px;
  align-items: center;
`;

const StyledLeft = styled(View)`
  width: fit-content;
  flex-shrink: 0;
  row-gap: 28px;
  width: 604px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  row-gap: 10px;
`;

const StyledImgBox = styled(View)`
  width: 40px;
  height: 36px;
  align-items: center;
  justify-content: center;
`;

const StyledLinkBox = styled(View)`
  row-gap: 16px;
`;

const StyledBtn = styled(WebButton)`
  flex: 1;
  flex-direction: column;
  height: fit-content;
  align-items: flex-start;
  row-gap: 8px;
  padding: 20px 20px 16px 20px;
  background: #16181c;
  box-shadow: 0 0 0 1px #212429 inset;
`;

const StyledBtnTitle = styled(WebText)``;

const StyledBtnInfo = styled(WebText)``;

const StyledFixedWrapper = styled(Row)`
  position: fixed;
  top: 80px;
  right: 72px;
  align-items: flex-start;
  padding: 20px 24px 16px 24px;
  gap: 16px;
  border-radius: 24px;
  background: #181b1f;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16) inset;
  z-index: 3;
`;

const StyledPinIconWrapper = styled(View)`
  display: flex;
  width: 40px;
  height: 40px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 12px;
  background: ${({ theme }): string => theme.webPrimary._100};
  box-shadow: 0px 2px 8px 0px rgba(0, 0, 0, 0.16);
`;

const WalletAllSetScreen = (): JSX.Element => {
  const theme = useTheme();
  const { openLink } = useLink();

  const onClickDone = (): void => {
    window.close();
  };

  return (
    <WebMain spacing={null} style={{ width: 'fit-content' }}>
      <StyledContainer>
        <StyledLeft>
          <StyledMessageBox>
            <WebText type='display4'>You’re All Set!</WebText>
            <WebText type='body4' color={theme.webNeutral._500}>
              Click on the Start button to launch Adena.
            </WebText>
          </StyledMessageBox>
          <View style={{ gap: 40 }}>
            <StyledLinkBox>
              <WebText type='title3' color={theme.webNeutral._200}>
                Explore the gno.land Ecosystem
              </WebText>
              <Row style={{ columnGap: 24 }}>
                <StyledBtn
                  figure='tertiary'
                  size='large'
                  onClick={(): void => {
                    openLink('https://gno.land');
                  }}
                >
                  <StyledImgBox>
                    <WebImg src={IconGnoLand} width={40} height={36} />
                  </StyledImgBox>
                  <View style={{ width: '100%', gap: 6 }}>
                    <StyledBtnTitle type='body5' color={theme.webNeutral._500}>
                      gno.land
                    </StyledBtnTitle>
                    <StyledBtnInfo type='title6' color={theme.webNeutral._200}>
                      Visit the official website of gno.land.
                    </StyledBtnInfo>
                  </View>
                </StyledBtn>
                <StyledBtn
                  figure='tertiary'
                  size='large'
                  onClick={(): void => {
                    openLink('https://docs.gnoswap.io');
                  }}
                >
                  <StyledImgBox>
                    <WebImg src={IconGnoSwap} width={40} height={36} />
                  </StyledImgBox>
                  <View style={{ width: '100%', gap: 6 }}>
                    <StyledBtnTitle type='body5' color={theme.webNeutral._500}>
                      GnoSwap
                    </StyledBtnTitle>
                    <StyledBtnInfo type='title6' color={theme.webNeutral._200}>
                      The One-stop DeFi platform on gno.land.
                    </StyledBtnInfo>
                  </View>
                </StyledBtn>

                <StyledBtn
                  figure='tertiary'
                  size='large'
                  onClick={(): void => {
                    openLink('https://gnoscan.io');
                  }}
                >
                  <StyledImgBox>
                    <WebImg src={IconGnoScan} width={40} height={36} />
                  </StyledImgBox>
                  <View style={{ width: '100%', gap: 6 }}>
                    <StyledBtnTitle type='body5' color={theme.webNeutral._500}>
                      GnoScan
                    </StyledBtnTitle>
                    <StyledBtnInfo type='title6' color={theme.webNeutral._200}>
                      A simple & fast explorer for gno.land networks.
                    </StyledBtnInfo>
                  </View>
                </StyledBtn>
              </Row>
            </StyledLinkBox>

            <WebButton
              style={{ width: 'fit-content' }}
              figure='primary'
              size='small'
              text='Start'
              rightIcon='chevronRight'
              onClick={onClickDone}
            />
          </View>
        </StyledLeft>
        <Lottie width={416} style={{ marginTop: -100 }} animationData={AnimationAllSet} />
      </StyledContainer>

      <StyledFixedWrapper>
        <View style={{ paddingTop: 4 }}>
          <StyledPinIconWrapper>
            <WebImg src={IconPin} size={24} />
          </StyledPinIconWrapper>
        </View>
        <View style={{ width: 256, gap: 6 }}>
          <WebText type='title3' color={theme.webNeutral._100}>
            {'Pin Adena for easy access'}
          </WebText>
          <WebText type='body5' color={theme.webNeutral._500}>
            {'Click the ‘Extensions’ button\nLocate Adena then click the ‘Pin’ button'}
          </WebText>
        </View>
      </StyledFixedWrapper>
    </WebMain>
  );
};

export default WalletAllSetScreen;
