import React, { useState } from 'react';
import { useConsolidations } from '../../context/ConsolidationContext';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import Spacer from '../../components/common/Spacer';
import Button from '../../components/common/Button';
import { useNavigation } from '@react-navigation/native';
import FindTransporters from '../../components/FindTransporters';

const SERVICES = [
  {
    key: 'agriTRUK',
    label: 'Agri',
    accent: colors.primary,
    icon: <FontAwesome5 name="tractor" size={20} color={colors.primary} />,
  },
  {
    key: 'cargoTRUK',
    label: 'Cargo',
    accent: colors.secondary,
    icon: <MaterialCommunityIcons name="truck" size={22} color={colors.secondary} />,
  },
];

const CARGO_SPECIALS = [
  { key: 'fragile', label: 'Fragile' },
  { key: 'oversized', label: 'Oversized' },
  { key: 'hazardous', label: 'Hazardous' },
  { key: 'temperature', label: 'Temperature Controlled' },
  { key: 'highvalue', label: 'High Value' },
  { key: 'livestock', label: 'Livestock/Animals' },
  { key: 'bulk', label: 'Bulk' },
  { key: 'perishable', label: 'Perishable' },
  { key: 'other', label: 'Other' },
];
const AGRI_PERISHABLES = [
  { key: 'refrigerated', label: 'Refrigerated' },
  { key: 'humidity', label: 'Humidity Control' },
  { key: 'fast', label: 'Fast Delivery' },
];
const PRODUCT_SUGGESTIONS = [
  'Maize', 'Fruits', 'Beans', 'Wheat', 'Rice', 'Vegetables', 'Coffee', 'Tea', 'Livestock',
  'Machinery', 'Electronics', 'Furniture', 'Clothing', 'Chemicals', 'Other',
];

const BusinessRequestScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('agriTRUK');
  const [requestType, setRequestType] = useState<'instant' | 'booking'>('instant');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [productType, setProductType] = useState('');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [isPriority, setIsPriority] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState('');
  // Use global consolidation context
  const { consolidations, addConsolidation, removeConsolidation, clearConsolidations } = useConsolidations();
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [insureGoods, setInsureGoods] = useState(false);
  const [insuranceValue, setInsuranceValue] = useState('');
  const [isPerishable, setIsPerishable] = useState(false);
  const [perishableSpecs, setPerishableSpecs] = useState<string[]>([]);
  const [isSpecialCargo, setIsSpecialCargo] = useState(false);
  const [specialCargoSpecs, setSpecialCargoSpecs] = useState<string[]>([]);
  const [specialRequestToTransporter, setSpecialRequestToTransporter] = useState('');

  // Add to consolidation list (global) with feedback and validation
  const [justAdded, setJustAdded] = useState(false);
  const [formError, setFormError] = useState('');
  const validateForm = () => {
    if (!fromLocation || !toLocation || !productType || !weight) {
      setFormError('Please fill in all required fields: From, To, Product Type, and Weight.');
      return false;
    }
    setFormError('');
    return true;
  };
  const handleAddToConsolidate = () => {
    if (!validateForm()) return;
    addConsolidation({
      fromLocation,
      toLocation,
      productType,
      weight,
      requestType,
      date,
      isBulk,
      isPriority,
      isRecurring,
      recurringFreq,
      insureGoods,
      insuranceValue,
      isPerishable,
      perishableSpecs,
      isSpecialCargo,
      specialCargoSpecs,
      specialRequestToTransporter,
      type: activeTab,
    });
    setFromLocation('');
    setToLocation('');
    setProductType('');
    setWeight('');
    setDate('');
    setIsBulk(false);
    setIsPriority(false);
    setIsRecurring(false);
    setRecurringFreq('');
    setInsureGoods(false);
    setInsuranceValue('');
    setIsPerishable(false);
    setPerishableSpecs([]);
    setIsSpecialCargo(false);
    setSpecialCargoSpecs([]);
    setSpecialRequestToTransporter('');
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  // Remove from consolidation list (global)
  const handleRemoveFromConsolidate = (id: string) => {
    removeConsolidation(id);
  };

  // State to control showing transporter selection
  const [showTransporters, setShowTransporters] = useState(false);
  // Submit request (single or consolidated) with validation
  const handleSubmit = () => {
    if (!validateForm()) return;
    if (requestType === 'instant') {
      setShowTransporters(true);
    } else if (consolidations.length > 0) {
      alert('Consolidated request submitted!');
      clearConsolidations();
    } else {
      alert('Request submitted!');
    }
  };

  // Cost estimate (mocked)
  const costEstimate = weight ? `KES ${(parseFloat(weight) * 120).toLocaleString()}` : '---';

  const accent = activeTab === 'agriTRUK' ? colors.primary : colors.secondary;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      {/* Sticky Header with Back Button and Segmented Tabs */}
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={26} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>New Request</Text>
        </View>
        <View style={styles.segmentedTabsWrap}>
          <View style={styles.segmentedTabsBg}>
            <TouchableOpacity
              style={[styles.segmentedTab, activeTab === 'agriTRUK' && styles.segmentedTabActive, { borderTopLeftRadius: 22, borderBottomLeftRadius: 22 }]}
              onPress={() => setActiveTab('agriTRUK')}
              activeOpacity={0.9}
            >
              <FontAwesome5 name="tractor" size={18} color={activeTab === 'agriTRUK' ? colors.white : colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.segmentedTabLabel, activeTab === 'agriTRUK' && styles.segmentedTabLabelActive]}>Agri</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentedTab, activeTab === 'cargoTRUK' && styles.segmentedTabActive, { borderTopRightRadius: 22, borderBottomRightRadius: 22 }]}
              onPress={() => setActiveTab('cargoTRUK')}
              activeOpacity={0.9}
            >
              <MaterialCommunityIcons name="truck" size={20} color={activeTab === 'cargoTRUK' ? colors.white : colors.secondary} style={{ marginRight: 8 }} />
              <Text style={[styles.segmentedTabLabel, activeTab === 'cargoTRUK' && styles.segmentedTabLabelActive]}>Cargo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Request Type Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, requestType === 'instant' && styles.toggleBtnActive]}
            onPress={() => setRequestType('instant')}
          >
            <Text style={[styles.toggleLabel, requestType === 'instant' && styles.toggleLabelActive]}>Instant</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, requestType === 'booking' && styles.toggleBtnActive]}
            onPress={() => setRequestType('booking')}
          >
            <Text style={[styles.toggleLabel, requestType === 'booking' && styles.toggleLabelActive]}>Booking</Text>
          </TouchableOpacity>
        </View>
        {/* Type Options: Bulk, Priority, Recurring */}
        <View style={styles.typeOptionsRow}>
          <TouchableOpacity
            style={[styles.typeOptionBtn, isBulk && styles.typeOptionBtnActive]}
            onPress={() => setIsBulk((v) => !v)}
          >
            <MaterialCommunityIcons name="cube" size={20} color={isBulk ? colors.white : colors.primary} />
            <Text style={[styles.typeOptionLabel, isBulk && styles.typeOptionLabelActive]}>Bulk</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOptionBtn, isPriority && styles.typeOptionBtnActive]}
            onPress={() => setIsPriority((v) => !v)}
          >
            <MaterialCommunityIcons name="star" size={20} color={isPriority ? colors.white : colors.primary} />
            <Text style={[styles.typeOptionLabel, isPriority && styles.typeOptionLabelActive]}>Priority</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOptionBtn, isRecurring && styles.typeOptionBtnActive]}
            onPress={() => setIsRecurring((v) => !v)}
          >
            <MaterialCommunityIcons name="repeat" size={20} color={isRecurring ? colors.white : colors.primary} />
            <Text style={[styles.typeOptionLabel, isRecurring && styles.typeOptionLabelActive]}>Recurring</Text>
          </TouchableOpacity>
        </View>
        {isRecurring && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Frequency (e.g. Daily, Weekly)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter frequency"
              value={recurringFreq}
              onChangeText={setRecurringFreq}
              placeholderTextColor={colors.text.light}
            />
          </View>
        )}
        {/* Form Fields */}
        <View style={styles.formCard}>
          {formError ? (
            <View style={{ alignItems: 'center', marginBottom: 10 }}>
              <View style={{ backgroundColor: colors.error, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={colors.white} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 15 }}>{formError}</Text>
              </View>
            </View>
          ) : null}
          {justAdded && (
            <View style={{ alignItems: 'center', marginBottom: 10 }}>
              <View style={{ backgroundColor: colors.success, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 15 }}>Added!</Text>
              </View>
            </View>
          )}
          <Text style={styles.label}>From</Text>
          <TextInput
            style={styles.input}
            placeholder="Pickup location"
            value={fromLocation}
            onChangeText={setFromLocation}
            placeholderTextColor={colors.text.light}
          />
          <Text style={styles.label}>To</Text>
          <TextInput
            style={styles.input}
            placeholder="Drop-off location"
            value={toLocation}
            onChangeText={setToLocation}
            placeholderTextColor={colors.text.light}
          />
          <Text style={styles.label}>Product Type</Text>
          <TextInput
            style={styles.input}
            placeholder={activeTab === 'agriTRUK' ? 'e.g. Maize, Fruits, Beans…' : 'e.g. Electronics, Furniture, Clothing…'}
            value={productType}
            onChangeText={text => {
              setProductType(text);
              setShowProductSuggestions(text.length > 0);
            }}
            onFocus={() => setShowProductSuggestions(productType.length > 0)}
            onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
            placeholderTextColor={colors.text.light}
          />
          {showProductSuggestions && (
            <View style={styles.suggestionBox}>
              {PRODUCT_SUGGESTIONS.filter(p => p.toLowerCase().includes(productType.toLowerCase())).map(suggestion => (
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
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter weight"
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
            placeholderTextColor={colors.text.light}
          />
          {requestType === 'booking' && (
            <>
              <Text style={styles.label}>Pickup Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.85}
              >
                <Text style={{ color: date ? colors.text.primary : colors.text.light }}>
                  {date ? (typeof date === 'string' ? date : (date instanceof Date ? date.toLocaleString() : '')) : 'Select pickup date'}
                </Text>
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={showDatePicker}
                mode="datetime"
                date={date && typeof date !== 'string' ? date : new Date()}
                onConfirm={d => {
                  setDate(d);
                  setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
              />
            </>
          )}
          {/* Insurance Switcher */}
          <View style={styles.switchRow}>
            <Text style={styles.label}>Insure Goods?</Text>
            <TouchableOpacity
              style={[styles.switchBtn, insureGoods && styles.switchBtnActive]}
              onPress={() => setInsureGoods((v) => !v)}
              activeOpacity={0.85}
            >
              <View style={[styles.switchKnob, insureGoods && styles.switchKnobActive]} />
              <Text style={[styles.switchText, insureGoods && styles.switchTextActive]}>{insureGoods ? 'Yes' : 'No'}</Text>
            </TouchableOpacity>
          </View>
          {insureGoods && (
            <View>
              <Text style={styles.label}>Value of Goods</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter value"
                keyboardType="numeric"
                value={insuranceValue}
                onChangeText={setInsuranceValue}
                placeholderTextColor={colors.text.light}
              />
            </View>
          )}
          {/* Perishable/Special Options */}
          {activeTab === 'agriTRUK' && (
            <View style={{ marginTop: 8 }}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Perishable?</Text>
                <TouchableOpacity
                  style={[styles.switchBtn, isPerishable && styles.switchBtnActive]}
                  onPress={() => setIsPerishable((v) => !v)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.switchKnob, isPerishable && styles.switchKnobActive]} />
                  <Text style={[styles.switchText, isPerishable && styles.switchTextActive]}>{isPerishable ? 'Yes' : 'No'}</Text>
                </TouchableOpacity>
              </View>
              {isPerishable && (
                <View style={styles.chipRow}>
                  {AGRI_PERISHABLES.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.chip, perishableSpecs.includes(item.key) && { backgroundColor: accent, borderColor: accent }]}
                      onPress={() =>
                        setPerishableSpecs((prev) =>
                          prev.includes(item.key)
                            ? prev.filter((k) => k !== item.key)
                            : [...prev, item.key],
                        )
                      }
                    >
                      <Text style={[styles.chipText, perishableSpecs.includes(item.key) && { color: colors.white }]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          {activeTab === 'cargoTRUK' && (
            <View style={{ marginTop: 8 }}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Special Cargo?</Text>
                <TouchableOpacity
                  style={[styles.switchBtn, isSpecialCargo && styles.switchBtnActive]}
                  onPress={() => setIsSpecialCargo((v) => !v)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.switchKnob, isSpecialCargo && styles.switchKnobActive]} />
                  <Text style={[styles.switchText, isSpecialCargo && styles.switchTextActive]}>{isSpecialCargo ? 'Yes' : 'No'}</Text>
                </TouchableOpacity>
              </View>
              {isSpecialCargo && (
                <View style={styles.chipRow}>
                  {CARGO_SPECIALS.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.chip, specialCargoSpecs.includes(item.key) && { backgroundColor: accent, borderColor: accent }]}
                      onPress={() =>
                        setSpecialCargoSpecs((prev) =>
                          prev.includes(item.key)
                            ? prev.filter((k) => k !== item.key)
                            : [...prev, item.key],
                        )
                      }
                    >
                      <Text style={[styles.chipText, specialCargoSpecs.includes(item.key) && { color: colors.white }]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
        {/* Special Request to Transporter (optional) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Special Request to Transporter (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Message to transporter (max 100 chars)"
            value={specialRequestToTransporter || ''}
            onChangeText={text => setSpecialRequestToTransporter(text.slice(0, 100))}
            placeholderTextColor={colors.text.light}
            maxLength={100}
          />
          <Text style={{ alignSelf: 'flex-end', color: colors.text.light, fontSize: 12 }}>
            {(specialRequestToTransporter || '').length}/100
          </Text>
        </View>
        <Spacer size={18} />
        {/* Consolidation List */}
        {consolidations.length > 0 && (
          <View style={styles.consolidateCard}>
            <Text style={styles.consolidateTitle}>Consolidation List</Text>
            {consolidations.map((item, idx) => (
              <View key={item.id || idx} style={styles.consolidateItem}>
                <Text style={styles.consolidateText}>{item.fromLocation} → {item.toLocation} | {item.productType} | {item.weight}kg | {item.type === 'agriTRUK' ? 'Agri' : 'Cargo'}</Text>
                <TouchableOpacity onPress={() => handleRemoveFromConsolidate(item.id || '')}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.consolidateBtn]} onPress={handleAddToConsolidate}>
            <MaterialCommunityIcons name="layers-plus" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Consolidate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.submitBtn]} onPress={handleSubmit}>
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Submit</Text>
          </TouchableOpacity>
        </View>
        {/* Show FindTransporters for instant requests */}
        {showTransporters && requestType === 'instant' && (
          <FindTransporters
            requests={consolidations.length > 0 ? consolidations : [{
              fromLocation,
              toLocation,
              productType,
              weight,
              value: insureGoods ? insuranceValue : '',
              insureGoods,
              additional: '',
              perishableSpecs,
              specialCargoSpecs,
              // Add more fields as needed
            }]}
            distance={''}
            accent={accent}
          />
        )}
        <Spacer size={40} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerWrap: {
    backgroundColor: colors.background,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 18 : 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
  },
  backBtn: {
    marginRight: 12,
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: fonts.family.bold,
  },
  segmentedTabsWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  segmentedTabsBg: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 4,
    width: 260,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  segmentedTabActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 2,
  },
  segmentedTabLabel: {
    fontSize: fonts.size.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  segmentedTabLabelActive: {
    color: colors.white,
  },
  tabRow: {
    display: 'none', // Hide old tab row
  },
  tabUnderline: {
    display: 'none', // Hide old underline
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 18,
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 18,
    backgroundColor: colors.surface,
    marginHorizontal: 8,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleLabel: {
    fontSize: fonts.size.md,
    color: colors.primary,
    fontWeight: '600',
  },
  toggleLabelActive: {
    color: colors.white,
  },
  typeOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginHorizontal: 6,
    minWidth: 90,
    justifyContent: 'center',
  },
  typeOptionBtnActive: {
    backgroundColor: colors.secondary,
  },
  typeOptionLabel: {
    fontSize: fonts.size.md,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  typeOptionLabelActive: {
    color: colors.white,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.text.light,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: fonts.size.md,
    backgroundColor: colors.background,
    color: colors.text.primary,
    marginBottom: 8,
  },
  suggestionBox: {
    position: 'absolute',
    top: 180,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
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
  chipText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 2,
    width: '100%',
    gap: 12,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: colors.text.light,
    backgroundColor: colors.surface,
    minWidth: 90,
    justifyContent: 'center',
  },
  switchBtnActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    marginRight: 10,
  },
  switchKnobActive: {
    backgroundColor: colors.white,
  },
  switchText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
    textAlignVertical: 'center',
    textAlign: 'center',
  },
  switchTextActive: {
    color: colors.white,
  },
  estimateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  estimateLabel: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginRight: 8,
  },
  estimateValue: {
    fontSize: fonts.size.lg,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  consolidateCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  consolidateTitle: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 8,
  },
  consolidateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  consolidateText: {
    fontSize: fonts.size.sm,
    color: colors.text.primary,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: 16,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  consolidateBtn: {
    backgroundColor: colors.secondary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
    marginLeft: 4,
  },
});

export default BusinessRequestScreen;
