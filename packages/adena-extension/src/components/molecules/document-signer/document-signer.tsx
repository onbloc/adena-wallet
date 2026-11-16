import React from 'react';
import * as S from './document-signer.styles';

import IconRight from '@assets/icon-right';

interface DocumentSignerProps {
  signerCount: number;
  onClickSetting?: () => void;
}

const DocumentSigner = ({
  signerCount,
  onClickSetting,
}: DocumentSignerProps): React.ReactElement => {
  const hasSetting = !!onClickSetting;
  return (
    <S.DocumentSignersContainer>
      <S.DocumentSignersWrapper>
        <span className='key'>{'Signer'}</span>

        <div className='document-signers-amount-wrapper'>
          <span className='value'>{signerCount}</span>
          {hasSetting && (
            <button className='setting-button' onClick={onClickSetting}>
              <IconRight />
            </button>
          )}
        </div>
      </S.DocumentSignersWrapper>
    </S.DocumentSignersContainer>
  );
};

export default DocumentSigner;
