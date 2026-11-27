import React, { ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Icon, Switch, Text } from '../../atoms';
import { BottomSheet, InlineAlert } from '../../molecules';
import { styles } from './settings.styles';

export interface SettingsOptionView {
  value: string;
  title: string;
  description?: string;
  // Secondary label after the title, e.g. a currency code.
  code?: string;
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

export interface SettingsNotificationTopicView {
  topic: string;
  title: string;
  description: string;
  value: boolean;
}

export interface SettingsNotificationsView {
  enabled: boolean;
  topics: SettingsNotificationTopicView[];
  // Shown above the switches, e.g. when the OS permission is denied.
  alert?: { title: string; description?: string };
  // Offered with the alert when the fix is in the system settings.
  onOpenSystemSettings?: () => void;
  onToggleEnabled: (value: boolean) => void;
  onToggleTopic: (topic: string, value: boolean) => void;
}

// Master switch plus one switch per category; categories stay visible but locked while it is off.
export const NotificationSheet = ({ visible, view, onClose }: { visible: boolean; view: SettingsNotificationsView; onClose: () => void }): ReactElement => {
  return (
    <BottomSheet visible={visible} title='Notifications' onClose={onClose}>
      <View style={styles.options}>
        {view.alert && <InlineAlert tone='warning' title={view.alert.title} description={view.alert.description} />}
        {view.alert && view.onOpenSystemSettings && (
          <Button label='Open settings' tone='secondary' size='compact' onPress={view.onOpenSystemSettings} />
        )}
        <View style={styles.option}>
          <View style={styles.optionTexts}>
            <Text variant='row'>Allow notifications</Text>
            <Text variant='meta' color='secondary'>Get notified about activity in your accounts.</Text>
          </View>
          <Switch value={view.enabled} onValueChange={view.onToggleEnabled} accessibilityLabel='Allow notifications' />
        </View>
        {view.topics.map((topic) => {
          const handleChange = (value: boolean): void => view.onToggleTopic(topic.topic, value);

          return (
            <View key={topic.topic} style={styles.option}>
              <View style={styles.optionTexts}>
                <Text variant='row' color={view.enabled ? 'primary' : 'disabled'}>{topic.title}</Text>
                <Text variant='meta' color='secondary'>{topic.description}</Text>
              </View>
              <Switch value={topic.value} disabled={!view.enabled} onValueChange={handleChange} accessibilityLabel={topic.title} />
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
};
