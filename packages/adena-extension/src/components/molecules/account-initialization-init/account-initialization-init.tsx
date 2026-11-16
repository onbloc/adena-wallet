import UnknownAccountImage from '@assets/common-unknown-logo.svg';
import { formatAddress } from '@common/utils/client-utils';
import { SubHeader } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';
import React, { useMemo } from 'react';
import { AccountInitializationInitWrapper } from './account-initialization-init.styles';

export interface AccountInitializationInitProps {
  address: string;
  moveRequest: () => void;
  moveBack: () => void;
}

const AccountInitializationInit: React.FC<AccountInitializationInitProps> = ({
  address,
  moveRequest,
  moveBack,
}) => {
  const displayAddress = useMemo(() => {
    return formatAddress(address, 14);
  }, [address]);

  return (
    <AccountInitializationInitWrapper>
      <SubHeader title='Account Initialization' />

      <div className='image-wrapper'>
        <img src={UnknownAccountImage} alt='account-initialization' />
      </div>

      <div className='content-wrapper'>
        <div className='address-box'>{displayAddress}</div>

        <div className='warning-box'>
          {
            'Your account needs to be registered on-chain before you can send transactions on Gno.land. After the initialization, your transaction message will show up shortly.'
          }
        </div>
      </div>

      <BottomFixedButtonGroup
        leftButton={{
          text: 'Cancel',
          onClick: moveBack,
        }}
        rightButton={{
          text: 'Confirm',
          primary: true,
          onClick: moveRequest,
        }}
      />
    </AccountInitializationInitWrapper>
  );
};

export default AccountInitializationInit;
