import React, { ReactElement } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRefreshControlColors } from '../../../theme';
import { ActivityList, ActivityListProps, TopBar, useFloatingNavigationClearance } from '../../molecules';
import { useStyles } from './activity.styles';

export interface ActivityPageProps extends ActivityListProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export const ActivityPage = ({ refreshing, onRefresh, ...list }: ActivityPageProps): ReactElement => {
  const refreshColors = useRefreshControlColors();
  const styles = useStyles();
  const bottomClearance = useFloatingNavigationClearance();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar title='Activity' />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
        keyboardShouldPersistTaps='handled'
        refreshControl={<RefreshControl {...refreshColors} refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ActivityList {...list} />
      </ScrollView>
    </SafeAreaView>
  );
};
