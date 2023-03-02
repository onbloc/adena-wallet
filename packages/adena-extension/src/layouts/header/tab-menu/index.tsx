import React from 'react';
import Text from '@components/text';
import styled from 'styled-components';
import IconLogo from './../../../assets/logo-withIcon.svg';
import IconHelp from './../../../assets/help-fill.svg';

const Container = styled.div`
  position: absolute;
  top: 0;
  display: flex;
  width: 100%;
  height: 0;
  padding: 0;

  .wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: fit-content;
    background-color: ${({ theme }) => theme.color.neutral[8]};
    padding: 40px;
  }

  .section {
    display: flex;
    flex-direction: row;
  }

  .icon {
    padding: 0 7px;
  }

  .help {
    cursor: pointer;
  }
`;


export const TabMenu = () => {

  const onClickHelp = () => {
    chrome.tabs.create({ url: "https://docs.adena.app/resources/faq" });
  };

  return (
    <Container>
      <div className='wrapper'>
        <div className='logo section'>
          <img className='icon' src={IconLogo} alt='logo-image' />
        </div>
        <div className='help section' onClick={onClickHelp}>
          <img className='icon' src={IconHelp} alt='logo-image' />
          <Text type='body1Bold'>{"Help"}</Text>
        </div>
      </div>
    </Container>
  );
};
