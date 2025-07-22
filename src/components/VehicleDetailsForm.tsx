import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Switch, Animated, Easing, StyleSheet } from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { fonts, spacing } from '../constants';

const VEHICLE_TYPES = [
  { label: 'Truck', value: 'truck', icon: (active: boolean) => <FontAwesome5 name="truck" size={28} color={active ? colors.white : colors.primary} /> },
  { label: 'Tractor', value: 'tractor', icon: (active: boolean) => <FontAwesome5 name="tractor" size={28} color={active ? colors.white : colors.secondary} /> },
  { label: 'Trailer', value: 'trailer', icon: (active: boolean) => <MaterialCommunityIcons name="truck-trailer" size={28} color={active ? colors.white : colors.tertiary} /> },
  { label: 'Tanker', value: 'tanker', icon: (active: boolean) => <MaterialCommunityIcons name="truck-cargo-container" size={28} color={active ? colors.white : colors.success} /> },
  { label: 'Flatbed', value: 'flatbed', icon: (active: boolean) => <MaterialCommunityIcons name="truck-flatbed" size={28} color={active ? colors.white : colors.primaryDark} /> },
  { label: 'Van', value: 'van', icon: (active: boolean) => <MaterialCommunityIcons name="van-utility" size={28} color={active ? colors.white : colors.secondary} /> },
  { label: 'Pickup', value: 'pickup', icon: (active: boolean) => <MaterialCommunityIcons name="car-pickup" size={28} color={active ? colors.white : colors.tertiary} /> },
  { label: 'Refrigerated Truck', value: 'refrigerated_truck', icon: (active: boolean) => <MaterialCommunityIcons name="snowflake" size={28} color={active ? colors.white : colors.success} /> },
  { label: 'Other', value: 'other', icon: (active: boolean) => <Ionicons name="car-outline" size={28} color={active ? colors.white : colors.text.primary} /> },
];

export default function VehicleDetailsForm({
  initial,
  onChange,
  onPhotoAdd,
  onPhotoRemove,
  onFilePick,
  vehiclePhotos,
  error,
}) {
  // State for dropdowns and fields
  const [vehicleType, setVehicleType] = useState(initial?.vehicleType || '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [vehicleMake, setVehicleMake] = useState(initial?.vehicleMake || '');
  const [vehicleColor, setVehicleColor] = useState(initial?.vehicleColor || '');
  const [makeDropdownOpen, setMakeDropdownOpen] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [registration, setRegistration] = useState(initial?.registration || '');
  const [maxCapacity, setMaxCapacity] = useState(initial?.maxCapacity || '');
  const [year, setYear] = useState(initial?.year || '');
  const [driveType, setDriveType] = useState(initial?.driveType || '');
  const [bodyType, setBodyType] = useState(initial?.bodyType || 'closed');
  const [humidityControl, setHumidityControl] = useState(initial?.humidityControl || false);
  const [refrigeration, setRefrigeration] = useState(initial?.refrigeration || false);
  const [vehicleFeatures, setVehicleFeatures] = useState(initial?.vehicleFeatures || '');
  const [specialFragile, setSpecialFragile] = useState(initial?.specialFeatures?.includes('fragile') || false);
  const [specialOversized, setSpecialOversized] = useState(initial?.specialFeatures?.includes('oversized') || false);
  const [specialHazardous, setSpecialHazardous] = useState(initial?.specialFeatures?.includes('hazardous') || false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: dropdownOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dropdownOpen]);

  // Call onChange with all values when any field changes
  useEffect(() => {
    onChange && onChange({
      vehicleType,
      vehicleMake,
      vehicleColor,
      registration,
      maxCapacity,
      year,
      driveType,
      bodyType,
      humidityControl,
      refrigeration,
      vehicleFeatures,
    });
  }, [vehicleType, vehicleMake, vehicleColor, registration, maxCapacity, year, driveType, bodyType, humidityControl, refrigeration, vehicleFeatures]);

  return (
    <View style={styles.card}>
      {/* Make & Color Row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        {/* Make Dropdown */}
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Make</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            onPress={() => setMakeDropdownOpen((open) => !open)}
            activeOpacity={0.85}
          >
            <Text style={{ color: vehicleMake ? colors.text.primary : colors.text.light }}>
              {vehicleMake || 'Select make'}
            </Text>
            <Ionicons name={makeDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
          </TouchableOpacity>
          {makeDropdownOpen && (
            <View style={[styles.dropdownList, { zIndex: 100 }]}> 
              {['Isuzu', 'Scania', 'Fuso', 'Mercedes', 'Toyota', 'Hino', 'Tata', 'Other'].map(make => (
                <TouchableOpacity key={make} style={styles.dropdownItem} onPress={() => { setVehicleMake(make); setMakeDropdownOpen(false); }}>
                  <Text style={{ color: colors.text.primary }}>{make}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {/* Color Dropdown */}
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Color</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            onPress={() => setColorDropdownOpen((open) => !open)}
            activeOpacity={0.85}
          >
            <Text style={{ color: vehicleColor ? colors.text.primary : colors.text.light }}>
              {vehicleColor || 'Select color'}
            </Text>
            <Ionicons name={colorDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
          </TouchableOpacity>
          {colorDropdownOpen && (
            <View style={[styles.dropdownList, { zIndex: 100 }]}> 
              {['White', 'Blue', 'Red', 'Green', 'Yellow', 'Black', 'Grey', 'Other'].map(color => (
                <TouchableOpacity key={color} style={styles.dropdownItem} onPress={() => { setVehicleColor(color); setColorDropdownOpen(false); }}>
                  <Text style={{ color: colors.text.primary }}>{color}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
      <Text style={styles.label}>Vehicle Type</Text>
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownSelected}
          onPress={() => setDropdownOpen((open) => !open)}
          activeOpacity={0.85}
        >
          {vehicleType ? (
            <View style={styles.dropdownSelectedContent}>
              {VEHICLE_TYPES.find((t) => t.value === vehicleType)?.icon(true)}
              <Text style={styles.dropdownSelectedText}>
                {VEHICLE_TYPES.find((t) => t.value === vehicleType)?.label}
              </Text>
              <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} style={{ marginLeft: 8 }} />
            </View>
          ) : (
            <View style={styles.dropdownSelectedContent}>
              <Ionicons name="car-outline" size={24} color={colors.text.light} />
              <Text style={[styles.dropdownSelectedText, { color: colors.text.light }]}>Select vehicle type</Text>
              <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} style={{ marginLeft: 8 }} />
            </View>
          )}
        </TouchableOpacity>
        <Animated.View
          pointerEvents={dropdownOpen ? 'auto' : 'none'}
          style={[
            styles.dropdownOptions,
            {
              opacity: dropdownAnim,
              transform: [
                {
                  translateY: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }),
                },
                {
                  scale: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }),
                },
              ],
            },
          ]}
        >
          {VEHICLE_TYPES.map((type, idx) => (
            <Animated.View
              key={type.value}
              style={{
                opacity: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                transform: [
                  {
                    translateY: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.dropdownOption,
                  vehicleType === type.value && styles.dropdownOptionActive,
                ]}
                onPress={() => {
                  setVehicleType(type.value);
                  setDropdownOpen(false);
                }}
                activeOpacity={0.85}
              >
                {type.icon(vehicleType === type.value)}
                <Text style={styles.dropdownOptionText}>{type.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      </View>
      {/* Body Type Row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Body Type</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.input, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: bodyType === 'closed' ? colors.primary : colors.background, borderColor: bodyType === 'closed' ? colors.primary : colors.text.light }]}
              onPress={() => setBodyType('closed')}
            >
              <Text style={{ color: bodyType === 'closed' ? '#fff' : colors.text.primary, fontWeight: 'bold' }}>Closed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.input, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: bodyType === 'open' ? colors.primary : colors.background, borderColor: bodyType === 'open' ? colors.primary : colors.text.light }]}
              onPress={() => setBodyType('open')}
            >
              <Text style={{ color: bodyType === 'open' ? '#fff' : colors.text.primary, fontWeight: 'bold' }}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Capacity, Year, Drive Type Row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Capacity (tons)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 7.5"
            keyboardType="numeric"
            value={maxCapacity}
            onChangeText={setMaxCapacity}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Year</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2018"
            keyboardType="numeric"
            value={year}
            onChangeText={setYear}
            maxLength={4}
          />
        </View>
      </View>
      {/* Drive Type Row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Drive Type</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.input, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: driveType === '2WD' ? colors.primary : colors.background, borderColor: driveType === '2WD' ? colors.primary : colors.text.light }]}
              onPress={() => setDriveType('2WD')}
            >
              <Text style={{ color: driveType === '2WD' ? '#fff' : colors.text.primary, fontWeight: 'bold' }}>2WD</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.input, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: driveType === '4WD' ? colors.primary : colors.background, borderColor: driveType === '4WD' ? colors.primary : colors.text.light }]}
              onPress={() => setDriveType('4WD')}
            >
              <Text style={{ color: driveType === '4WD' ? '#fff' : colors.text.primary, fontWeight: 'bold' }}>4WD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Text style={styles.label}>Registration Number</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. KDA 123A"
        value={registration}
        onChangeText={setRegistration}
        autoCapitalize="characters"
      />
      <View style={styles.switchRow}>
        <Text style={styles.label}>Humidity Control Facility</Text>
        <Switch
          value={humidityControl}
          onValueChange={setHumidityControl}
          thumbColor={humidityControl ? colors.primary : '#ccc'}
          trackColor={{ true: colors.primary, false: '#ccc' }}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Refrigeration Facility</Text>
        <Switch
          value={refrigeration}
          onValueChange={setRefrigeration}
          thumbColor={refrigeration ? colors.primary : '#ccc'}
          trackColor={{ true: colors.primary, false: '#ccc' }}
        />
      </View>
      <Text style={styles.label}>Other Features</Text>
      <TextInput
        style={styles.input}
        placeholder="Comma separated features"
        value={vehicleFeatures}
        onChangeText={setVehicleFeatures}
      />
      {/* Vehicle Photos */}
      <Text style={styles.label}>Vehicle Photos</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: spacing.md, width: '100%' }}>
        {vehiclePhotos.map((img, idx) => (
          <View key={idx} style={{ position: 'relative', marginRight: 10, marginBottom: 10 }}>
            <Image source={{ uri: img.uri }} style={{ width: 70, height: 70, borderRadius: 12, backgroundColor: '#eee' }} />
            <TouchableOpacity style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12, elevation: 2 }} onPress={() => onPhotoRemove(idx)}>
              <Ionicons name="close-circle" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        {vehiclePhotos.length < 4 && (
          <TouchableOpacity style={{ alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 12, borderWidth: 1.2, borderColor: colors.primary, backgroundColor: '#fafbfc', marginBottom: 10 }} onPress={onPhotoAdd}>
            <Ionicons name="add-circle" size={38} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: fonts.size.sm, marginTop: 2 }}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={{ color: colors.error, marginBottom: spacing.md, fontSize: fonts.size.md, textAlign: 'center' }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1.2,
    borderColor: colors.text.light,
    borderRadius: 10,
    padding: 12,
    fontSize: fonts.size.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    width: '100%',
  },
  dropdownContainer: {
    width: '100%',
    marginBottom: spacing.md,
    position: 'relative',
    zIndex: 10,
  },
  dropdownSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: colors.text.light,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    elevation: 1,
  },
  dropdownSelectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownSelectedText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginLeft: 10,
  },
  dropdownOptions: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: colors.text.light,
    shadowColor: colors.black,
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 20,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dropdownOptionActive: {
    backgroundColor: colors.primary + '11',
  },
  dropdownOptionText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '500',
    marginLeft: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
});
