import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { SignRequest } from '../../agent';
import { describeRequest } from './describeRequest';

/** The wallet's signing popup. Visible while there is a request to sign. */
export function ApprovalModal({
  request,
  onApprove,
  onReject,
}: {
  request: SignRequest | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const summary = request ? describeRequest(request) : null;

  return (
    <Modal
      visible={request !== null}
      transparent
      animationType="fade"
      onRequestClose={onReject}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{summary?.title}</Text>
          {summary?.rows.map(([label, value]) => (
            <View key={label} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value} selectable>
                {value}
              </Text>
            </View>
          ))}
          <View style={styles.actions}>
            <Pressable onPress={onReject} style={[styles.action, styles.reject]}>
              <Text style={styles.rejectText}>Reject</Text>
            </Pressable>
            <Pressable onPress={onApprove} style={[styles.action, styles.approve]}>
              <Text style={styles.approveText}>Approve</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: '700' },
  field: { gap: 2 },
  label: { fontSize: 12, color: '#666' },
  value: { fontFamily: 'Courier', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  action: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  reject: { borderWidth: 1, borderColor: '#d33' },
  rejectText: { color: '#d33', fontWeight: '600' },
  approve: { backgroundColor: '#2563eb' },
  approveText: { color: '#fff', fontWeight: '600' },
});
