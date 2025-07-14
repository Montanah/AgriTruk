import { Booking } from '@/mocks/bookings'; // Update path if needed
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Props = {
  visible: boolean;
  job: Booking | null;
  transporter: Booking['assignedTransporter'] | null;
  onClose: () => void;
};

const AssignTransporterModal: React.FC<Props> = ({
  visible,
  job,
  transporter,
  onClose,
}) => {
  if (!job) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Assign Transporter</Text>
          <Text style={styles.label}>Job ID: {job.id}</Text>
          <Text style={styles.label}>
            Transporter: {transporter?.name || 'Not assigned'}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // TODO: Replace with actual assign logic (e.g. API call)
                console.log(`Transporter ${transporter?.name} assigned to Job ${job.id}`);
                onClose();
              }}
              style={[styles.button, styles.confirm]}
              disabled={!transporter}
            >
              <Text style={[styles.buttonText, styles.confirmText]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AssignTransporterModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  button: {
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  confirm: {
    backgroundColor: '#4CAF50',
    marginLeft: 10,
  },
  buttonText: {
    fontSize: 16,
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
