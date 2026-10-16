import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {RefreshControl, ScrollView, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useHistory} from '../../core/use-history';
import type {MainStackParams} from '../../navigation/types';
import {HistoryList} from '../../ui/history-list';
import {TabBar} from '../../ui/tab-bar';
import {colors} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'History'>;

/** The extension's History tab: every transaction of the account. */
export function HistoryScreen({navigation}: Props) {
  const history = useHistory({kind: 'all'});
  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={history.loading && history.items.length > 0}
            onRefresh={history.refresh}
            tintColor={colors.textMuted}
          />
        }>
        <HistoryList
          items={history.items}
          loading={history.loading}
          failed={history.failed}
          hasMore={history.hasMore}
          supported={history.supported}
          onLoadMore={history.loadMore}
          onPressItem={transaction =>
            navigation.navigate('TransactionDetail', {transaction})
          }
        />
      </ScrollView>
      <TabBar current="History" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  body: {padding: 20, flexGrow: 1},
});
