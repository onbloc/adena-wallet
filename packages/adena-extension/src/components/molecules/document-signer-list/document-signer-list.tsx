import { SCANNER_URL } from '@common/constants/resource.constant';
import { makeScannerUrl } from '@common/utils/scanner-utils';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { useNetworkProfile } from '@hooks/use-network-profile';
import { SignerInfo } from '@inject/types';
import { useCallback } from 'react';

import { DocumentSignerListWrapper } from './document-signer-list.styles';
import DocumentSignerListItem from './document-signer-list-item';

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
      const openLinkUrl = makeScannerUrl(scannerUrl, `/account/${address}`, scannerParameters ?? {});
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
