import React, { ReactElement } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityList, ActivityListProps, TopBar, useFloatingNavigationClearance } from '../../molecules';
import { styles } from './activity.styles';

export interface ActivityPageProps extends ActivityListProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export const ActivityPage = ({ refreshing, onRefresh, ...list }: ActivityPageProps): ReactElement => {
  const bottomClearance = useFloatingNavigationClearance();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TopBar title='Activity' />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
        keyboardShouldPersistTaps='handled'
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ActivityList {...list} />
      </ScrollView>
    </SafeAreaView>
  );
};
