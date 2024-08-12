import React, { useCallback, useEffect, useMemo, useState } from 'react';

import AdditionalToken from '@components/pages/additional-token/additional-token';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { RoutePath } from '@types';
import { ManageTokenLayout } from '@components/pages/manage-token-layout';
import { TokenInfo } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';
import { useGRC20Tokens } from '@hooks/use-grc20-tokens';
import { useNetwork } from '@hooks/use-network';

const ManageTokenAddedContainer: React.FC = () => {
  const { navigate, goBack } = useAppNavigate();
  const { tokenMetainfos, addGRC20TokenMetainfo } = useTokenMetainfo();
  const { currentNetwork } = useNetwork();
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
      goBack();
    }
  }, [finished]);

  const { data: grc20Tokens } = useGRC20Tokens();

  const tokenInfos: TokenInfo[] = useMemo(() => {
    if (!grc20Tokens) {
      return [];
    }

    return grc20Tokens
      .filter((token) => token.networkId === currentNetwork.networkId)
      .filter(
        (token) =>
          !tokenMetainfos.find(
            (tokenMetainfo) =>
              tokenMetainfo.tokenId === token.tokenId &&
              tokenMetainfo.networkId === token.networkId,
          ),
      )
      .filter(
        (token) =>
          token?.pkgPath.includes(keyword) ||
          token?.symbol.includes(keyword) ||
          token?.name.includes(keyword),
      )
      .map((token) => ({
        tokenId: token?.tokenId,
        name: token?.name,
        symbol: token?.symbol,
        path: token?.pkgPath,
        decimals: token?.decimals,
        chainId: token?.networkId,
        pathInfo: token?.pkgPath.replace('gno.land/', ''),
      }));
  }, [grc20Tokens, keyword]);

  const closeSelectBox = (): void => {
    setOpened(false);
  };

  const onChangeKeyword = useCallback((keyword: string) => {
    const regex = /^[a-zA-Z0-9!@#$%^&*()_+`/\\\\[\]'";.,?<>]*$/;
    if (!regex.test(keyword)) {
      return;
    }
    setKeyword(keyword);
  }, []);

  const onClickListItem = useCallback(
    (tokenId: string) => {
      const tokenInfo = tokenInfos?.find((tokenInfo) => tokenInfo.tokenId === tokenId);
      setSelected(true);
      setSelectedTokenInfo(tokenInfo);
      setOpened(false);
    },
    [tokenInfos],
  );

  const onClickCancel = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, []);

  const onClickAdd = useCallback(async () => {
    if (!selected || !selectedTokenInfo || finished) {
      return;
    }

    await addGRC20TokenMetainfo(selectedTokenInfo);
    setFinished(true);
  }, [selected, selectedTokenInfo, finished]);

  return (
    <ManageTokenLayout>
      <AdditionalToken
        opened={opened}
        selected={selected}
        keyword={keyword}
        tokenInfos={tokenInfos ?? []}
        selectedTokenInfo={selectedTokenInfo}
        onChangeKeyword={onChangeKeyword}
        onClickOpenButton={setOpened}
        onClickListItem={onClickListItem}
        onClickBack={goBack}
        onClickCancel={onClickCancel}
        onClickAdd={onClickAdd}
      />
    </ManageTokenLayout>
  );
};

export default ManageTokenAddedContainer;
