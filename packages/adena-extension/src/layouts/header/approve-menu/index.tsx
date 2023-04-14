import React, { useEffect, useState } from 'react';
import theme from '@styles/theme';
import Text from '@components/text';
import styled from 'styled-components';
import { CopyTooltip } from '@components/tooltips';
import { StatusDot } from '@components/status-dot';
import { formatAddress, formatNickname, getSiteName, parseParmeters } from '@common/utils/client-utils';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useLocation } from 'react-router-dom';
import { useAdenaContext } from '@hooks/use-context';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  padding: 0px 20px 0px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.color.neutral[6]};
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'flex-end')};
  .t-approve {
    ${({ theme }) => theme.mixins.positionCenter()}
  }
`;

const ApproveMenu = () => {
  const { accountService, establishService } = useAdenaContext();
  const [currentAccount, , changeCurrentAccount] = useCurrentAccount();
  const [address, setAddress] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isEstablished, setIsEstablished] = useState(false);
  const location = useLocation();
  const [requestData, setReqeustData] = useState<any>();

  useEffect(() => {
    if (location.search) {
      const data = parseParmeters(location.search);
      setReqeustData(data);
      // changeCurrentAccount();
    }
  }, [location]);

  useEffect(() => {
    if (requestData) {
      updateEstablishState();
    }
  }, [requestData]);

  useEffect(() => {
    initAddress();
  }, []);

  useEffect(() => {
    if (currentAccount?.getAddress('g')) {
      setAddress(currentAccount.getAddress('g'));
      setAccountName(currentAccount.name);
    }
  }, [currentAccount?.getAddress('g')]);

  const initAddress = async () => {
    const currentAccount = await accountService.getCurrentAccount();
    const currentAddress = currentAccount.getAddress('g');
    const currentAccountName = currentAccount.name;
    setAddress(currentAddress);
    setAccountName(currentAccountName);
  };

  const updateEstablishState = async () => {
    if (requestData?.hostname) {
      const address = currentAccount?.getAddress('g') ?? "";
      const siteName = getSiteName(requestData.hostname);
      const currentIsEstablished = await establishService.isEstablished(siteName, address);
      setIsEstablished(currentIsEstablished);
    }
  };

  const getTooltipText = () => {
    let currentHostname = requestData?.hostname ?? '';
    if (currentHostname.startsWith("chrome-extension") || !currentHostname.includes('.')) {
      currentHostname = 'chrome-extension';
    }
    return isEstablished
      ? `You are connected to ${currentHostname}`
      : `You are not connected to ${currentHostname}`;
  };

  return (
    <Wrapper>
      {address && (
        <>
          <CopyTooltip copyText={address} className='t-approve'>
            <Text type='body1Bold' display='inline-flex' style={{ whiteSpace: 'pre' }}>
              {formatNickname(accountName, 12)}
              <Text type='body1Reg' color={theme.color.neutral[9]} style={{ whiteSpace: 'pre' }}>
                {` (${formatAddress(address)})`}
              </Text>
            </Text>
          </CopyTooltip>
          <StatusDot status={isEstablished} tooltipText={getTooltipText()} />
        </>
      )}
    </Wrapper>
  );
};

export default ApproveMenu;
