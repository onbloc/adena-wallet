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
import { useAccountName } from '@hooks/use-account-name';
import { useNetwork } from '@hooks/use-network';

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
  const { establishService } = useAdenaContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const [address, setAddress] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isEstablished, setIsEstablished] = useState(false);
  const location = useLocation();
  const [requestData, setReqeustData] = useState<any>();
  const { accountNames } = useAccountName();
  const { currentNetwork } = useNetwork();

  useEffect(() => {
    if (location.search) {
      const data = parseParmeters(location.search);
      setReqeustData(data);
    }
  }, [location]);

  useEffect(() => {
    if (requestData) {
      updateEstablishState();
    }
  }, [requestData, currentAccount, currentNetwork]);

  useEffect(() => {
    initAddress();
  }, [currentAccount]);

  const initAddress = async () => {
    if (!currentAccount) {
      return;
    }
    const address = currentAddress || '';
    const currentAccountName = accountNames[currentAccount.id] || currentAccount.name;
    setAddress(address);
    setAccountName(currentAccountName);
  };

  const updateEstablishState = async () => {
    if (requestData?.hostname) {
      const id = currentAccount?.id ?? "";
      const siteName = getSiteName(requestData.protocol, requestData.hostname);
      const currentIsEstablished = await establishService.isEstablishedBy(id, currentNetwork.networkId, siteName);
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
