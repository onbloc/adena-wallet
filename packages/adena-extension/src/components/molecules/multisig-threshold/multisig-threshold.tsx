import React from 'react';
import * as S from './multisig-threshold.styles';

interface MultisigThresholdProps {
  threshold: number;
}

const MultisigThreshold = ({ threshold }: MultisigThresholdProps): React.ReactElement => {
  return (
    <S.MultisigThresholdContainer>
      <S.MultisigThresholdWrapper>
        <span className='key'>{'Threshold'}</span>

        <div className='document-signers-amount-wrapper'>
          <span className='value'>{threshold}</span>
        </div>
      </S.MultisigThresholdWrapper>
    </S.MultisigThresholdContainer>
  );
};

export default MultisigThreshold;
