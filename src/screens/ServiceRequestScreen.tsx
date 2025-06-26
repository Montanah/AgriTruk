import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Animated,
  KeyboardAvoidingView,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import colors from '../constants/colors';
import { spacing, fonts } from '../constants';

const TAB_UNDERLINE_WIDTH = 120;
const TAB_COUNT = 2;
// The underline will be centered under each tab, so we calculate the left offset dynamically
function getUnderlineLeft(idx, containerWidth) {
  const tabWidth = (containerWidth - 2 * 16) / TAB_COUNT;
  return 16 + idx * tabWidth + (tabWidth - TAB_UNDERLINE_WIDTH) / 2;
}

const SERVICES = [
  {
    key: 'agriTRUK',
    label: 'agriTRUK',
    accent: colors.primary,
    icon: <FontAwesome5 name="tractor" size={22} color={colors.primary} />,
    bg: colors.surface,
  },
  {
    key: 'cargoTRUK',
    label: 'cargoTRUK',
    accent: colors.secondary,
    icon: <MaterialCommunityIcons name="truck" size={22} color={colors.secondary} />,
    bg: colors.surface,
  },
];

const CARGO_SPECIALS = [
  { key: 'fragile', label: 'Fragile' },
  { key: 'oversized', label: 'Oversized' },
  { key: 'hazardous', label: 'Hazardous' },
];

const AGRI_PERISHABLES = [
  { key: 'refrigerated', label: 'Refrigerated' },
  { key: 'humidity', label: 'Humidity Control' },
  { key: 'fast', label: 'Fast Delivery' },
];

const PRODUCT_SUGGESTIONS = [
  'Maize',
  'Fruits',
  'Beans',
  'Wheat',
  'Rice',
  'Vegetables',
  'Coffee',
  'Tea',
  'Livestock',
  'Machinery',
  'Electronics',
  'Furniture',
  'Clothing',
  'Chemicals',
  'Other',
];

const ServiceRequestScreen = () => {
  const [activeTab, setActiveTab] = useState('agriTRUK');
  const [fromLocation, setFromLocation] = useState('Current Location');
  const [toLocation, setToLocation] = useState('');
  const [productType, setProductType] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [isPerishable, setIsPerishable] = useState(false);
  const [perishableSpecs, setPerishableSpecs] = useState([]);
  const [isSpecialCargo, setIsSpecialCargo] = useState(false);
  const [specialCargoSpecs, setSpecialCargoSpecs] = useState([]);
  const [weight, setWeight] = useState('');
  const [value, setValue] = useState('');
  const [additional, setAdditional] = useState('');
  const [error, setError] = useState('');
  const [anim] = useState(new Animated.Value(0));
  const tabIndex = activeTab === 'agriTRUK' ? 0 : 1;
  const pan = useRef(new Animated.ValueXY()).current;
  const [containerWidth, setContainerWidth] = useState(0);

  // Animate tab underline
  const animateTab = (to) => {
    Animated.timing(anim, {
      toValue: to,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // PanResponder for swipe
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40 && activeTab === 'agriTRUK') {
          handleTabSwitch('cargoTRUK', 1);
        } else if (gestureState.dx > 40 && activeTab === 'cargoTRUK') {
          handleTabSwitch('agriTRUK', 0);
        }
      },
      onPanResponderMove: (_, gestureState) => {
        // Animate underline for both directions, regardless of tab
        let newValue = Math.max(0, Math.min(1, 0.5 - gestureState.dx / 240));
        anim.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Snap to the closest tab based on anim value
        if (anim._value < 0.5) {
          handleTabSwitch('agriTRUK', 0);
        } else {
          handleTabSwitch('cargoTRUK', 1);
        }
      },
    }),
  ).current;

  // Set system bar colors dynamically
  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(accent);
  }, [activeTab]);

  // Animate tab underline
  const handleTabSwitch = (key, idx) => {
    setActiveTab(key);
    animateTab(idx);
    setIsPerishable(false);
    setIsSpecialCargo(false);
    setPerishableSpecs([]);
    setSpecialCargoSpecs([]);
    setWeight('');
    setValue('');
    setAdditional('');
    setProductType('');
    setError('');
  };

  // Validation
  const isValid = () => {
    if (!fromLocation || !toLocation || !weight || !productType) return false;
    if (activeTab === 'agriTRUK' && isPerishable && perishableSpecs.length === 0) return false;
    if (activeTab === 'cargoTRUK' && isSpecialCargo && specialCargoSpecs.length === 0) return false;
    return true;
  };

  // Accent color for current tab
  const accent = activeTab === 'agriTRUK' ? colors.primary : colors.secondary;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      {/* View under status bar for background color */}
      <View
        style={{ height: Platform.OS === 'ios' ? 44 : 32, backgroundColor: accent, width: '100%' }}
      />
      <LinearGradient
        colors={[accent, colors.secondary, colors.primaryDark, '#222']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container} {...panResponder.panHandlers}>
            {/* Tab Switcher */}
            <View style={styles.tabRow}>
              {SERVICES.map((tab, idx) => (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tab}
                  onPress={() => handleTabSwitch(tab.key, idx)}
                  activeOpacity={0.85}
                >
                  <View style={styles.tabIcon}>{tab.icon}</View>
                  <Text style={[styles.tabLabel, activeTab === tab.key && { color: tab.accent }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Animated Underline */}
            <View
              style={styles.tabUnderlineWrap}
              onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
              <Animated.View
                style={[
                  styles.tabUnderline,
                  containerWidth && {
                    left: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        getUnderlineLeft(0, containerWidth),
                        getUnderlineLeft(1, containerWidth),
                      ],
                    }),
                  },
                  {
                    backgroundColor: colors.white,
                    shadowColor: accent,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 4,
                  },
                ]}
              />
            </View>
            {/* Form Card */}
            <View style={styles.formCard}>
              {/* From/To Locations */}
              <Text style={styles.label}>From</Text>
              <TouchableOpacity style={styles.locationInput}>
                <Ionicons name="locate" size={18} color={accent} style={{ marginRight: 8 }} />
                <Text style={styles.locationText}>{fromLocation}</Text>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
              <Text style={styles.label}>To</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter destination (autocomplete)"
                value={toLocation}
                onChangeText={setToLocation}
                placeholderTextColor={colors.text.light}
              />
              <Text style={styles.label}>Product Type</Text>
              <TextInput
                style={styles.input}
                placeholder={
                  activeTab === 'agriTRUK'
                    ? 'e.g. Maize, Fruits, Beans…'
                    : 'e.g. Electronics, Furniture, Clothing…'
                }
                value={productType}
                onChangeText={(text) => {
                  setProductType(text);
                  setShowProductSuggestions(text.length > 0);
                }}
                onFocus={() => setShowProductSuggestions(productType.length > 0)}
                onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
                placeholderTextColor={colors.text.light}
              />
              {showProductSuggestions && (
                <View style={styles.suggestionBox}>
                  {PRODUCT_SUGGESTIONS.filter((p) =>
                    p.toLowerCase().includes(productType.toLowerCase()),
                  ).map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setProductType(suggestion);
                        setShowProductSuggestions(false);
                      }}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Dynamic Fields */}
              {activeTab === 'agriTRUK' && (
                <>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, isPerishable && { backgroundColor: accent }]}
                      onPress={() => setIsPerishable((v) => !v)}
                    >
                      <MaterialCommunityIcons
                        name="snowflake"
                        size={18}
                        color={isPerishable ? colors.white : accent}
                      />
                      <Text style={[styles.toggleLabel, isPerishable && { color: colors.white }]}>
                        Perishable
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, !isPerishable && { backgroundColor: accent }]}
                      onPress={() => setIsPerishable(false)}
                    >
                      <MaterialCommunityIcons
                        name="leaf"
                        size={18}
                        color={!isPerishable ? colors.white : accent}
                      />
                      <Text style={[styles.toggleLabel, !isPerishable && { color: colors.white }]}>
                        Normal
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {isPerishable && (
                    <View style={styles.chipRow}>
                      {AGRI_PERISHABLES.map((item) => (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.chip,
                            perishableSpecs.includes(item.key) && {
                              backgroundColor: accent,
                              borderColor: accent,
                            },
                          ]}
                          onPress={() =>
                            setPerishableSpecs((prev) =>
                              prev.includes(item.key)
                                ? prev.filter((k) => k !== item.key)
                                : [...prev, item.key],
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.chipText,
                              perishableSpecs.includes(item.key) && { color: colors.white },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
              {activeTab === 'cargoTRUK' && (
                <>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, isSpecialCargo && { backgroundColor: accent }]}
                      onPress={() => setIsSpecialCargo((v) => !v)}
                    >
                      <MaterialCommunityIcons
                        name="alert-decagram"
                        size={18}
                        color={isSpecialCargo ? colors.white : accent}
                      />
                      <Text style={[styles.toggleLabel, isSpecialCargo && { color: colors.white }]}>
                        Special Cargo
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, !isSpecialCargo && { backgroundColor: accent }]}
                      onPress={() => setIsSpecialCargo(false)}
                    >
                      <MaterialCommunityIcons
                        name="cube-outline"
                        size={18}
                        color={!isSpecialCargo ? colors.white : accent}
                      />
                      <Text
                        style={[styles.toggleLabel, !isSpecialCargo && { color: colors.white }]}
                      >
                        Normal
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {isSpecialCargo && (
                    <View style={styles.chipRow}>
                      {CARGO_SPECIALS.map((item) => (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.chip,
                            specialCargoSpecs.includes(item.key) && {
                              backgroundColor: accent,
                              borderColor: accent,
                            },
                          ]}
                          onPress={() =>
                            setSpecialCargoSpecs((prev) =>
                              prev.includes(item.key)
                                ? prev.filter((k) => k !== item.key)
                                : [...prev, item.key],
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.chipText,
                              specialCargoSpecs.includes(item.key) && { color: colors.white },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
              {/* Common Fields */}
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter weight"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                placeholderTextColor={colors.text.light}
              />
              <Text style={styles.label}>Value (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter value"
                keyboardType="numeric"
                value={value}
                onChangeText={setValue}
                placeholderTextColor={colors.text.light}
              />
              <Text style={styles.label}>Additional/Special Request</Text>
              <TextInput
                style={styles.input}
                placeholder="Any additional info for the driver"
                value={additional}
                onChangeText={setAdditional}
                placeholderTextColor={colors.text.light}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryTitle, { color: accent }]}>Summary</Text>
                <Text style={styles.summaryText}>From: {fromLocation}</Text>
                <Text style={styles.summaryText}>To: {toLocation || '---'}</Text>
                <Text style={styles.summaryText}>Weight: {weight || '---'} kg</Text>
                {activeTab === 'agriTRUK' && isPerishable && (
                  <Text style={styles.summaryText}>
                    Perishable:{' '}
                    {perishableSpecs
                      .map((k) => AGRI_PERISHABLES.find((i) => i.key === k)?.label)
                      .join(', ') || '---'}
                  </Text>
                )}
                {activeTab === 'cargoTRUK' && isSpecialCargo && (
                  <Text style={styles.summaryText}>
                    Special Cargo:{' '}
                    {specialCargoSpecs
                      .map((k) => CARGO_SPECIALS.find((i) => i.key === k)?.label)
                      .join(', ') || '---'}
                  </Text>
                )}
                <Text style={styles.summaryText}>Value: {value || '---'}</Text>
                <Text style={styles.summaryText}>Notes: {additional || '---'}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.findBtn,
                  { backgroundColor: isValid() ? accent : colors.text.light },
                ]}
                disabled={!isValid()}
                onPress={() => {}}
              >
                <Text style={styles.findBtnText}>Find Drivers</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    marginHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabIcon: {
    marginRight: 8,
  },
  tabLabel: {
    fontSize: fonts.size.lg,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: colors.text.secondary,
  },
  tabUnderlineWrap: {
    height: 4,
    width: '100%',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    width: TAB_UNDERLINE_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 420,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    marginTop: 0,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  label: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: spacing.sm,
    width: '100%',
  },
  locationText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fonts.size.md,
  },
  changeText: {
    color: colors.secondary,
    fontWeight: 'bold',
    fontSize: fonts.size.sm,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.text.light,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fonts.size.md,
    backgroundColor: colors.background,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    width: '100%',
    justifyContent: 'center',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    marginHorizontal: 8,
  },
  toggleLabel: {
    fontSize: fonts.size.md,
    marginLeft: 6,
    fontWeight: '600',
    color: colors.text.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    marginTop: 2,
    width: '100%',
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.text.light,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  suggestionBox: {
    position: 'absolute',
    top: 240,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.text.light,
    zIndex: 100,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    maxHeight: 180,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '22',
  },
  suggestionText: {
    color: colors.text.primary,
    fontSize: fonts.size.md,
  },
  chipText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    width: '100%',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  findBtn: {
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  findBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.lg,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md,
    fontSize: fonts.size.md,
  },
});

export default ServiceRequestScreen;
