import React, { ReactElement } from 'react';

import { ActivityPage } from '../../../components/pages';
import { ActivityFilterKind } from '../../../domain/activity';
import { useActivityList } from '../../../hooks/use-activity-list';
import { usePullToRefresh } from '../../../hooks/use-pull-to-refresh';
import { useWalletAssets } from '../../../hooks/use-wallet-assets';
import { MainTabScreenProps } from '../../../navigation/screen-props';

const ALL = { kind: ActivityFilterKind.ALL } as const;

export const ActivityScreen = ({ navigation }: MainTabScreenProps<'Activity'>): ReactElement => {
  const { allTokens } = useWalletAssets();
  const { listProps, refetch } = useActivityList(ALL, allTokens, activity => navigation.navigate('ActivityDetail', { activity }));
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <ActivityPage
      {...listProps}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
};
