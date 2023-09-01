import React, { useCallback, useMemo } from 'react';
import { ApproveChangingNetworkWrapper } from './approve-changing-network.styles';
import BottomFixedButtonGroup from '@components/buttons/bottom-fixed-button-group';
import SubHeader from '@components/common/sub-header/sub-header';
import Text from '@components/text';
import theme from '@styles/theme';
import IconArrowRight from '@assets/arrowL-right-bold.svg';
import ApproveChangingNetworkItem from '../approve-changing-network-item/approve-changing-network-item';

export interface ChangingNetworkInfo {
  logo?: string;
  name: string;
}

export interface ApproveChangingNetworkProps {
  fromChain: ChangingNetworkInfo;
  toChain: ChangingNetworkInfo;
  changable: boolean;
  changeNetwork: () => void;
  cancel: () => void;
}

const ApproveChangingNetwork: React.FC<ApproveChangingNetworkProps> = ({
  fromChain,
  toChain,
  changable,
  changeNetwork,
  cancel,
}) => {
  const title = useMemo(() => `Switch to ${toChain.name}`, [toChain.name])

  const onClickCancel = useCallback(() => {
    cancel();
  }, [cancel])

  const onClickSwitch = useCallback(() => {
    if (!changable) {
      return;
    }
    changeNetwork();
  }, [changable, changeNetwork])

  return (
    <ApproveChangingNetworkWrapper>
      <SubHeader title={title} />

      <div className='description-wrapper'>
        <Text
          type='body1Reg'
          color={theme.color.neutral[9]}
          textAlign='center'
        >
          {'This will switch the current network on\nAdena to the one that matches the\nconnected dapp.'}
        </Text>
      </div>

      <div className='info-wrapper'>
        <ApproveChangingNetworkItem {...fromChain} />
        <img className='icon-arrow' src={IconArrowRight} alt='arrow' />
        <ApproveChangingNetworkItem {...toChain} />
      </div>

      <BottomFixedButtonGroup
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel
        }}
        rightButton={{
          primary: true,
          disabled: changable === false,
          text: 'Switch',
          onClick: onClickSwitch
        }}
      />
    </ApproveChangingNetworkWrapper>
  );
};

export default ApproveChangingNetwork;