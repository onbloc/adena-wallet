import React from 'react';
import * as S from './multisig-threshold.styles';

type SignatureStatus = 'insufficient' | 'ready';

interface MultisigBroadcastThresholdProps {
  threshold: number;
  signedCount: number;
}

const MultisigBroadcastThreshold = ({
  signedCount,
  threshold,
}: MultisigBroadcastThresholdProps): React.ReactElement => {
  const status: SignatureStatus = React.useMemo(() => {
    return signedCount >= threshold ? 'ready' : 'insufficient';
  }, [signedCount, threshold]);

  const statusMessage = React.useMemo(() => {
    if (status === 'insufficient') {
      const remaining = threshold - signedCount;
      return `Need ${remaining} more ${remaining === 1 ? 'signature' : 'signatures'}`;
    }

    return `Ready to broadcast (${signedCount}/${threshold})`;
  }, [status, signedCount, threshold]);
  return (
    <S.MultisigThresholdContainer>
      <S.MultisigThresholdWrapper>
        <span className='key'>{'Threshold'}</span>

        <div className='document-signers-amount-wrapper'>
          <span className={`value status-${status}`}>{statusMessage}</span>
        </div>
      </S.MultisigThresholdWrapper>
    </S.MultisigThresholdContainer>
  );
};

export default MultisigBroadcastThreshold;
