import React from 'react';
import * as S from './document-signer-list.styles';

import { SubHeader } from '@components/atoms';
import ArrowLeftIcon from '@assets/arrowL-left.svg';

interface DocumentSignerListProps {
  signerAddresses: string[];
  onClickBack: () => void;
}

const DocumentSignerList = ({ signerAddresses, onClickBack }: DocumentSignerListProps) => {
  return (
    <S.DocumentSignerListWrapper>
      <SubHeader
        title='Document Signers'
        leftElement={{
          onClick: onClickBack,
          element: <img src={`${ArrowLeftIcon}`} alt={'back image'} />,
        }}
      />

      <div className='content-wrapper'>test</div>
    </S.DocumentSignerListWrapper>
  );
};

export default DocumentSignerList;
