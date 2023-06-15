import AdditionalToken, { TokenInfo } from '@components/manage-token/additional-token/additional-token';
import { useAdenaContext } from '@hooks/use-context';
import { useTokenBalance } from '@hooks/use-token-balance';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { isGRC20TokenModel } from '@models/token-model';
import { RoutePath } from '@router/path';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ManageTokenAddedContainer: React.FC = () => {
  const navigate = useNavigate();
  const { tokenService } = useAdenaContext();
  const { tokenMetainfos, addGRC20TokenMetainfo } = useTokenMetainfo();
  const { updateTokenBalanceInfos } = useTokenBalance();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<TokenInfo>();
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    document.body.addEventListener('click', closeSelectBox);
    return () => document.body.removeEventListener('click', closeSelectBox);
  }, [document.body]);

  useEffect(() => {
    if (finished) {
      navigate(-1);
    }
  }, [finished]);

  const {
    data: tokenInfos,
  } = useQuery<TokenInfo[], Error>({
    queryKey: ['search-grc20-tokens', keyword],
    queryFn: () => {
      const grc20TokenInfos = tokenMetainfos.filter(isGRC20TokenModel);
      return tokenService.fetchGRC20Tokens(keyword, tokenMetainfos).then(tokens => {
        return tokens.filter(token1 =>
          grc20TokenInfos.findIndex(token2 => token1.pkgPath === token2.pkgPath) < 0)
          .map(token => {
            return {
              tokenId: token.tokenId,
              name: token.name,
              symbol: token.symbol,
              path: token.pkgPath,
              decimals: token.decimals,
              chainId: 'test3',
              pathInfo: token.pkgPath.replace('gno.land/', '')
            }
          })
      })
    },
  });

  const closeSelectBox = () => {
    setOpened(false);
  };

  const onChangeKeyword = useCallback((keyword: string) => {
    const regex = /^[a-zA-Z0-9!@#$%^&*()_+`/\\\\[\]'";.,?<>]*$/;
    if (!regex.test(keyword)) {
      return;
    }
    setKeyword(keyword);
  }, []);

  const onClickListItem = useCallback((tokenId: string) => {
    const tokenInfo = tokenInfos?.find(tokenInfo => tokenInfo.tokenId === tokenId);
    setSelected(true);
    setSelectedTokenInfo(tokenInfo);
    setOpened(false);
  }, [tokenInfos]);

  const onClickBack = useCallback(() => {
    navigate(-1);
  }, []);

  const onClickCancel = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, []);

  const onClickAdd = useCallback(async () => {
    if (!selected || !selectedTokenInfo || finished) {
      return;
    }
    await addGRC20TokenMetainfo(selectedTokenInfo);
    await updateTokenBalanceInfos(tokenMetainfos);
    setFinished(true);
  }, [selected, selectedTokenInfo]);

  return (
    <AdditionalToken
      opened={opened}
      selected={selected}
      keyword={keyword}
      tokenInfos={tokenInfos ?? []}
      selectedTokenInfo={selectedTokenInfo}
      onChangeKeyword={onChangeKeyword}
      onClickOpenButton={setOpened}
      onClickListItem={onClickListItem}
      onClickBack={onClickBack}
      onClickCancel={onClickCancel}
      onClickAdd={onClickAdd}
    />
  );
};

export default ManageTokenAddedContainer;