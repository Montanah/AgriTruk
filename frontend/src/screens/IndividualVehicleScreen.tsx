import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { fonts, spacing } from '../constants';

export default function IndividualVehicleScreen() {
  // Placeholder state for vehicle
  const [vehicle, setVehicle] = useState(null); // null means no vehicle added yet

  // Placeholder for add/edit logic
  const handleAddOrEditVehicle = () => {
    // TODO: Show add/edit vehicle modal/form
  };

  const handleDeleteVehicle = () => {
    // TODO: Confirm and delete vehicle
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>My Vehicle</Text>
      {vehicle ? (
        <View style={styles.vehicleCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="truck" size={36} color={colors.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleReg}>{vehicle.registration}</Text>
              <Text style={styles.vehicleType}>{vehicle.type}</Text>
              <Text style={styles.vehicleStatus}>{vehicle.status === 'active' ? 'Active' : 'Inactive'}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={handleAddOrEditVehicle}>
              <Ionicons name="create" size={20} color={colors.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteVehicle}>
              <Ionicons name="trash" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
          {/* Vehicle photos and documents can be shown here */}
        </View>
      ) : (
        <TouchableOpacity style={styles.addBtn} onPress={handleAddOrEditVehicle}>
          <Ionicons name="add-circle" size={32} color={colors.primary} />
          <Text style={styles.addBtnText}>Add Vehicle</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    alignItems: 'center',
  },
  header: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
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
    width: '100%',
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1.2,
    borderColor: colors.primary,
    marginTop: 40,
  },
  addBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: fonts.size.md,
  },
  editBtn: {
    marginLeft: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    elevation: 2,
  },
  deleteBtn: {
    marginLeft: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    elevation: 2,
  },
});
