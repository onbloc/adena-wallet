import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

import { getTheme } from '@styles/theme';
import { Text, CopyTooltip, StatusDot } from '@components/atoms';
import {
  formatAddress,
  formatNickname,
  getSiteName,
  parseParameters,
} from '@common/utils/client-utils';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useAdenaContext } from '@hooks/use-context';
import { useAccountName } from '@hooks/use-account-name';
import { useNetwork } from '@hooks/use-network';
import mixins from '@styles/mixins';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  padding: 0px 20px 0px 12px;
  border-bottom: 1px solid ${getTheme('neutral', '_7')};
  ${mixins.flex('row', 'center', 'flex-end')};
  .t-approve {
    ${mixins.positionCenter()}
  }
`;

const ApproveMenu = (): JSX.Element => {
  const theme = useTheme();
  const { establishService } = useAdenaContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const [address, setAddress] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isEstablished, setIsEstablished] = useState(false);
  const location = useLocation();
  const [requestData, setRequestData] = useState<any>();
  const { accountNames } = useAccountName();
  const { currentNetwork } = useNetwork();

  useEffect(() => {
    if (location.search) {
      const data = parseParameters(location.search);
      setRequestData(data);
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

  const initAddress = async (): Promise<void> => {
    if (!currentAccount) {
      return;
    }
    const address = currentAddress || '';
    const currentAccountName = accountNames[currentAccount.id] || currentAccount.name;
    setAddress(address);
    setAccountName(currentAccountName);
  };

  const updateEstablishState = async (): Promise<void> => {
    if (requestData?.hostname) {
      const id = currentAccount?.id ?? '';
      const siteName = getSiteName(requestData.protocol, requestData.hostname);
      const currentIsEstablished = await establishService.isEstablishedBy(id, siteName);
      setIsEstablished(currentIsEstablished);
    }
  };

  const getTooltipText = (): string => {
    let currentHostname = requestData?.hostname ?? '';
    if (currentHostname.startsWith('chrome-extension') || !currentHostname.includes('.')) {
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
              <Text type='body1Reg' color={theme.neutral.a} style={{ whiteSpace: 'pre' }}>
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
