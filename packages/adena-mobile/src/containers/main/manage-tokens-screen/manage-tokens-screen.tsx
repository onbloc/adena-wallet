import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useState } from 'react';

import { ManageTokensPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { ChainFamily } from '../../../domain/network';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { toAssetItem, toAssetView } from '../../../presenters/asset.presenter';
import { queryKeys } from '../../../queries/query-keys';
import { useTokenListQuery } from '../../../queries/token.queries';

export const ManageTokensScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'ManageTokens'>): ReactElement => {
  const { tokenService } = useContainer();
  const { account, network } = useWalletSnapshot();
  const tokenList = useTokenListQuery(account, network);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();

  const tokens = (tokenList.data ?? [])
    .filter(token => !needle || token.name.toLowerCase().includes(needle) || token.symbol.toLowerCase().includes(needle))
    .map(token => ({ ...toAssetItem(toAssetView(token, undefined, undefined, false)), visible: token.visible, locked: token.isNative }));

  const handleToggle = (tokenId: string, visible: boolean): void => {
    if (!account) {
      return;
    }

    tokenService.setVisibility(account, network, tokenId, visible);
    queryClient.invalidateQueries({ queryKey: queryKeys.tokenList(network.id, account.id) });
  };

  return (
    <ManageTokensPage
      query={query}
      onChangeQuery={setQuery}
      tokens={tokens}
      onToggle={handleToggle}
      onAddToken={network.family === ChainFamily.GNO ? (): void => navigation.navigate('AddToken') : undefined}
      onBack={navigation.goBack}
    />
  );
};
