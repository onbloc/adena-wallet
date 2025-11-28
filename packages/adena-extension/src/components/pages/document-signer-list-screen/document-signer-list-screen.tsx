import React from 'react';
import * as S from './document-signer-list-screen.styles';

import { SubHeader } from '@components/atoms';
import ArrowLeftIcon from '@assets/arrowL-left.svg';
import DocumentSignerList from '@components/molecules/document-signer-list/document-signer-list';

interface DocumentSignerListProps {
  signerAddresses: string[];
  onClickBack: () => void;
}

const DocumentSignerListScreen = ({ signerAddresses, onClickBack }: DocumentSignerListProps) => {
  return (
    <S.DocumentSignerListWrapper>
      <SubHeader
        title='Document Signer'
        leftElement={{
          onClick: onClickBack,
          element: <img src={`${ArrowLeftIcon}`} alt={'back image'} />,
        }}
      />

      <div className='content-wrapper'>
        <DocumentSignerList signerAddresses={signerAddresses} />
      </div>
    </S.DocumentSignerListWrapper>
  );
};

export default DocumentSignerListScreen;
