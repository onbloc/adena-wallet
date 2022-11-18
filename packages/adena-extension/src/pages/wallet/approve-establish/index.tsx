import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import check from '../../../assets/check-circle.svg';
import DefaultFavicon from './../../../assets/favicon-default.svg';
import Text from '@components/text';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import theme from '@styles/theme';
import { WalletService } from '@services/index';
import { createFaviconByHostname, decodeParameter, parseParmeters } from '@common/utils/client-utils';
import { InjectionMessageInstance } from '@inject/message';
import { useLocation } from 'react-router-dom';

export const ApproveEstablish = () => {
  const [key, setKey] = useState<string>('');
  const [appName, setAppName] = useState<string>('');
  const [hostname, setHostname] = useState<string>('');
  const [favicon, setFavicon] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    initRequestSite();
  }, [window.location]);

  const initRequestSite = async () => {
    try {
      const data = parseParmeters(location.search);
      setKey(data['key']);
      setHostname(data['hostname']);
      updateFavicon(data['hostname']);
      if (data?.data) {
        const message = decodeParameter(data.data);
        setAppName(message?.data?.name ?? 'Unknown');
      }
    } catch (e) {
      console.log(e);
    }
  }

  const updateFavicon = async (hostname: string) => {
    const faviconData = await createFaviconByHostname(hostname);
    setFavicon(faviconData);
  }

  const onClickCancleButton = () => {
    window.close();
  }

  const onClickConfirmButton = async () => {
    await WalletService.establish(hostname, appName, favicon);
    chrome.runtime.sendMessage(InjectionMessageInstance.success('CONNECTION_SUCCESS', {}, key));
  }

  return (
    <Wrapper>
      <Text className='main-title' type='header4'>
        {`Connect to ${(appName && appName !== '') ? appName : 'Unknown'}`}
      </Text>
      <img className='logo' src={favicon !== null ? favicon : DefaultFavicon} alt='gnoland-logo' />
      <UrlBox>
        <Text type='body2Reg'>{hostname}</Text>
      </UrlBox>
      <AllowSiteWrap>
        <Text className='allow-title' type='body2Bold' color={theme.color.neutral[9]}>
          Allow this site to:
        </Text>
        <Divider />
        <InfoBox>
          <Text className='info-text' type='body2Reg'>
            See your address, balance and activity
          </Text>
          <Text className='info-text' type='body2Reg'>
            Suggest transactions to approve
          </Text>
        </InfoBox>
      </AllowSiteWrap>
      <Text type='captionReg' color={theme.color.neutral[9]}>
        Only connect to websites you trust.
      </Text>
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: onClickCancleButton }}
        confirmButtonProps={{
          onClick: onClickConfirmButton,
          text: 'Connect',
        }}
      />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  overflow-y: auto;
  align-self: center;
  .main-title {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
    text-align: center;
  }
  .logo {
    margin: 24px auto;
    width: 100px;
    height: auto;
  }
`;

const UrlBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  width
  : 100%;
  height: 41px;
  border-radius: 24px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  padding: 0px 18px;
`;

const AllowSiteWrap = styled.div`
  width: 100%;
  margin: 12px 0px 4px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
  .allow-title {
    padding: 12px 12px 8px;
  }
`;

const InfoBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'center')};
  width: 100%;
  padding: 12px;
  gap: 8px;
  .info-text {
    position: relative;
    padding-left: 24px;
    :before {
      content: '';
      width: 16px;
      height: 16px;
      background-image: url(${check});
      ${({ theme }) => theme.mixins.posTopCenterLeft()}
    }
  }
`;

const Divider = styled.div`
  width: 100%;
  height: 2px;
  background-color: ${({ theme }) => theme.color.neutral[7]};
`;
