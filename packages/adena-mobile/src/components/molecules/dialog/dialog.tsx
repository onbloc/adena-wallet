import React, { ReactElement } from 'react';
import { Modal, View } from 'react-native';

import { Button, IconButton, Text } from '../../atoms';
import { useStyles } from './dialog.styles';

export interface DialogProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Blocking decision: short title, concrete consequence, explicit actions.
export const Dialog = ({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: DialogProps): ReactElement => {
  const styles = useStyles();

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.scrim}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text variant='section' style={styles.title} accessibilityRole='header'>{title}</Text>
            <IconButton icon='close' accessibilityLabel='Close' onPress={onCancel} />
          </View>
          {description && <Text variant='body' color='secondary'>{description}</Text>}
          <View style={styles.actions}>
            <Button label={cancelLabel} tone='secondary' size='compact' fullWidth={false} style={styles.action} onPress={onCancel} />
            <Button
              label={confirmLabel}
              tone={destructive ? 'destructive' : 'primary'}
              size='compact'
              fullWidth={false}
              loading={loading}
              loadingLabel={confirmLabel}
              style={styles.action}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
