import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Icon, Text } from '../../atoms';
import { ReviewFactIcon } from '../../view-models';
import { useStyles } from './card-parts.styles';

export interface FactTile {
  icon: ReviewFactIcon;
  label: string;
  value: string;
  caption?: string;
}

// Where / How much / Until, side by side.
export const FactTiles = ({ tiles }: { tiles: FactTile[] }): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.tiles}>
      {tiles.map(tile => (
        <View key={tile.label} style={styles.tile}>
          <Icon name={tile.icon} size={20} />
          <Text variant='meta' color='secondary'>{tile.label}</Text>
          <Text variant='row' numberOfLines={2}>{tile.value}</Text>
          {tile.caption && <Text variant='meta' color='secondary' numberOfLines={2}>{tile.caption}</Text>}
        </View>
      ))}
    </View>
  );
};

// "It can never": red-crossed chips.
export const RestrictionChips = ({ items }: { items: string[] }): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <Text variant='meta' color='secondary' style={styles.sectionTitle}>It can never</Text>
      <View style={styles.chips}>
        {items.map(item => (
          <View key={item} style={styles.restriction}>
            <View style={styles.restrictionIcon}><Icon name='close' size={14} color={styles.restrictionGlyph.color} /></View>
            <Text variant='meta' style={styles.chipText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// What stays safe: green-checked lines.
export const Assurances = ({ items }: { items: string[] }): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.assurances}>
      {items.map(item => (
        <View key={item} style={styles.assurance}>
          <View style={styles.assuranceIcon}><Icon name='check' size={14} color={styles.assuranceGlyph.color} /></View>
          <Text variant='body'>{item}</Text>
        </View>
      ))}
    </View>
  );
};
