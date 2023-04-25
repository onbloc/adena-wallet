import AdditionalToken, { TokenInfo } from '@components/manage-token/additional-token/additional-token';
import { useAdenaContext } from '@hooks/use-context';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ManageTokenAddedContainer: React.FC = () => {
  const navigate = useNavigate();
  const { tokenService } = useAdenaContext();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState(false);
  const [keyword, setKeyword] = useState('');
  const { addGRC20TokenMetainfo } = useTokenMetainfo();
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<TokenInfo>();

  const {
    isFetched,
    error,
    data: tokenInfos,
  } = useQuery<TokenInfo[], Error>({
    queryKey: ['search-grc20-tokens', keyword],
    queryFn: () => tokenService.fetchGRC20Tokens(keyword),
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

  const onClickAdd = useCallback(() => {
    if (!selected || !selectedTokenInfo) {
      return;
    }
    addGRC20TokenMetainfo(selectedTokenInfo).then(() => {
      navigate(-1);
    });
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