import React, { useCallback, useEffect, useState } from 'react';
import BigNumber from 'bignumber.js';

import ManageTokenSearch from '@components/pages/manage-token/manage-token';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useTokenBalance } from '@hooks/use-token-balance';
import { RoutePath } from '@router/path';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { ManageTokenLayout } from '@components/pages/manage-token-layout';
import useAppNavigate from '@hooks/use-app-navige';

const ManageTokenSearchContainer: React.FC = () => {
  const { navigate, goBack } = useAppNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [isClose, setIsClose] = useState(false);
  const { tokenMetainfos } = useTokenMetainfo();
  const { currentAccount } = useCurrentAccount();
  const { tokenBalances, toggleDisplayOption, updateTokenBalanceInfos } = useTokenBalance();

  useEffect(() => {
    if (currentAccount) {
      updateTokenBalanceInfos(tokenMetainfos).then(() => setLoaded(true));
    }
  }, [tokenMetainfos, currentAccount]);

  useEffect(() => {
    if (loaded && isClose) {
      goBack();
    }
  }, [loaded, isClose]);

  const filterTokens = useCallback(
    (keyword: string) => {
      const comparedKeyword = keyword.toLowerCase();
      const filteredTokens = tokenBalances
        .filter((token) => {
          if (comparedKeyword === '') return true;
          if (token.name.toLowerCase().includes(comparedKeyword)) return true;
          if (token.symbol.toLowerCase().includes(comparedKeyword)) return true;
          return false;
        })
        .map((metainfo) => {
          return {
            ...metainfo,
            balanceAmount: {
              value: BigNumber(metainfo.amount.value).toFormat(),
              denom: metainfo.amount.denom,
            },
            logo: metainfo.image || `${UnknownTokenIcon}`,
          };
        });
      return filteredTokens;
    },
    [tokenBalances],
  );

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
      const changedToken = tokenBalances.find((token) => tokenId === token.tokenId);
      if (changedToken) {
        toggleDisplayOption(currentAccount, changedToken, activated);
      }
    },
    [tokenBalances],
  );

  const onClickClose = useCallback(() => {
    setIsClose(true);
  }, []);

  return (
    <ManageTokenLayout>
      <ManageTokenSearch
        keyword={searchKeyword}
        tokens={filterTokens(searchKeyword)}
        onClickAdded={moveTokenAddedPage}
        onClickClose={onClickClose}
        onChangeKeyword={onChangeKeyword}
        onToggleActiveItem={onToggleActiveItem}
      />
    </ManageTokenLayout>
  );
};

export default ManageTokenSearchContainer;
