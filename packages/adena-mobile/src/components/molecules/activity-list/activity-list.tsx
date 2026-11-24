import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Skeleton } from '../../atoms';
import { ActivitySectionView } from '../../view-models';
import { ActivityRow } from '../activity-row';
import { EmptyState } from '../empty-state';
import { InlineAlert } from '../inline-alert';
import { SectionLabel } from '../section-label';
import { styles } from './activity-list.styles';

export interface ActivityListProps {
  sections: ActivitySectionView[];
  loading: boolean;
  error?: string;
  supported: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (key: string) => void;
}

// Page section shared by the activity and token detail pages.
export const ActivityList = ({ sections, loading, error, supported, hasMore, loadingMore, onLoadMore, onOpen }: ActivityListProps): ReactElement => {
  if (!supported) {
    return <EmptyState title='History is not available' description='This network does not provide transaction history.' />;
  }

  if (loading) {
    return <View style={styles.list}>{[0, 1, 2].map(key => <Skeleton key={key} height={60} />)}</View>;
  }

  if (error) {
    return <InlineAlert tone='error' title='Unable to load activity' description={error} />;
  }

  if (sections.length === 0) {
    return <EmptyState title='No activity yet' description='Transactions you make will appear here.' />;
  }

  return (
    <View style={styles.list}>
      {sections.map(section => (
        <View key={section.title} style={styles.section}>
          <SectionLabel label={section.title} />
          {section.items.map((item) => {
            const handlePress = (): void => onOpen(item.key);

            return (
              <ActivityRow
                key={item.key}
                title={item.title}
                description={item.description}
                amountLabel={item.amountLabel}
                tone={item.tone}
                failed={item.failed}
                extraInfo={item.extraInfo}
                icon={item.icon}
                onPress={handlePress}
              />
            );
          })}
        </View>
      ))}
      {hasMore && <Button label='Load more' tone='secondary' size='compact' loading={loadingMore} loadingLabel='Loading…' onPress={onLoadMore} />}
    </View>
  );
};
