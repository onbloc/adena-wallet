import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import { ManageTokenLayout } from '@components/pages/manage-token-layout';
import ManageTokenSearch from '@components/pages/manage-token/manage-token';
import useAppNavigate from '@hooks/use-app-navigate';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useTokenBalance } from '@hooks/use-token-balance';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { ManageTokenInfo, RoutePath } from '@types';

const ManageTokenSearchContainer: React.FC = () => {
  const { navigate, goBack } = useAppNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isClose, setIsClose] = useState(false);
  const { currentAccount } = useCurrentAccount();
  const { tokenLogoMap } = useTokenMetainfo();
  const { currentBalances, toggleDisplayOption } = useTokenBalance();

  useEffect(() => {
    if (isClose) {
      goBack();
    }
  }, [isClose]);

  const filteredTokens: ManageTokenInfo[] = useMemo(() => {
    const comparedKeyword = searchKeyword.toLowerCase();
    const filteredTokens = currentBalances
      .filter((token) => {
        if (comparedKeyword === '') return true;
        if (token.name.toLowerCase().includes(comparedKeyword)) return true;
        if (token.symbol.toLowerCase().includes(comparedKeyword)) return true;
        return false;
      })
      .map((metainfo) => {
        return {
          ...metainfo,
          type: 'token' as const,
          balance: {
            value: BigNumber(metainfo.amount.value).toFormat(),
            denom: metainfo.amount.denom,
          },
          logo: tokenLogoMap[metainfo.tokenId] || `${UnknownTokenIcon}`,
        };
      });
    return filteredTokens;
  }, [searchKeyword, currentBalances, tokenLogoMap]);

  const moveTokenAddedPage = useCallback(() => {
    navigate(RoutePath.ManageTokenAdded);
  }, [navigate]);

  const onChangeKeyword = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
  }, []);

  const onToggleActiveItem = useCallback(
    (tokenId: string, activated: boolean) => {
      if (!currentAccount) {
        return;
      }
      const changedToken = currentBalances.find((token) => tokenId === token.tokenId);
      if (changedToken) {
        toggleDisplayOption(currentAccount, changedToken, activated);
      }
    },
    [currentBalances],
  );

  const onClickClose = useCallback(() => {
    setIsClose(true);
  }, []);

  return (
    <ManageTokenLayout>
      <ManageTokenSearch
        keyword={searchKeyword}
        tokens={filteredTokens}
        onClickAdded={moveTokenAddedPage}
        onClickClose={onClickClose}
        onChangeKeyword={onChangeKeyword}
        onToggleActiveItem={onToggleActiveItem}
      />
    </ManageTokenLayout>
  );
};

export default ManageTokenSearchContainer;
