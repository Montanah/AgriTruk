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
        <Pressable style={styles.item} onPress={() => onSelect(item)}>
          <View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.details}>
              {item.vehicleType} • {item.plateNumber}
            </Text>
          </View>
          <Text style={[styles.status, item.subscriptionActive ? styles.active : styles.inactive]}>
            {item.subscriptionActive ? 'Active' : 'Inactive'}
          </Text>
        </Pressable>
      )}
    />
  );
};

export default TransporterList;

const styles = StyleSheet.create({
  list: {
    padding: 12,
  },
  item: {
    padding: 12,
    marginBottom: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  details: {
    fontSize: 14,
    color: theme.colors.mutedText,
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
