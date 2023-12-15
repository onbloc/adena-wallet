import React from 'react';
import Text from '@components/text';
import styled, { CSSProp } from 'styled-components';
import IconLogo from '../../../../../install/assets/logo-typeB.svg';
import IconHelp from '@assets/help-fill.svg';

const Container = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'space-between')}
  position: absolute;
  top: 0;
  display: flex;
  width: 100%;
  height: 0;
  padding: 0;
  width: 100%;
  height: fit-content;
  background-color: ${({ theme }): string => theme.color.neutral[8]};
  padding: 40px 40px 0px;
  .help-text {
    font-size: 19px;
  }
  .help-btn {
    ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')}
    font-size: 19px;
    font-weight: 600;
    line-height: 24px;
    cursor: pointer;
  }

  .help-btn:before {
    content: '';
    display: inline-block;
    background: url(${IconHelp}) no-repeat center left / 100% 100%;
    width: 19px;
    height: 19px;
    margin-right: 7px;
  }
`;

export const TabMenu = (): JSX.Element => {
  const onClickHelp = (): void => {
    chrome.tabs.create({ url: 'https://docs.adena.app/resources/faq' });
  };

  return (
    <Container>
      <img className='logo' src={IconLogo} alt='logo' />
      <div className='help-btn' onClick={onClickHelp}>
        <Text type='body1Bold' className='help-text'>
          Help
        </Text>
      </div>
    </Container>
  );
};
