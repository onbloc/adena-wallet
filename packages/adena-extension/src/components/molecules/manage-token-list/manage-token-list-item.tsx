import React, { useMemo, useState } from 'react';

import IconEmptyImage from '@assets/icon-empty-image.svg';
import Toggle from '@components/atoms/toggle';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useTheme } from 'styled-components';
import { TokenBalance } from '../token-balance';
import { ManageGRC721Info, ManageTokenInfo } from './manage-token-list';
import { ManageTokenListItemWrapper } from './manage-token-list.styles';

export interface ManageTokenListItemProps {
  token: ManageTokenInfo | ManageGRC721Info;
  queryGRC721TokenUri?: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  queryGRC721Balance?: (
    packagePath: string,
    options?: UseQueryOptions<number | null, Error>,
  ) => UseQueryResult<number | null>;
  onToggleActiveItem: (tokenId: string, activated: boolean) => void;
}

function isManageTokenInfo(token: ManageTokenInfo | ManageGRC721Info): token is ManageTokenInfo {
  return token.type === 'token';
}

const ManageTokenListItem: React.FC<ManageTokenListItemProps> = ({
  token,
  queryGRC721TokenUri,
  queryGRC721Balance,
  onToggleActiveItem,
}) => {
  const theme = useTheme();
  const [hasLogoError, setHasLogoError] = useState(false);
  const isTokenInfo = isManageTokenInfo(token);
  const tokenUriResponse =
    !isTokenInfo && token.isTokenUri && queryGRC721TokenUri
      ? queryGRC721TokenUri(token.packagePath, '0', { enabled: !!token.isTokenUri })
      : null;
  const tokenBalanceResponse =
    !isTokenInfo && queryGRC721Balance
      ? queryGRC721Balance(token.packagePath, { refetchOnMount: true })
      : null;

  const grc721CollectionImage = useMemo(() => {
    if (!hasLogoError) {
      return null;
    }

    if (!tokenUriResponse) {
      return null;
    }

    if (!tokenUriResponse.data) {
      return null;
    }

    return tokenUriResponse.data;
  }, [tokenUriResponse]);

  const grc721BalanceStr = useMemo(() => {
    if (isTokenInfo) {
      return '';
    }

    if (
      tokenBalanceResponse === null ||
      tokenBalanceResponse.data === undefined ||
      tokenBalanceResponse.data === null
    ) {
      return '-';
    }

    const balanceBN = BigNumber(tokenBalanceResponse.data);
    if (balanceBN.isGreaterThan(1)) {
      return `${balanceBN.toFormat()} Items`;
    }

    return `${balanceBN.toFormat()} Item`;
  }, [token]);

  const handleLogoError = (): void => {
    setHasLogoError(true);
  };

  if (isTokenInfo) {
    return (
      <ManageTokenListItemWrapper>
        <div className={'logo-wrapper'}>
          <img className='logo' src={token.logo} alt='token img' onError={handleLogoError} />
        </div>

        <div className='name-wrapper'>
          <span className='name'>{token.name}</span>

          <TokenBalance
            value={token.balance.value}
            denom={token.balance.denom}
            orientation='HORIZONTAL'
            fontColor={theme.neutral.a}
            fontStyleKey='captionReg'
            minimumFontSize='10px'
          />
        </div>

        <div className='toggle-wrapper'>
          {!token.main && (
            <Toggle
              activated={token.display === true}
              onToggle={(): void => onToggleActiveItem(token.tokenId, !token.display)}
            />
          )}
        </div>
      </ManageTokenListItemWrapper>
    );
  }

  return (
    <ManageTokenListItemWrapper>
      <div className={'logo-wrapper square'}>
        {grc721CollectionImage ? (
          <img className='logo' src={grc721CollectionImage} alt='token img' />
        ) : (
          <div className='logo empty'>
            <img className='icon-empty' src={IconEmptyImage} alt='token empty' />
          </div>
        )}
      </div>

      <div className='name-wrapper'>
        <span className='name'>{token.name}</span>
        <span className='balance'>{grc721BalanceStr}</span>
      </div>

      <div className='toggle-wrapper'>
        <Toggle
          activated={token.display === true}
          onToggle={(): void => onToggleActiveItem(token.packagePath, !token.display)}
        />
      </div>
    </ManageTokenListItemWrapper>
  );
};

export default ManageTokenListItem;
