import React, { ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Icon, IconName, Switch, Text } from '../../atoms';
import { BottomSheet } from '../../molecules';
import { styles } from './settings.styles';

export interface SettingsOptionView {
  value: string;
  title: string;
  description?: string;
  // Secondary label after the title, e.g. a currency code.
  code?: string;
  icon?: IconName;
}

export interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: SettingsOptionView[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

// Single-choice sheet; the selected row carries a check.
export const OptionSheet = ({ visible, title, options, selected, onSelect, onClose }: OptionSheetProps): ReactElement => {
  const colors = useThemeColors();

  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View accessibilityRole='radiogroup' style={styles.options}>
        {options.map((option) => {
          const isSelected = option.value === selected;
          const handlePress = (): void => onSelect(option.value);

          return (
            <Pressable
              key={option.value}
              accessibilityRole='radio'
              accessibilityLabel={[option.title, option.code, option.description].filter(Boolean).join(', ')}
              accessibilityState={{ selected: isSelected }}
              onPress={handlePress}
              style={styles.option}
            >
              {option.icon && <Icon name={option.icon} size={20} color={colors.icon.secondary} />}
              <View style={styles.optionTexts}>
                <View style={styles.optionTitle}>
                  <Text variant='row' numberOfLines={1}>{option.title}</Text>
                  {option.code && <Text variant='meta' color='secondary'>{option.code}</Text>}
                </View>
                {option.description && <Text variant='meta' color='secondary'>{option.description}</Text>}
              </View>
              {isSelected && <Icon name='check' size={20} />}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
};

export interface ToggleOptionView {
  key: string;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const ToggleSheet = ({ visible, title, toggles, onClose }: { visible: boolean; title: string; toggles: ToggleOptionView[]; onClose: () => void }): ReactElement => {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.options}>
        {toggles.map(toggle => (
          <View key={toggle.key} style={styles.option}>
            <View style={styles.optionTexts}>
              <Text variant='row'>{toggle.title}</Text>
              <Text variant='meta' color='secondary'>{toggle.description}</Text>
            </View>
            <Switch value={toggle.value} onValueChange={toggle.onChange} accessibilityLabel={toggle.title} />
          </View>
        ))}
      </View>
    </BottomSheet>
  );
};
