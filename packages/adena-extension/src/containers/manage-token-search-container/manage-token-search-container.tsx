import ManageTokenSearch from '@components/manage-token/manage-token-search/manage-token-search';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useTokenBalance } from '@hooks/use-token-balance';
import { RoutePath } from '@router/path';
import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';

export interface ManageTokenInfo {
  tokenId: string;
  logo: string;
  symbol: string;
  name: string;
  display?: boolean;
  main?: boolean;
  balanceAmount: {
    value: string;
    denom: string;
  }
}

const ManageTokenSearchContainer: React.FC = () => {
  const navigate = useNavigate();
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
      navigate(-1);
    }
  }, [loaded, isClose]);

  const filterTokens = useCallback((keyword: string) => {
    const comparedKeyword = keyword.toLowerCase();
    const filterdTokens = tokenBalances.filter(token => {
      if (comparedKeyword === '') return true;
      if (token.name.toLowerCase().includes(comparedKeyword)) return true;
      if (token.symbol.toLowerCase().includes(comparedKeyword)) return true;
      return false;
    }).map(metainfo => {
      return {
        ...metainfo,
        balanceAmount: {
          value: BigNumber(metainfo.amount.value).toFormat(),
          denom: metainfo.amount.denom
        },
        logo: metainfo.image || `${UnknownTokenIcon}`
      }
    });
    return filterdTokens;
  }, [tokenBalances]);

  const moveTokenAddedPage = useCallback(() => {
    navigate(RoutePath.ManageTokenAdded);
  }, [navigate]);

  const onChangeKeyword = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
  }, []);

  const onToggleActiveItem = useCallback((tokenId: string, activated: boolean) => {
    if (!currentAccount) {
      return;
    }
    const changedToken = tokenBalances.find(token => tokenId === token.tokenId);
    if (changedToken) {
      toggleDisplayOption(currentAccount, changedToken, activated);
    }
  }, [tokenBalances])

  const onClickClose = useCallback(() => {
    setIsClose(true);
  }, []);

  return (
    <ManageTokenSearch
      keyword={searchKeyword}
      tokens={filterTokens(searchKeyword)}
      onClickAdded={moveTokenAddedPage}
      onClickClose={onClickClose}
      onChangeKeyword={onChangeKeyword}
      onToggleActiveItem={onToggleActiveItem}
    />
  );
};

export default ManageTokenSearchContainer;