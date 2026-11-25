import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useMemo, useState } from 'react';

import { AddTokenPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { usePreference } from '../../../hooks/use-preference';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { isHiddenAsUnknown } from '../../../presenters/asset.presenter';
import { queryKeys } from '../../../queries/query-keys';
import { useTokenListQuery, useTokenRegistryQuery } from '../../../queries/token.queries';
import { useToastStore } from '../../../stores/toast.store';

const looksLikeTokenKey = (value: string): boolean => /\/[^/]+\.[^./]+$/.test(value);

export const AddTokenScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'AddToken'>): ReactElement => {
  const { tokenService, chainRegistry } = useContainer();
  const { account, network } = useWalletSnapshot();
  const queryClient = useQueryClient();
  const showToast = useToastStore(state => state.show);
  const registry = useTokenRegistryQuery(network);
  const tokenList = useTokenListQuery(account, network);
  const hideUnknownTokens = usePreference('hideUnknownTokens');
  const [query, setQuery] = useState(route.params?.query ?? '');
  const trimmed = query.trim();

  // A full "{pkgPath}.{symbol}" key is resolved directly, even beyond the loaded registry pages.
  const lookup = useQuery({
    queryKey: queryKeys.tokenLookup(network.id, trimmed),
    queryFn: () => chainRegistry.assets(network).findToken(trimmed, network),
    enabled: looksLikeTokenKey(trimmed),
  });

  const add = useMutation({
    mutationFn: (tokenId: string) => {
      if (!account) {
        throw new Error('No account selected');
      }

      return tokenService.addCustomToken(account, network, tokenId);
    },
    onSuccess: (token) => {
      if (account) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tokenList(network.id, account.id) });
      }

      showToast(`${token.symbol} added`, 'success');
    },
  });

  // A token Home hides as unknown still offers Add, which promotes it to a custom token.
  const added = useMemo(
    () => new Set((tokenList.data ?? []).filter(token => token.visible && !isHiddenAsUnknown(token, hideUnknownTokens)).map(token => token.id)),
    [tokenList.data, hideUnknownTokens],
  );
  const needle = trimmed.toLowerCase();
  const registryTokens = (registry.data?.pages ?? []).flatMap(page => page.tokens);
  const candidates = lookup.data ? [lookup.data, ...registryTokens.filter(token => token.id !== lookup.data?.id)] : registryTokens;
  const matches = (token: { id: string; name: string; symbol: string }): boolean => {
    if (!needle) {
      return true;
    }

    if (looksLikeTokenKey(trimmed)) {
      return token.id === trimmed;
    }

    return [token.name, token.symbol, token.id].some(value => value.toLowerCase().includes(needle));
  };
  const results = candidates
    .filter(matches)
    .map(token => ({ key: token.id, symbol: token.symbol, name: token.name, imageUrl: token.imageUrl, added: added.has(token.id) }));

  const error = registry.error ?? lookup.error ?? add.error;

  const handleChangeQuery = (value: string): void => {
    setQuery(value);
    add.reset();
  };

  const handleLoadMore = (): void => {
    registry.fetchNextPage();
  };

  const handleAdd = (tokenId: string): void => {
    if (account) {
      add.mutate(tokenId);
    }
  };

  return (
    <AddTokenPage
      query={query}
      onChangeQuery={handleChangeQuery}
      results={results}
      loading={registry.isPending || lookup.isFetching}
      error={error ? toErrorMessage(error) : undefined}
      hasMore={Boolean(registry.hasNextPage)}
      loadingMore={registry.isFetchingNextPage}
      addingKey={add.isPending ? add.variables : undefined}
      onLoadMore={handleLoadMore}
      onAdd={handleAdd}
      onBack={navigation.goBack}
    />
  );
};
