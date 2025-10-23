import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Card from '../../components/common/Card';
import Spacer from '../../components/common/Spacer';
import Button from '../../components/common/Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';

// Real data from API - no mock data

const TrackingManagementScreen = ({ navigation }: any) => {
  // TODO: Implement real data fetching from API
  const shipments: any[] = [];
  
  const renderShipment = ({ item }: any) => (
    <TouchableOpacity style={styles.itemRow} activeOpacity={0.85}>
      <Card style={styles.itemCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemId}>{item.id}</Text>
          <Text style={styles.itemRoute}>{item.from} → {item.to}</Text>
          <Text style={styles.itemMeta}>{item.type}</Text>
        </View>
        <View style={styles.statusWrap}>
          <Text style={[
            styles.status,
            item.status === 'Delivered' ? styles.statusDelivered :
            item.status === 'In Transit' ? styles.statusInTransit :
            styles.statusPending,
          ]}>{item.status}</Text>
          <Text style={styles.itemDate}>{item.date}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Track & Manage Shipments</Text>
      <FlatList
        data={shipments}
        renderItem={renderShipment}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Spacer size={12} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
      <Button
        title="Request New Shipment"
        onPress={() => navigation.navigate('BusinessRequest')}
        style={styles.newBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 18,
    fontFamily: fonts.family.bold,
  },
  itemRow: {
    width: '100%',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  itemId: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    fontWeight: 'bold',
  },
  itemRoute: {
    fontSize: fonts.size.md,
    color: colors.primary,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: fonts.size.sm,
    color: colors.secondary,
    fontWeight: '500',
  },
  statusWrap: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  status: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 2,
    textAlign: 'right',
  },
  statusDelivered: {
    backgroundColor: colors.success + '22',
    color: colors.success,
  },
  statusInTransit: {
    backgroundColor: colors.secondary + '22',
    color: colors.secondary,
  },
  statusPending: {
    backgroundColor: colors.primary + '22',
    color: colors.primary,
  },
  itemDate: {
    fontSize: fonts.size.xs,
    color: colors.text.light,
  },
  newBtn: {
    marginTop: 18,
    width: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingVertical: 16,
  },
});

export default TrackingManagementScreen;
