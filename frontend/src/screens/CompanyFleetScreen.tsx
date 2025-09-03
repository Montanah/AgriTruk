import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { fonts, spacing } from '../constants';

// Placeholder data structure
const initialVehicles = [
  // Example vehicle
  // {
  //   id: 'veh1',
  //   registration: 'KDA 123A',
  //   type: 'Truck',
  //   status: 'active',
  //   revenue: 120000,
  //   trips: 34,
  //   driver: { name: 'John Doe' },
  //   photos: [],
  // }
];

export default function CompanyFleetScreen() {
  const [vehicles, setVehicles] = useState(initialVehicles);

  // Placeholder for add/edit/delete logic
  const handleAddVehicle = () => {
    // TODO: Show add vehicle modal/form
  };

  const handleEditVehicle = (vehicleId) => {
    // TODO: Show edit vehicle modal/form
  };

  const handleDeleteVehicle = (vehicleId) => {
    // TODO: Confirm and delete vehicle
  };

  const renderVehicle = ({ item }) => (
    <TouchableOpacity style={styles.vehicleCard} onPress={() => handleEditVehicle(item.id)}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="truck" size={36} color={colors.primary} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.vehicleReg}>{item.registration}</Text>
          <Text style={styles.vehicleType}>{item.type}</Text>
          <Text style={styles.vehicleStatus}>{item.status === 'active' ? 'Active' : 'Inactive'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.vehicleRevenue}>Ksh {item.revenue?.toLocaleString() || '0'}</Text>
          <Text style={styles.vehicleTrips}>{item.trips || 0} trips</Text>
        </View>
      </View>
      {item.driver && (
        <View style={styles.driverRow}>
          <Ionicons name="person" size={18} color={colors.secondary} />
          <Text style={styles.driverName}>{item.driver.name}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteVehicle(item.id)}>
        <Ionicons name="trash" size={20} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Fleet Inventory</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddVehicle}>
          <Ionicons name="add-circle" size={32} color={colors.primary} />
          <Text style={styles.addBtnText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        renderItem={renderVehicle}
        ListEmptyComponent={<Text style={styles.emptyText}>No vehicles added yet.</Text>}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  header: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1.2,
    borderColor: colors.primary,
  },
  addBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: fonts.size.md,
  },
  vehicleCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
    position: 'relative',
  },
  vehicleReg: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  vehicleType: {
    fontSize: fonts.size.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  vehicleStatus: {
    fontSize: fonts.size.sm,
    color: colors.success,
    marginTop: 2,
  },
  vehicleRevenue: {
    fontSize: fonts.size.md,
    color: colors.primary,
    fontWeight: 'bold',
  },
  vehicleTrips: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  driverName: {
    marginLeft: 6,
    color: colors.secondary,
    fontWeight: '600',
    fontSize: fonts.size.sm,
  },
  deleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    elevation: 2,
  },
  emptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: fonts.size.md,
  },
});
