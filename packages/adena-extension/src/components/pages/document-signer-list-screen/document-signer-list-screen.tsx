import ArrowLeftIcon from '@assets/arrowL-left.svg'
import {
  SubHeader,
} from '@components/atoms'
import DocumentSignerList from '@components/molecules/document-signer-list/document-signer-list'
import {
  SignerInfo,
} from '@inject/types'
import React from 'react'

import * as S from './document-signer-list-screen.styles'

interface DocumentSignerListProps {
  signerInfos: SignerInfo[]
  onClickBack: () => void
}

const DocumentSignerListScreen = ({
  signerInfos,
  onClickBack,
}: DocumentSignerListProps): React.ReactElement<any> => {
  return (
    <S.DocumentSignerListWrapper>
      <SubHeader
        title='Multisig Signers'
        leftElement={{
          onClick: onClickBack,
          element: <img src={`${ArrowLeftIcon}`} alt='back image' />,
        }}
      />

      <div className='content-wrapper'>
        <DocumentSignerList signerInfos={signerInfos} />
      </div>
    </S.DocumentSignerListWrapper>
  )
}

export default DocumentSignerListScreen
