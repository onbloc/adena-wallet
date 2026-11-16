import React, { useCallback, useEffect, useMemo } from 'react';
import { useTheme } from 'styled-components';

import IconArrowRight from '@assets/arrowL-right-bold.svg';
import { SubHeader, Text } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';
import ApproveChangingNetworkItem from '../approve-changing-network-item/approve-changing-network-item';
import { ApproveChangingNetworkWrapper } from './approve-changing-network.styles';

export interface ChangingNetworkInfo {
  logo?: string;
  name: string;
}

export interface ApproveChangingNetworkProps {
  fromChain: ChangingNetworkInfo;
  toChain: ChangingNetworkInfo;
  changeable: boolean;
  processing: boolean;
  done: boolean;
  changeNetwork: () => void;
  cancel: () => void;
  onResponse: () => void;
  onTimeout: () => void;
}

const ApproveChangingNetwork: React.FC<ApproveChangingNetworkProps> = ({
  fromChain,
  toChain,
  changeable,
  processing,
  done,
  changeNetwork,
  cancel,
  onResponse,
}) => {
  const title = useMemo(() => `Switch to ${toChain.name}`, [toChain.name]);

  const theme = useTheme();

  const onClickCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const onClickSwitch = useCallback(() => {
    if (!changeable) {
      return;
    }
    changeNetwork();
  }, [changeable, changeNetwork]);

  useEffect(() => {
    if (done) {
      onResponse();
    }
  }, [done, onResponse]);

  return (
    <ApproveChangingNetworkWrapper>
      <div className='title-container'>
        <SubHeader title={title} />

        <div className='description-wrapper'>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {
              'This will switch the current network on\nAdena to the one that matches the\nconnected dapp.'
            }
          </Text>
        </div>
      </div>

      <div className='info-wrapper'>
        <ApproveChangingNetworkItem {...fromChain} />
        <img className='icon-arrow' src={IconArrowRight} alt='arrow' />
        <ApproveChangingNetworkItem {...toChain} />
      </div>

      <BottomFixedLoadingButtonGroup
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          primary: true,
          loading: processing,
          disabled: changeable === false,
          text: 'Switch',
          onClick: onClickSwitch,
        }}
      />
    </ApproveChangingNetworkWrapper>
  );
};

export default ApproveChangingNetwork;
