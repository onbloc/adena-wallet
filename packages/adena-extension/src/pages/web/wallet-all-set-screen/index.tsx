import styled, { useTheme } from 'styled-components';

import IconGnoLand from '@assets/web/gnoland.svg';
import IconGnoSwap from '@assets/web/gnoswap.svg';
import IconGnoScan from '@assets/web/gnoscan.svg';
// import AnimationAllSet from '@assets/web/all-set.gif';
import AnimationAllSet from '@assets/web/lottie/you-are-all-set.json';

import { View, WebButton, WebMain, WebText, WebImg, Row } from '@components/atoms';
import useLink from '@hooks/use-link';
import Lottie from '@components/atoms/lottie';

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
  height: 30px;
  align-items: center;
  justify-content: center;
`;

const StyledLinkBox = styled(View)`
  row-gap: 20px;
`;

const StyledBtn = styled(WebButton)`
  flex: 1;
  flex-direction: column;
  height: fit-content;
  align-items: flex-start;
  row-gap: 12px;
  padding: 20px;
  background: #16181c;
  box-shadow: 0 0 0 1px #212429 inset;
`;

const StyledBtnTitle = styled(WebText)`
  font-size: 15px;
  font-weight: 400;
  line-height: 20px; /* 133.333% */
  letter-spacing: -0.3px;
`;

const StyledBtnInfo = styled(WebText)`
  font-size: 12px;
  font-weight: 600;
  line-height: 18px; /* 150% */
  letter-spacing: -0.24px;
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
                Explore the Gnoland Ecosystem
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
                  <View style={{ width: '100%' }}>
                    <StyledBtnTitle type='body5' color={theme.webNeutral._500}>
                      Gno.land
                    </StyledBtnTitle>
                    <StyledBtnInfo type='title6' color={theme.webNeutral._200}>
                      Visit the official website for the Gno.land project.
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
                  <View style={{ width: '100%' }}>
                    <StyledBtnTitle type='body5' color={theme.webNeutral._500}>
                      Gnoswap
                    </StyledBtnTitle>
                    <StyledBtnInfo type='title6' color={theme.webNeutral._200}>
                      Swap & earn in the most capital efficient DEX.
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
                  <View style={{ width: '100%' }}>
                    <StyledBtnTitle type='body5' color={theme.webNeutral._500}>
                      Gnoscan
                    </StyledBtnTitle>
                    <StyledBtnInfo type='title6' color={theme.webNeutral._200}>
                      A simple & fast explorer for Gno.land networks.
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
        <Lottie
          width={416}
          animationData={AnimationAllSet}
        />
      </StyledContainer>
    </WebMain>
  );
};

export default WalletAllSetScreen;
