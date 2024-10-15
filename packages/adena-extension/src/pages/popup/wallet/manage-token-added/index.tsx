import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { parseReamPathItemsByPath } from '@common/utils/parse-utils';
import AdditionalToken from '@components/pages/additional-token/additional-token';
import { AddingType } from '@components/pages/additional-token/additional-token-type-selector';
import { ManageTokenLayout } from '@components/pages/manage-token-layout';
import useAppNavigate from '@hooks/use-app-navigate';
import { useGRC20Token } from '@hooks/use-grc20-token';
import { useGRC20Tokens } from '@hooks/use-grc20-tokens';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { RoutePath, TokenInfo } from '@types';

const ManageTokenAddedContainer: React.FC = () => {
  const { navigate, goBack } = useAppNavigate();
  const { tokenMetainfos, addGRC20TokenMetainfo } = useTokenMetainfo();
  const { currentNetwork } = useNetwork();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<TokenInfo | null>(null);
  const [finished, setFinished] = useState(false);
  const [addingType, setAddingType] = useState(AddingType.SEARCH);
  const [manualTokenPath, setManualTokenPath] = useState('');

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

  const { data: manualGRC20Token, isFetching: isFetchingManualGRC20Token } =
    useGRC20Token(manualTokenPath);

  const isValidManualGRC20TokenPath = useMemo(() => {
    try {
      parseReamPathItemsByPath(manualTokenPath);
    } catch {
      return false;
    }
    return true;
  }, [manualTokenPath]);

  const isLoadingManualGRC20Token = useMemo(() => {
    if (!isValidManualGRC20TokenPath) {
      return false;
    }

    return isFetchingManualGRC20Token;
  }, [isValidManualGRC20TokenPath, isFetchingManualGRC20Token]);

  const isErrorManualGRC20Token = useMemo(() => {
    if (manualTokenPath === '') {
      return false;
    }

    if (isLoadingManualGRC20Token) {
      return false;
    }

    return manualGRC20Token === null;
  }, [isLoadingManualGRC20Token, manualTokenPath, manualGRC20Token]);

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

  const onChangeManualTokenPath = useCallback((tokenPath: string) => {
    setManualTokenPath(tokenPath);
  }, []);

  const selectAddingType = useCallback((addingType: AddingType) => {
    setAddingType(addingType);
    setKeyword('');
    setManualTokenPath('');
    setSelectedTokenInfo(null);
    setOpened(false);
    setSelected(false);
  }, []);

  const onClickListItem = useCallback(
    (tokenId: string) => {
      const tokenInfo = tokenInfos?.find((tokenInfo) => tokenInfo.tokenId === tokenId);
      if (!tokenInfo) {
        return;
      }

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

  useEffect(() => {
    if (addingType === AddingType.SEARCH) {
      return;
    }

    if (isLoadingManualGRC20Token) {
      setSelectedTokenInfo(null);
      return;
    }

    if (!manualGRC20Token) {
      setSelectedTokenInfo(null);
      return;
    }

    setSelected(true);
    setSelectedTokenInfo({
      tokenId: manualGRC20Token.tokenId,
      name: manualGRC20Token.name,
      symbol: manualGRC20Token.symbol,
      path: manualGRC20Token.pkgPath,
      decimals: manualGRC20Token.decimals,
      chainId: manualGRC20Token.networkId,
      pathInfo: manualGRC20Token.pkgPath.replace('gno.land/', ''),
    });
  }, [addingType, manualGRC20Token, isLoadingManualGRC20Token]);

  return (
    <ManageTokenLayout>
      <AdditionalToken
        opened={opened}
        addingType={addingType}
        selected={selected}
        keyword={keyword}
        tokenInfos={tokenInfos ?? []}
        manualTokenPath={manualTokenPath}
        isLoadingManualGRC20Token={isLoadingManualGRC20Token}
        isErrorManualGRC20Token={isErrorManualGRC20Token}
        selectedTokenInfo={selectedTokenInfo}
        selectAddingType={selectAddingType}
        onChangeKeyword={onChangeKeyword}
        onChangeManualTokenPath={onChangeManualTokenPath}
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
