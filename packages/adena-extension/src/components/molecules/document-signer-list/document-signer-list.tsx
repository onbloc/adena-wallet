import { useCallback } from 'react';
import { useNetwork } from '@hooks/use-network';
import { useNetworkProfile } from '@hooks/use-network-profile';

import { DocumentSignerListWrapper } from './document-signer-list.styles';
import DocumentSignerListItem from './document-signer-list-item';
import { SCANNER_URL } from '@common/constants/resource.constant';
import { makeQueryString } from '@common/utils/string-utils';
import useLink from '@hooks/use-link';
import { SignerInfo } from '@inject/types';

interface DocumentSignerListProps {
  signerInfos: SignerInfo[];
}

const DocumentSignerList = ({ signerInfos }: DocumentSignerListProps): React.ReactElement => {
  const { openLink } = useLink();
  const { scannerParameters } = useNetwork();
  const profile = useNetworkProfile();

  const handleLinkClick = useCallback(
    (address: string) => {
      const scannerUrl = profile?.linkUrl || SCANNER_URL;
      const openLinkUrl = scannerParameters
        ? `${scannerUrl}/account/${address}?${makeQueryString(scannerParameters)}`
        : `${scannerUrl}/account/${address}`;
      openLink(openLinkUrl);
    },
    [profile, scannerParameters, openLink],
  );

  return (
    <DocumentSignerListWrapper>
      {signerInfos.map((signer, i) => {
        return (
          <DocumentSignerListItem
            key={`${i}:${signer.address}`}
            signerAddress={signer.address}
            status={signer.status}
            order={i + 1}
            onClickAddress={handleLinkClick}
          />
        );
      })}
    </DocumentSignerListWrapper>
  );
};

export default DocumentSignerList;
