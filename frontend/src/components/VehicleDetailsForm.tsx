import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { 
  Animated, 
  Easing, 
  Image, 
  StyleSheet, 
  Switch, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  Dimensions,
  Platform,
  ScrollView
} from 'react-native';
import { fonts, spacing } from '../constants';
import colors from '../constants/colors';

const { width: screenWidth } = Dimensions.get('window');

// Helper function to get color values for color indicators
const getColorValue = (colorName: string) => {
  const colorMap: { [key: string]: string } = {
    'White': '#FFFFFF',
    'Blue': '#3B82F6',
    'Red': '#EF4444',
    'Green': '#10B981',
    'Yellow': '#F59E0B',
    'Black': '#1F2937',
    'Grey': '#6B7280',
    'Other': '#9CA3AF'
  };
  return colorMap[colorName] || '#9CA3AF';
};

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


interface VehicleDetailsFormProps {
  initial?: any;
  onChange?: (data: any) => void;
  onPhotoAdd?: () => void;
  onPhotoRemove?: (index: number) => void;
  onFilePick?: () => void;
  vehiclePhotos: any[];
  error?: string;
}

export default function VehicleDetailsForm({
  initial,
  onChange,
  onPhotoAdd,
  onPhotoRemove,
  onFilePick,
  vehiclePhotos,
  error,
}: VehicleDetailsFormProps) {
  // State for dropdowns and fields
  const [vehicleType, setVehicleType] = useState(initial?.vehicleType || '');
  // Remove all picker/modal logic from here. Only call onPhotoAdd from the parent.
  const handlePhotoAdd = () => {
    onPhotoAdd && onPhotoAdd();
  };
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
  const [specialCargo, setSpecialCargo] = useState(initial?.specialCargo || false);
  const [vehicleFeatures, setVehicleFeatures] = useState(initial?.vehicleFeatures || '');
  // Removed unused special feature states
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: dropdownOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dropdownOpen, dropdownAnim]);

  // Call onChange with all values when any field changes
  useEffect(() => {
    onChange && onChange({
      vehicleType,
      vehicleMake,
      vehicleModel: vehicleMake, // Use vehicleMake as vehicleModel for backend compatibility
      vehicleColor,
      registration,
      maxCapacity,
      year,
      driveType,
      bodyType,
      humidityControl,
      refrigeration,
      specialCargo,
      vehicleFeatures,
    });
  }, [vehicleType, vehicleMake, vehicleColor, registration, maxCapacity, year, driveType, bodyType, humidityControl, refrigeration, specialCargo, vehicleFeatures, onChange]);

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name="truck-delivery" size={24} color={colors.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Vehicle Details</Text>
          <Text style={styles.headerSubtitle}>Tell us about your vehicle</Text>
        </View>
      </View>

      {/* Make & Color Row */}
      <View style={styles.rowContainer}>
        {/* Make Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            <MaterialCommunityIcons name="wrench" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            Make
          </Text>
          <TouchableOpacity
            style={[styles.modernInput, makeDropdownOpen && styles.inputFocused]}
            onPress={() => setMakeDropdownOpen((open) => !open)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !vehicleMake && styles.placeholderText]}>
              {vehicleMake || 'Select make'}
            </Text>
            <Ionicons 
              name={makeDropdownOpen ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={makeDropdownOpen ? colors.primary : colors.text.light} 
            />
          </TouchableOpacity>
          {makeDropdownOpen && (
            <View style={[styles.modernDropdownList, styles.scrollableDropdown]}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {['Isuzu', 'Scania', 'Fuso', 'Mercedes', 'Toyota', 'Hino', 'Tata', 'Other'].map((make, index) => (
                  <TouchableOpacity 
                    key={make} 
                    style={[
                      styles.modernDropdownItem,
                      index === 0 && styles.dropdownItemFirst,
                      index === 7 && styles.dropdownItemLast
                    ]} 
                    onPress={() => { 
                      setVehicleMake(make); 
                      setMakeDropdownOpen(false); 
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemText}>{make}</Text>
                    {vehicleMake === make && (
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        
        {/* Color Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            <MaterialCommunityIcons name="palette" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            Color
          </Text>
          <TouchableOpacity
            style={[styles.modernInput, colorDropdownOpen && styles.inputFocused]}
            onPress={() => setColorDropdownOpen((open) => !open)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !vehicleColor && styles.placeholderText]}>
              {vehicleColor || 'Select color'}
            </Text>
            <Ionicons 
              name={colorDropdownOpen ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={colorDropdownOpen ? colors.primary : colors.text.light} 
            />
          </TouchableOpacity>
          {colorDropdownOpen && (
            <View style={[styles.modernDropdownList, styles.scrollableDropdown]}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {['White', 'Blue', 'Red', 'Green', 'Yellow', 'Black', 'Grey', 'Other'].map((color, index) => (
                  <TouchableOpacity 
                    key={color} 
                    style={[
                      styles.modernDropdownItem,
                      index === 0 && styles.dropdownItemFirst,
                      index === 7 && styles.dropdownItemLast
                    ]} 
                    onPress={() => { 
                      setVehicleColor(color); 
                      setColorDropdownOpen(false); 
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.colorIndicator, { backgroundColor: getColorValue(color) }]} />
                    <Text style={styles.dropdownItemText}>{color}</Text>
                    {vehicleColor === color && (
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Vehicle Type Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="truck" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          Vehicle Type
        </Text>
        <TouchableOpacity
          style={[styles.modernInput, dropdownOpen && styles.inputFocused]}
          onPress={() => setDropdownOpen((open) => !open)}
          activeOpacity={0.7}
        >
          {vehicleType ? (
            <View style={styles.dropdownSelectedContent}>
              {VEHICLE_TYPES.find((t) => t.value === vehicleType)?.icon(true)}
              <Text style={styles.dropdownSelectedText}>
                {VEHICLE_TYPES.find((t) => t.value === vehicleType)?.label}
              </Text>
            </View>
          ) : (
            <View style={styles.dropdownSelectedContent}>
              <Ionicons name="car-outline" size={20} color={colors.text.light} />
              <Text style={[styles.dropdownSelectedText, { color: colors.text.light }]}>
                Select vehicle type
              </Text>
            </View>
          )}
          <Ionicons 
            name={dropdownOpen ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={dropdownOpen ? colors.primary : colors.text.light} 
          />
        </TouchableOpacity>
        
        {dropdownOpen && (
          <View style={[styles.modernDropdownList, styles.scrollableDropdown]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {VEHICLE_TYPES.map((type, index) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.modernDropdownItem,
                    index === 0 && styles.dropdownItemFirst,
                    index === VEHICLE_TYPES.length - 1 && styles.dropdownItemLast
                  ]}
                  onPress={() => {
                    setVehicleType(type.value);
                    setDropdownOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.vehicleTypeIconSmall}>
                    {type.icon(vehicleType === type.value)}
                  </View>
                  <Text style={styles.dropdownItemText}>{type.label}</Text>
                  {vehicleType === type.value && (
                    <Ionicons name="checkmark" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      {/* Body Type Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="truck-trailer" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          Body Type
        </Text>
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              bodyType === 'closed' && styles.optionButtonActive
            ]}
            onPress={() => setBodyType('closed')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="truck-cargo-container" 
              size={20} 
              color={bodyType === 'closed' ? colors.white : colors.primary} 
            />
            <Text style={[
              styles.optionButtonText,
              bodyType === 'closed' && styles.optionButtonTextActive
            ]}>
              Closed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              bodyType === 'open' && styles.optionButtonActive
            ]}
            onPress={() => setBodyType('open')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="truck-flatbed" 
              size={20} 
              color={bodyType === 'open' ? colors.white : colors.primary} 
            />
            <Text style={[
              styles.optionButtonText,
              bodyType === 'open' && styles.optionButtonTextActive
            ]}>
              Open
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Capacity & Year Row */}
      <View style={styles.rowContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            <MaterialCommunityIcons name="weight-kilogram" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            Capacity (tons)
          </Text>
          <TextInput
            style={styles.modernInput}
            placeholder="e.g. 7.5"
            placeholderTextColor={colors.text.light}
            keyboardType="numeric"
            value={maxCapacity}
            onChangeText={setMaxCapacity}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            <MaterialCommunityIcons name="calendar" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            Year
          </Text>
          <TextInput
            style={styles.modernInput}
            placeholder="e.g. 2018"
            placeholderTextColor={colors.text.light}
            keyboardType="numeric"
            value={year}
            onChangeText={setYear}
            maxLength={4}
          />
        </View>
      </View>

      {/* Drive Type Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="cog" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          Drive Type
        </Text>
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              driveType === '2WD' && styles.optionButtonActive
            ]}
            onPress={() => setDriveType('2WD')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="car" 
              size={20} 
              color={driveType === '2WD' ? colors.white : colors.primary} 
            />
            <Text style={[
              styles.optionButtonText,
              driveType === '2WD' && styles.optionButtonTextActive
            ]}>
              2WD
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              driveType === '4WD' && styles.optionButtonActive
            ]}
            onPress={() => setDriveType('4WD')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="car-settings" 
              size={20} 
              color={driveType === '4WD' ? colors.white : colors.primary} 
            />
            <Text style={[
              styles.optionButtonText,
              driveType === '4WD' && styles.optionButtonTextActive
            ]}>
              4WD
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Registration Number */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="card-account-details" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          Registration Number
        </Text>
        <TextInput
          style={styles.modernInput}
          placeholder="e.g. KDA 123A"
          placeholderTextColor={colors.text.light}
          value={registration}
          onChangeText={setRegistration}
          autoCapitalize="characters"
        />
      </View>

      {/* Features Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="cog-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          Vehicle Features
        </Text>
        
        {/* Humidity Control */}
        <View style={styles.featureRow}>
          <View style={styles.featureInfo}>
            <MaterialCommunityIcons name="water-percent" size={20} color={colors.primary} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Humidity Control</Text>
              <Text style={styles.featureDescription}>Control moisture levels in cargo</Text>
            </View>
          </View>
          <Switch
            value={humidityControl}
            onValueChange={setHumidityControl}
            thumbColor={humidityControl ? colors.white : colors.text.light}
            trackColor={{ true: colors.primary, false: colors.text.light + '40' }}
            ios_backgroundColor={colors.text.light + '40'}
          />
        </View>

        {/* Refrigeration */}
        <View style={styles.featureRow}>
          <View style={styles.featureInfo}>
            <MaterialCommunityIcons name="snowflake" size={20} color={colors.primary} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Refrigeration</Text>
              <Text style={styles.featureDescription}>Temperature-controlled cargo</Text>
            </View>
          </View>
          <Switch
            value={refrigeration}
            onValueChange={setRefrigeration}
            thumbColor={refrigeration ? colors.white : colors.text.light}
            trackColor={{ true: colors.primary, false: colors.text.light + '40' }}
            ios_backgroundColor={colors.text.light + '40'}
          />
        </View>

        {/* Special Cargo */}
        <View style={styles.featureRow}>
          <View style={styles.featureInfo}>
            <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Special Cargo</Text>
              <Text style={styles.featureDescription}>Handles hazardous or special materials</Text>
            </View>
          </View>
          <Switch
            value={specialCargo}
            onValueChange={setSpecialCargo}
            thumbColor={specialCargo ? colors.white : colors.text.light}
            trackColor={{ true: colors.primary, false: colors.text.light + '40' }}
            ios_backgroundColor={colors.text.light + '40'}
          />
        </View>

        {/* Other Features */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            <MaterialCommunityIcons name="plus-circle-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            Additional Features
          </Text>
          <TextInput
            style={styles.modernInput}
            placeholder="Separated by commas (e.g. GPS, Air Suspension, ABS)"
            placeholderTextColor={colors.text.light}
            value={vehicleFeatures}
            onChangeText={setVehicleFeatures}
            multiline
            numberOfLines={2}
          />
        </View>
      </View>
      {/* Vehicle Photos Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>
          <MaterialCommunityIcons name="camera" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          Vehicle Photos
        </Text>
        <Text style={styles.sectionDescription}>
          Add up to 4 photos of your vehicle (minimum 1 required)
        </Text>
        <Text style={styles.multiSelectHint}>
          💡 Tip: You can select multiple photos at once from your gallery
        </Text>
        <View style={styles.photosContainer}>
          {vehiclePhotos.map((img: any, idx: number) => (
            <View key={idx} style={styles.photoItem}>
              <Image source={{ uri: img.uri }} style={styles.photoImage} />
              <TouchableOpacity 
                style={styles.removePhotoButton} 
                onPress={() => onPhotoRemove && onPhotoRemove(idx)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          {vehiclePhotos.length < 4 && (
            <TouchableOpacity 
              style={styles.addPhotoButton} 
              onPress={handlePhotoAdd}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={32} color={colors.primary} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Container
  container: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  // Header Section
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fonts.size.lg + 2,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },

  // Row Container
  rowContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  // Input Container
  inputContainer: {
    flex: 1,
    position: 'relative',
  },

  // Labels
  label: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  multiSelectHint: {
    fontSize: fonts.size.xs,
    color: colors.primary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
    backgroundColor: colors.primary + '10',
    padding: spacing.xs,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },

  // Modern Input
  modernInput: {
    borderWidth: 1.5,
    borderColor: colors.text.light + '40',
    borderRadius: 12,
    padding: spacing.md,
    fontSize: fonts.size.md,
    backgroundColor: colors.background,
    color: colors.text.primary,
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  inputText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    flex: 1,
  },
  placeholderText: {
    color: colors.text.light,
  },

  // Modern Dropdown
  modernDropdownList: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 1000,
    paddingVertical: spacing.sm,
    maxHeight: 200,
  },
  scrollableDropdown: {
    maxHeight: 180, // Increased to show 3 items per view
  },
  modernDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  dropdownItemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  dropdownItemText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '500',
    flex: 1,
    marginLeft: spacing.sm,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.text.light,
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
  vehicleTypeIconSmall: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  // Section Container
  sectionContainer: {
    marginBottom: spacing.lg,
  },

  // Vehicle Type Grid
  vehicleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  vehicleTypeCard: {
    width: (screenWidth - 80) / 3,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.text.light + '30',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  vehicleTypeCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  vehicleTypeCardFirstInRow: {
    marginLeft: 0,
  },
  vehicleTypeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  vehicleTypeIconContainerActive: {
    backgroundColor: colors.white + '30',
  },
  vehicleTypeLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  vehicleTypeLabelActive: {
    color: colors.white,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Option Buttons
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.text.light + '30',
    gap: spacing.sm,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
  },
  optionButtonTextActive: {
    color: colors.white,
  },

  // Feature Rows
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  featureTitle: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
  },

  // Photos
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoItem: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.white,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primary + '05',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: fonts.size.sm,
    marginTop: 4,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fonts.size.sm,
    fontWeight: '500',
    marginLeft: spacing.sm,
    flex: 1,
  },
});
