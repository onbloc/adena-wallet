import styled, { useTheme } from 'styled-components';

import IconFail from '@assets/connect-fail-permission.svg';

import { View, WebText, WebButton, WebImg } from '@components/atoms';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 552px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
  align-items: center;
`;
interface Props {
  retry: () => void;
}

export const ConnectFail = ({ retry }: Props): JSX.Element => {
  const theme = useTheme();
  return (
    <StyledContainer>
      <WebImg src={IconFail} size={64} />
      <StyledMessageBox>
        <WebText type='headline3' textCenter>
          Connection Failed
        </WebText>
        <WebText type='body4' color={theme.webNeutral._500} textCenter>
          {
            'We couldn’t connect to your ledger device.\nPlease ensure that your device is unlocked.'
          }
        </WebText>
      </StyledMessageBox>

      <WebButton
        onClick={retry}
        figure='primary'
        size='small'
        text='Retry'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default ConnectFail;
