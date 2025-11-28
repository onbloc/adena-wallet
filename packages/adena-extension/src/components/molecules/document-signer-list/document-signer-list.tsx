import { useNetwork } from '@hooks/use-network';

import { DocumentSignerListWrapper } from './document-signer-list.styles';
import DocumentSignerListItem from './document-signer-list-item';
import { useCallback } from 'react';
import { SCANNER_URL } from '@common/constants/resource.constant';
import { makeQueryString } from '@common/utils/string-utils';
import useLink from '@hooks/use-link';

interface DocumentSignerListProps {
  signerAddresses: string[];
}

const DocumentSignerList = ({ signerAddresses }: DocumentSignerListProps) => {
  const { openLink } = useLink();
  const { currentNetwork, scannerParameters } = useNetwork();

  const handleLinkClick = useCallback((address: string) => {
    const scannerUrl = currentNetwork.linkUrl || SCANNER_URL;
    const openLinkUrl = scannerParameters
      ? `${scannerUrl}/account/${address}?${makeQueryString(scannerParameters)}`
      : `${scannerUrl}/account/${address}`;
    openLink(openLinkUrl);
  }, []);

  return (
    <DocumentSignerListWrapper>
      {signerAddresses.map((signerAddress, i) => {
        return (
          <DocumentSignerListItem
            key={`${i}:${signerAddress}`}
            signerAddress={signerAddress}
            order={i + 1}
            status={'SIGNED'}
            onClickAddress={handleLinkClick}
          />
        );
      })}
    </DocumentSignerListWrapper>
  );
};

export default DocumentSignerList;
