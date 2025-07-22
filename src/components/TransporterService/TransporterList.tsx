import { theme } from '@/constants';
import { Transporter } from '@/types';
import React, { FC } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  transporters: Transporter[];
  onSelect: (transporter: Transporter) => void;
};

const TransporterList: FC<Props> = ({ transporters, onSelect }) => {
  return (
    <FlatList
      data={transporters}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={[styles.status, item.subscriptionActive ? styles.active : styles.inactive]}>
              {item.subscriptionActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Text style={styles.vehicleInfo}>
            {item.vehicleType}{item.bodyType ? ` (${item.bodyType})` : ''} • {item.vehicleMake} • {item.vehicleColor} • {item.capacity}T • {item.reg}
          </Text>
          <View style={styles.featuresRow}>
            {item.refrigeration && <Text style={styles.feature}>Refrigerated</Text>}
            {item.humidityControl && <Text style={styles.feature}>Humidity Ctrl</Text>}
            {item.specialCargo && item.specialCargo.length > 0 && <Text style={styles.feature}>Special: {item.specialCargo.join(', ')}</Text>}
          </View>
          <Text style={styles.est}>ETA: {item.est}</Text>
          <Pressable style={styles.selectBtn} onPress={() => onSelect(item)}>
            <Text style={styles.selectBtnText}>Select</Text>
          </Pressable>
        </View>
      )}
    />
  );
};

export default TransporterList;

const styles = StyleSheet.create({
  list: {
    padding: 12,
  },
  card: {
    padding: 14,
    marginBottom: 14,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  vehicleInfo: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '500',
    marginBottom: 4,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  feature: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.secondary,
    fontSize: 13,
    fontWeight: '500',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 2,
  },
  est: {
    fontSize: 13,
    color: theme.colors.mutedText,
    marginBottom: 8,
  },
  selectBtn: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 22,
    marginTop: 4,
  },
  selectBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  status: {
    fontSize: 13,
    fontWeight: '500',
  },
  active: {
    color: theme.colors.success,
  },
  inactive: {
    color: theme.colors.warning,
  },
});
