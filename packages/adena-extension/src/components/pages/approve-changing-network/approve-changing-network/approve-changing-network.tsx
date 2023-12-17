import React, { useCallback, useMemo } from 'react';

import { Text, SubHeader } from '@components/atoms';
import { ApproveInjectionLoading, BottomFixedButtonGroup } from '@components/molecules';
import theme from '@styles/theme';
import IconArrowRight from '@assets/arrowL-right-bold.svg';
import { ApproveChangingNetworkWrapper } from './approve-changing-network.styles';
import ApproveChangingNetworkItem from '../approve-changing-network-item/approve-changing-network-item';

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
  onTimeout,
}) => {
  const title = useMemo(() => `Switch to ${toChain.name}`, [toChain.name]);

  const onClickCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const onClickSwitch = useCallback(() => {
    if (!changeable) {
      return;
    }
    changeNetwork();
  }, [changeable, changeNetwork]);

  if (processing) {
    return <ApproveInjectionLoading done={done} onResponse={onResponse} onTimeout={onTimeout} />;
  }

  return (
    <ApproveChangingNetworkWrapper>
      <div className='title-container'>
        <SubHeader title={title} />

        <div className='description-wrapper'>
          <Text type='body1Reg' color={theme.color.neutral[9]} textAlign='center'>
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

      <BottomFixedButtonGroup
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          primary: true,
          disabled: changeable === false,
          text: 'Switch',
          onClick: onClickSwitch,
        }}
      />
    </ApproveChangingNetworkWrapper>
  );
};

export default ApproveChangingNetwork;
