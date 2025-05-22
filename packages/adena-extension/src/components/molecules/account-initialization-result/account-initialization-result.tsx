import React from 'react';

import { BottomFixedButton, BottomFixedButtonGroup, TitleWithDesc } from '@components/molecules';
import { AccountInitializationResultWrapper } from './account-initialization-result.styles';

import IconAccountInitializeFailed from '@assets/icon-account-initialize-failed';
import IconAccountInitializeSuccess from '@assets/icon-account-initialize-success';

export interface AccountInitializationResultProps {
  state: 'LOADING' | 'SUCCESS' | 'FAILURE';
  moveInit: () => void;
  moveBack: () => void;
}

const loadingImageMap = {
  LOADING: <IconAccountInitializeSuccess />,
  SUCCESS: <IconAccountInitializeSuccess />,
  FAILURE: <IconAccountInitializeFailed />,
};

const contentMap = {
  LOADING: {
    title: 'Initializing...',
    desc: 'Please wait a bit.\nYour transaction will show up soon.',
  },
  SUCCESS: {
    title: 'Initialization Success',
    desc: 'Please wait a bit.\nYour transaction will show up soon.',
  },
  FAILURE: {
    title: 'Initialization Failed',
    desc: 'Your account has failed to be\nregistered on chain. Please try again.',
  },
};

const AccountInitializationResult: React.FC<AccountInitializationResultProps> = ({
  state,
  moveInit,
  moveBack,
}) => {
  return (
    <AccountInitializationResultWrapper>
      <div className='image-wrapper'>{loadingImageMap[state]}</div>

      <div className='content-wrapper'>
        <TitleWithDesc
          className='content'
          title={contentMap[state].title}
          desc={contentMap[state].desc}
        />
      </div>

      {state === 'FAILURE' ? (
        <BottomFixedButtonGroup
          leftButton={{
            text: 'Cancel',
            onClick: moveBack,
          }}
          rightButton={{ text: 'Retry', primary: true, onClick: moveInit }}
        />
      ) : (
        <BottomFixedButton fill={false} text='Cancel' onClick={moveBack} />
      )}
    </AccountInitializationResultWrapper>
  );
};

export default AccountInitializationResult;
