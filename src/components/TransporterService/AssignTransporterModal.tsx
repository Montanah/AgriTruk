import { Booking } from '@/mocks/bookings';
import React, { useEffect, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type Transporter = Booking['assignedTransporter'] & {
  rating?: number;
  capacity?: string;
};

type Props = {
  visible: boolean;
  job: Booking | null;
  transporter: Transporter | null;
  transporters?: Transporter[]; // now dynamic
  onClose: () => void;
  onAssign?: (jobId: string, transporter: Transporter) => void;
};

// fallback mock transporters
const MOCK_TRANSPORTERS: Transporter[] = [
  { id: 't1', name: 'John Truck Co.', rating: 4.5, capacity: '10 tons' },
  { id: 't2', name: 'Swift Movers Ltd.', rating: 4.2, capacity: '8 tons' },
  { id: 't3', name: 'Reliable Haulers', rating: 4.8, capacity: '12 tons' },
];

const AssignTransporterModal: React.FC<Props> = ({
  visible,
  job,
  transporter,
  transporters = MOCK_TRANSPORTERS,
  onClose,
  onAssign,
}) => {
  const [selected, setSelected] = useState<Transporter | null>(transporter);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSelected(transporter);
  }, [transporter]);

  const filteredTransporters = useMemo(() => {
    return transporters.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, transporters]);

  if (!job) return null;

  const handleConfirm = () => {
    if (selected) {
      console.log(`Assigned ${selected.name} to job ${job.id}`);
      onAssign?.(job.id, selected);
      onClose();
    }
  };

  const renderTransporter = ({ item }: { item: Transporter }) => {
    const isSelected = selected?.id === item.id;
    const isAlreadyAssigned = job.assignedTransporter?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.transporterItem,
          isSelected && styles.selectedTransporter,
          isAlreadyAssigned && styles.disabledTransporter,
        ]}
        disabled={isAlreadyAssigned}
        onPress={() => setSelected(item)}
      >
        <Text
          style={[
            styles.transporterName,
            isSelected && styles.selectedTransporterText,
            isAlreadyAssigned && styles.disabledTransporterText,
          ]}
        >
          {item.name}
        </Text>
        <Text style={styles.transporterMeta}>
          {item.capacity} · ⭐ {item.rating?.toFixed(1) ?? 'N/A'}
        </Text>
        {isAlreadyAssigned && (
          <Text style={styles.assignedLabel}>Already Assigned</Text>
        )}
      </TouchableOpacity>
    );
  };

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

          <TextInput
            style={styles.searchInput}
            placeholder="Search transporter..."
            value={search}
            onChangeText={setSearch}
          />

          {filteredTransporters.length > 0 ? (
            <FlatList
              data={filteredTransporters}
              keyExtractor={(item) => item.id}
              renderItem={renderTransporter}
              contentContainerStyle={styles.transporterList}
            />
          ) : (
            <Text style={styles.emptyText}>No transporters found.</Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.button, styles.confirm]}
              disabled={!selected}
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
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 10,
    maxHeight: '85%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  label: {
    fontSize: 15,
    marginBottom: 12,
    fontWeight: '500',
    color: '#374151',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  transporterList: {
    paddingVertical: 8,
  },
  transporterItem: {
    padding: 12,
    marginVertical: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  transporterName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  transporterMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  assignedLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  selectedTransporter: {
    backgroundColor: '#2563EB',
  },
  selectedTransporterText: {
    color: '#FFF',
  },
  disabledTransporter: {
    backgroundColor: '#E5E7EB',
  },
  disabledTransporterText: {
    color: '#9CA3AF',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 16,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  button: {
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  confirm: {
    backgroundColor: '#10B981',
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
