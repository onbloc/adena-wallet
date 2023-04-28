import AdditionalToken, { TokenInfo } from '@components/manage-token/additional-token/additional-token';
import { useAdenaContext } from '@hooks/use-context';
import { useTokenBalance } from '@hooks/use-token-balance';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
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

  const {
    isFetched,
    error,
    data: tokenInfos,
  } = useQuery<TokenInfo[], Error>({
    queryKey: ['search-grc20-tokens', keyword],
    queryFn: () => tokenService.fetchGRC20Tokens(keyword).then(tokens => {
      return tokens.filter(token1 => tokenMetainfos.findIndex(token2 => token1.path === token2.pkgPath) < 0)
    }),
  });

  const onChangeKeyword = useCallback((keyword: string) => {
    setKeyword(keyword);
  }, []);

  const onClickListItem = useCallback((tokenId: string) => {
    const tokenInfo = tokenInfos?.find(tokenInfo => tokenInfo.tokenId === tokenId);
    setSelected(true);
    setSelectedTokenInfo(tokenInfo);
    setOpened(false);
  }, [tokenInfos]);

  const onClickCancel = useCallback(() => {
    navigate(-1);
  }, []);

  const onClickAdd = useCallback(async () => {
    if (!selected || !selectedTokenInfo) {
      return;
    }
    await addGRC20TokenMetainfo(selectedTokenInfo);
    await updateTokenBalanceInfos(tokenMetainfos);
    navigate(-1);
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
      onClickCancel={onClickCancel}
      onClickAdd={onClickAdd}
    />
  );
};

export default ManageTokenAddedContainer;