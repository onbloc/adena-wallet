import React from 'react';
import * as S from './document-signer-list-screen.styles';

import { SubHeader } from '@components/atoms';
import ArrowLeftIcon from '@assets/arrowL-left.svg';
import DocumentSignerList from '@components/molecules/document-signer-list/document-signer-list';
import { SignerInfo } from '@inject/types';

interface DocumentSignerListProps {
  signerInfos: SignerInfo[];
  onClickBack: () => void;
}

const DocumentSignerListScreen = ({ signerInfos, onClickBack }: DocumentSignerListProps) => {
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
        <DocumentSignerList signerInfos={signerInfos} />
      </div>
    </S.DocumentSignerListWrapper>
  );
};

export default DocumentSignerListScreen;
