import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import * as Location from 'expo-location';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import { PRODUCT_SUGGESTIONS } from '../../constants/productSuggestions';
import spacing from '../../constants/spacing';
import { useConsolidations } from '../../context/ConsolidationContext';
import FindTransporters from '../FindTransporters';
import CompactLocationSection from './CompactLocationSection';
import ProductTypeInput from './ProductTypeInput';
import { generateRequestReadableId, generateConsolidationReadableId } from '../../utils/idUtils';

const SERVICES = [
    {
        key: 'agriTRUK',
        label: 'Agri',
        accent: colors.primary,
        icon: <FontAwesome5 name="tractor" size={22} color={colors.primary} />,
    },
    {
        key: 'cargoTRUK',
        label: 'Cargo',
        accent: colors.secondary,
        icon: <MaterialCommunityIcons name="truck" size={22} color={colors.secondary} />,
    },
];

// Product suggestions source moved to constants/productSuggestions.ts

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

const URGENCY_LEVELS = [
    { key: 'low', label: 'Low', color: colors.success, icon: 'clock-outline' },
    { key: 'medium', label: 'Medium', color: colors.warning, icon: 'clock' },
    { key: 'high', label: 'High', color: colors.error, icon: 'fire' },
];

// Enhanced recurrent options
const RECURRENCE_FREQUENCIES = [
    { key: 'daily', label: 'Daily', icon: 'calendar' },
    { key: 'weekly', label: 'Weekly', icon: 'calendar-week' },
    { key: 'biweekly', label: 'Bi-weekly', icon: 'calendar-week' },
    { key: 'monthly', label: 'Monthly', icon: 'calendar-month' },
    { key: 'quarterly', label: 'Quarterly', icon: 'calendar' },
    { key: 'custom', label: 'Custom', icon: 'calendar' },
];

const RECURRENCE_DURATIONS = [
    { key: '1week', label: '1 Week' },
    { key: '2weeks', label: '2 Weeks' },
    { key: '1month', label: '1 Month' },
    { key: '3months', label: '3 Months' },
    { key: '6months', label: '6 Months' },
    { key: '1year', label: '1 Year' },
    { key: 'custom', label: 'Custom' },
];

interface RequestFormProps {
    mode: 'shipper' | 'broker' | 'business';
    clientId?: string;
    selectedClient?: any;
    onClose?: () => void;
    isModal?: boolean;
}

const RequestForm: React.FC<RequestFormProps> = ({ mode, clientId, selectedClient, onClose, isModal = false }) => {
    const navigation = useNavigation<any>();
    const { consolidations, addConsolidation, removeConsolidation, clearConsolidations } = useConsolidations();

    // Form state
    const [activeTab, setActiveTab] = useState('agriTRUK');
    const [requestType, setRequestType] = useState<'instant' | 'booking'>('instant');
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [fromLocationCoords, setFromLocationCoords] = useState<{latitude: number, longitude: number} | null>(null);
    const [toLocationCoords, setToLocationCoords] = useState<{latitude: number, longitude: number} | null>(null);
    const [fromLocationAddress, setFromLocationAddress] = useState('');
    const [toLocationAddress, setToLocationAddress] = useState('');
    const [productType, setProductType] = useState('');
    const [weight, setWeight] = useState('');
    const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
    // Initialize pickup date to current date/time, ensuring it's not in the past
    const getInitialPickupDate = () => {
      const now = new Date();
      // Set to at least 1 hour from now to ensure future date
      const futureDate = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour
      return futureDate;
    };
    const [pickupDate, setPickupDate] = useState(getInitialPickupDate());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showRecurringEndDatePicker, setShowRecurringEndDatePicker] = useState(false);
    const [showTransporters, setShowTransporters] = useState(false);
    const [justAdded, setJustAdded] = useState(false);

    // Location state
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

    // Special requirements
    const [isPerishable, setIsPerishable] = useState(false);
    const [perishableSpecs, setPerishableSpecs] = useState<string[]>([]);
    const [isSpecialCargo, setIsSpecialCargo] = useState(false);
    const [specialCargoSpecs, setSpecialCargoSpecs] = useState<string[]>([]);
    const [insureGoods, setInsureGoods] = useState(false);
    const [insuranceValue, setInsuranceValue] = useState('');

    // Enhanced recurrent functionality for all user types
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringFreq, setRecurringFreq] = useState('');
    const [recurringTimeframe, setRecurringTimeframe] = useState('');
    const [recurringDuration, setRecurringDuration] = useState('');
    const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null);
    const [customRecurrence, setCustomRecurrence] = useState('');
    const [additional, setAdditional] = useState('');

    // Business/Broker specific
    const [isPriority, setIsPriority] = useState(false);
    const [isBulk, setIsBulk] = useState(false);
    const [bulkQuantity, setBulkQuantity] = useState('');

    // UI state
    const [formError, setFormError] = useState('');

    const accent = activeTab === 'agriTRUK' ? colors.primary : colors.secondary;

    const validateForm = () => {
        if (!fromLocation || !toLocation || !productType || !weight) {
            setFormError('Please fill in all required fields.');
            return false;
        }

        if (isRecurring) {
            if (!recurringFreq || !recurringDuration) {
                setFormError('Please fill in all recurrent fields.');
                return false;
            }
        }

        if (insureGoods && !insuranceValue) {
            setFormError('Please enter goods value for insurance.');
            return false;
        }

        setFormError('');
        return true;
    };

    // Get current location
    const getCurrentLocation = async () => {
        try {
            setIsGettingLocation(true);
            
            // Request location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'Please enable location access to automatically set your pickup location.',
                    [{ text: 'OK' }]
                );
                setLocationPermissionGranted(false);
                return;
            }
            
            setLocationPermissionGranted(true);
            
            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes
            });
            
            const { latitude, longitude } = location.coords;
            
            // Reverse geocode to get address
            const addressResponse = await Location.reverseGeocodeAsync({
                latitude,
                longitude,
            });
            
            if (addressResponse.length > 0) {
                const address = addressResponse[0];
                
                // Create a shorter, more concise address
                let shortAddress = '';
                if (address.street) {
                    // Use just the street name if available
                    shortAddress = address.street;
                } else if (address.city) {
                    // Use city if no street
                    shortAddress = address.city;
                } else if (address.region) {
                    // Use region if no city
                    shortAddress = address.region;
                } else {
                    // Fallback to coordinates
                    shortAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                }
                
                // Set the location data
                setFromLocation(shortAddress);
                setFromLocationCoords({ latitude, longitude });
                setFromLocationAddress(shortAddress);
                
                console.log('📍 Current location set:', shortAddress);
            } else {
                // Fallback if reverse geocoding fails
                setFromLocation('Current Location');
                setFromLocationCoords({ latitude, longitude });
                setFromLocationAddress('Current Location');
            }
            
        } catch (error) {
            console.error('Error getting current location:', error);
            Alert.alert(
                'Location Error',
                'Could not get your current location. Please enter your pickup location manually.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsGettingLocation(false);
        }
    };

    // Get current location on component mount
    useEffect(() => {
        getCurrentLocation();
    }, []);

    const createRequestData = () => {
        // Generate readable ID for display purposes
        const bookingType = activeTab === 'agriTRUK' ? 'Agri' : 'Cargo';
        const readableId = generateRequestReadableId(bookingType, requestType);
        
        return {
            id: readableId,
            // Map frontend fields to backend booking format
            bookingType: activeTab === 'agriTRUK' ? 'Agri' : 'Cargo',
            bookingMode: requestType, // 'instant' or 'booking'
            fromLocation: fromLocationCoords || fromLocation,
            toLocation: toLocationCoords || toLocation,
            fromLocationAddress: fromLocationAddress || fromLocation,
            toLocationAddress: toLocationAddress || toLocation,
            productType,
            weightKg: parseFloat(weight) || 0,
            pickUpDate: requestType === 'booking' ? pickupDate.toISOString() : null,
            urgencyLevel: urgency ? urgency.charAt(0).toUpperCase() + urgency.slice(1) : 'Low',
            priority: isPriority,
            perishable: isPerishable,
            needsRefrigeration: isPerishable,
            humidyControl: isPerishable,
            specialCargo: isSpecialCargo ? specialCargoSpecs.map(key => CARGO_SPECIALS.find(spec => spec.key === key)?.label || key) : [],
            insured: insureGoods,
            value: insuranceValue ? parseFloat(insuranceValue) : 0,
            additionalNotes: additional,
            // Recurring booking data
            recurrence: isRecurring ? {
                isRecurring: true,
                frequency: recurringFreq,
                timeFrame: recurringTimeframe,
                duration: recurringDuration,
                startDate: requestType === 'booking' ? pickupDate.toISOString() : new Date().toISOString(),
                endDate: recurringEndDate?.toISOString() || null,
                interval: 1,
                occurences: [],
                baseBookingId: null
            } : {
                isRecurring: false,
                frequency: null,
                timeFrame: null,
                duration: null,
                startDate: null,
                endDate: null,
                interval: 1,
                occurences: [],
                baseBookingId: null
            },
            // Keep original fields for frontend compatibility
            weight,
            requestType,
            date: requestType === 'booking' ? pickupDate.toISOString() : '',
            isPriority,
            isRecurring,
            recurringFreq,
            recurringTimeframe,
            recurringDuration,
            recurringEndDate: recurringEndDate?.toISOString() || null,
            customRecurrence,
            insureGoods,
            insuranceValue,
            isPerishable,
            perishableSpecs,
            isSpecialCargo,
            specialCargoSpecs: isSpecialCargo ? specialCargoSpecs.map(key => CARGO_SPECIALS.find(spec => spec.key === key)?.label || key) : [],
            isBulk,
            bulkQuantity,
            type: activeTab,
            urgency,
            additional,
        };
    };

    const createConsolidationData = () => {
        // Generate readable ID for consolidation
        const bookingType = activeTab === 'agriTRUK' ? 'Agri' : 'Cargo';
        const readableId = generateConsolidationReadableId(bookingType);
        
        return {
            id: readableId,
            // Use string locations for consolidation context
            fromLocation,
            toLocation,
            fromLocationAddress: fromLocationAddress || fromLocation,
            toLocationAddress: toLocationAddress || toLocation,
            productType,
            weight,
            requestType,
            date: requestType === 'booking' ? pickupDate.toISOString() : '',
            isPriority,
            isRecurring,
            recurringFreq,
            recurringTimeframe,
            recurringDuration,
            recurringEndDate: recurringEndDate?.toISOString() || null,
            customRecurrence,
            insureGoods,
            insuranceValue,
            isPerishable,
            perishableSpecs,
            isSpecialCargo,
            specialCargoSpecs: isSpecialCargo ? specialCargoSpecs.map(key => CARGO_SPECIALS.find(spec => spec.key === key)?.label || key) : [],
            isBulk,
            bulkQuantity,
            type: activeTab,
            urgency,
            additional,
        };
    };

    const handleAddToConsolidate = () => {
        if (!validateForm()) return;

        const consolidationData = createConsolidationData();
        addConsolidation(consolidationData);

        // Reset form
        setFromLocation('');
        setToLocation('');
        setFromLocationCoords(null);
        setToLocationCoords(null);
        setFromLocationAddress('');
        setToLocationAddress('');
        setProductType('');
        setWeight('');
        setPickupDate(new Date());
        setIsPriority(false);
        setIsRecurring(false);
        setRecurringFreq('');
        setRecurringTimeframe('');
        setRecurringDuration('');
        setRecurringEndDate(null);
        setCustomRecurrence('');
        setInsureGoods(false);
        setInsuranceValue('');
        setIsPerishable(false);
        setPerishableSpecs([]);
        setIsSpecialCargo(false);
        setSpecialCargoSpecs([]);
        setIsBulk(false);
        setBulkQuantity('');
        setAdditional('');

        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1200);
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        if (requestType === 'instant') {
            setShowTransporters(true);
        } else {
            const requestData = createRequestData();

            try {
                navigation.navigate('BookingConfirmation', {
                    requests: consolidations.length > 0 ? consolidations : [requestData],
                    mode
                });
            } catch (navError) {
                throw navError;
            }
        }
    };

    const handleProceedToConsolidation = () => {
        if (consolidations.length === 0) {
            Alert.alert('No Requests', 'Please add requests to consolidation first.');
            return;
        }
        navigation.navigate('Consolidation', { mode });
    };

    const getCurrentRequest = () => createRequestData();

    const handleRecurrenceChange = (field: string, value: string) => {
        switch (field) {
            case 'frequency':
                setRecurringFreq(value);
                if (value === 'custom') {
                    setCustomRecurrence('');
                }
                break;
            case 'duration':
                setRecurringDuration(value);
                break;
            case 'timeframe':
                setRecurringTimeframe(value);
                break;
        }
    };

    const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
    const [showDurationDropdown, setShowDurationDropdown] = useState(false);
    const [showUrgencyDropdown, setShowUrgencyDropdown] = useState(false);

    const renderRecurrenceSection = () => (
        <View style={styles.fieldGroup}>
            <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                    <Text style={styles.switchLabel}>Recurring Request</Text>
                    <Text style={styles.switchSubtitle}>Regular shipments</Text>
                </View>
                <Switch
                    value={isRecurring}
                    onValueChange={setIsRecurring}
                    trackColor={{ false: colors.text.light + '40', true: accent + '40' }}
                    thumbColor={isRecurring ? accent : colors.text.light}
                />
            </View>

            {isRecurring && (
                <View style={styles.recurrenceContainer}>
                    {/* Frequency Selection */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Frequency *</Text>
                        <TouchableOpacity
                            style={styles.dropdownInput}
                            onPress={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                        >
                            <Text style={[styles.dropdownText, !recurringFreq && { color: colors.text.light }]}>
                                {recurringFreq ? RECURRENCE_FREQUENCIES.find(f => f.key === recurringFreq)?.label : 'Select frequency'}
                            </Text>
                            <MaterialCommunityIcons
                                name={showFrequencyDropdown ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={colors.text.secondary}
                            />
                        </TouchableOpacity>
                        {showFrequencyDropdown && (
                            <View style={styles.dropdownOptions}>
                                {RECURRENCE_FREQUENCIES.map((freq) => (
                                    <TouchableOpacity
                                        key={freq.key}
                                        style={styles.dropdownOption}
                                        onPress={() => {
                                            handleRecurrenceChange('frequency', freq.key);
                                            setShowFrequencyDropdown(false);
                                        }}
                                    >
                                        <MaterialCommunityIcons
                                            name={freq.icon as any}
                                            size={16}
                                            color={colors.text.secondary}
                                        />
                                        <Text style={styles.dropdownOptionText}>{freq.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Custom Frequency Input */}
                    {recurringFreq === 'custom' && (
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Custom Frequency</Text>
                            <TextInput
                                style={styles.input}
                                value={customRecurrence}
                                onChangeText={setCustomRecurrence}
                                placeholder="e.g., Every 3 days, Twice a week"
                                placeholderTextColor={colors.text.light}
                            />
                        </View>
                    )}

                    {/* Time Frame */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Time Frame</Text>
                        <TextInput
                            style={styles.input}
                            value={recurringTimeframe}
                            onChangeText={(text) => handleRecurrenceChange('timeframe', text)}
                            placeholder="e.g., Every Monday, 1st of month, 9:00 AM"
                            placeholderTextColor={colors.text.light}
                        />
                    </View>

                    {/* Duration */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Duration *</Text>
                        <TouchableOpacity
                            style={styles.dropdownInput}
                            onPress={() => setShowDurationDropdown(!showDurationDropdown)}
                        >
                            <Text style={[styles.dropdownText, !recurringDuration && { color: colors.text.light }]}>
                                {recurringDuration ? RECURRENCE_DURATIONS.find(d => d.key === recurringDuration)?.label : 'Select duration'}
                            </Text>
                            <MaterialCommunityIcons
                                name={showDurationDropdown ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={colors.text.secondary}
                            />
                        </TouchableOpacity>
                        {showDurationDropdown && (
                            <View style={styles.dropdownOptions}>
                                {RECURRENCE_DURATIONS.map((duration) => (
                                    <TouchableOpacity
                                        key={duration.key}
                                        style={styles.dropdownOption}
                                        onPress={() => {
                                            handleRecurrenceChange('duration', duration.key);
                                            setShowDurationDropdown(false);
                                        }}
                                    >
                                        <Text style={styles.dropdownOptionText}>{duration.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* End Date */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>End Date (Optional)</Text>
                        <TouchableOpacity
                            style={styles.input}
                            onPress={() => setShowRecurringEndDatePicker(true)}
                        >
                            <Text style={styles.inputText}>
                                {recurringEndDate ? recurringEndDate.toLocaleDateString() : 'Set end date'}
                            </Text>
                            <MaterialCommunityIcons name="calendar" size={20} color={colors.text.secondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => {
                            if (showTransporters) {
                                // If transporters are shown, hide them and return to form
                                setShowTransporters(false);
                            } else if (isModal && onClose) {
                                onClose();
                            } else {
                                navigation.goBack();
                            }
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name={isModal ? "close" : "arrow-back"} size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {showTransporters ? 'Find Transporters' :
                            mode === 'broker' ? 'Place Request for Client' :
                            mode === 'business' ? 'Business Request' : 'Request Transport'}
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            {/* Client Info for Broker */}
            {mode === 'broker' && selectedClient && (
                <View style={styles.clientInfoCard}>
                    <View style={styles.clientInfoHeader}>
                        <MaterialCommunityIcons name="account-tie" size={20} color={colors.primary} />
                        <Text style={styles.clientInfoTitle}>Requesting for Client</Text>
                    </View>
                    <View style={styles.clientInfoContent}>
                        <Text style={styles.clientName}>{selectedClient.name}</Text>
                        <Text style={styles.clientCompany}>{selectedClient.company}</Text>
                    </View>
                </View>
            )}

            <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView 
                    style={styles.scrollView} 
                    contentContainerStyle={styles.scrollViewContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Service Type Tabs */}
                    <View style={styles.tabContainer}>
                        {SERVICES.map((service) => (
                            <TouchableOpacity
                                key={service.key}
                                style={[
                                    styles.tab,
                                    activeTab === service.key && { 
                                        backgroundColor: service.accent,
                                        borderColor: service.accent,
                                        borderWidth: 2,
                                        shadowColor: service.accent,
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 4,
                                        elevation: 4,
                                    }
                                ]}
                                onPress={() => setActiveTab(service.key)}
                            >
                                <View style={styles.tabIcon}>
                                    {activeTab === service.key ? (
                                        // White icon for active tab
                                        service.key === 'agriTRUK' ? (
                                            <FontAwesome5 name="tractor" size={22} color={colors.white} />
                                        ) : (
                                            <MaterialCommunityIcons name="truck" size={22} color={colors.white} />
                                        )
                                    ) : (
                                        // Colored icon for inactive tab
                                        service.icon
                                    )}
                                </View>
                                <Text style={[
                                    styles.tabLabel,
                                    activeTab === service.key && { 
                                        color: colors.white, 
                                        fontWeight: '700',
                                        fontSize: fonts.size.md
                                    }
                                ]}>
                                    {service.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Request Type Toggle */}
                    <View style={styles.requestTypeContainer}>
                        <TouchableOpacity
                            style={[
                                styles.requestTypeTab,
                                requestType === 'instant' && { 
                                    backgroundColor: accent + '15', 
                                    borderColor: accent,
                                    borderWidth: 1
                                }
                            ]}
                            onPress={() => setRequestType('instant')}
                        >
                            <MaterialCommunityIcons
                                name="lightning-bolt"
                                size={18}
                                color={requestType === 'instant' ? accent : colors.text.secondary}
                            />
                            <Text style={[
                                styles.requestTypeText,
                                requestType === 'instant' && { color: accent, fontWeight: '600' }
                            ]}>
                                Instant
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.requestTypeTab,
                                requestType === 'booking' && { 
                                    backgroundColor: accent + '15', 
                                    borderColor: accent,
                                    borderWidth: 1
                                }
                            ]}
                            onPress={() => setRequestType('booking')}
                        >
                            <MaterialCommunityIcons
                                name="calendar-clock"
                                size={18}
                                color={requestType === 'booking' ? accent : colors.text.secondary}
                            />
                            <Text style={[
                                styles.requestTypeText,
                                requestType === 'booking' && { color: accent, fontWeight: '600' }
                            ]}>
                                Booking
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.formCard}>
                        {/* Pickup Location */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.locationHeader}>
                                <Text style={styles.fieldLabel}>Location Details *</Text>
                                <TouchableOpacity
                                    style={styles.locationButton}
                                    onPress={getCurrentLocation}
                                    disabled={isGettingLocation}
                                >
                                    <Ionicons 
                                        name={isGettingLocation ? "refresh" : "location"} 
                                        size={14} 
                                        color={colors.primary} 
                                    />
                                    <Text 
                                        style={styles.locationButtonText}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {isGettingLocation ? '...' : '📍'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <CompactLocationSection
                                pickupLocation={fromLocation}
                                deliveryLocation={toLocation}
                                onPickupLocationChange={setFromLocation}
                                onDeliveryLocationChange={setToLocation}
                                onPickupLocationSelected={(location) => {
                                    // Pickup location selected
                                    setFromLocationCoords({
                                        latitude: location.latitude,
                                        longitude: location.longitude
                                    });
                                    setFromLocationAddress(location.address || fromLocation);
                                }}
                                onDeliveryLocationSelected={(location) => {
                                    // Delivery location selected
                                    setToLocationCoords({
                                        latitude: location.latitude,
                                        longitude: location.longitude
                                    });
                                    setToLocationAddress(location.address || toLocation);
                                }}
                                useCurrentLocation={true}
                                showMap={true}
                                onMapPress={() => {
                                    // Handle map press if needed
                                    // Map pressed
                                }}
                                showTitle={false}
                            />
                            {fromLocation && fromLocationCoords && (
                                <View style={styles.locationIndicator}>
                                    <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                                    <Text 
                                        style={styles.locationIndicatorText}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        Current location set
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Product Details */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Product Type *</Text>
                            <ProductTypeInput
                                value={productType}
                                onChangeText={setProductType}
                                onProductSelected={(product) => {
                                    setProductType(product);
                                    // Store the product for future suggestions
                                }}
                                placeholder="Enter product type (e.g., Maize, Electronics, Furniture)"
                                style={styles.input}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Weight (kg) *</Text>
                            <TextInput
                                style={styles.input}
                                value={weight}
                                onChangeText={setWeight}
                                placeholder="Enter weight in kg"
                                placeholderTextColor={colors.text.light}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Bulk Option */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.switchRow}>
                                <View style={styles.switchLabelContainer}>
                                    <Text style={styles.switchLabel}>Bulk Shipment</Text>
                                    <Text style={styles.switchSubtitle}>Multiple packages or large quantity</Text>
                                </View>
                                <Switch
                                    value={isBulk}
                                    onValueChange={setIsBulk}
                                    trackColor={{ false: colors.text.light + '40', true: accent + '40' }}
                                    thumbColor={isBulk ? accent : colors.text.light}
                                />
                            </View>

                            {isBulk && (
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Quantity/Units</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={bulkQuantity}
                                        onChangeText={setBulkQuantity}
                                        placeholder="e.g., 50 bags, 100 boxes, 25 pallets"
                                        placeholderTextColor={colors.text.light}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Urgency Level */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Urgency Level</Text>
                            <TouchableOpacity
                                style={styles.dropdownInput}
                                onPress={() => setShowUrgencyDropdown(!showUrgencyDropdown)}
                            >
                                <Text style={[styles.dropdownText, !urgency && { color: colors.text.light }]}>
                                    {urgency ? URGENCY_LEVELS.find(u => u.key === urgency)?.label : 'Select urgency level'}
                                </Text>
                                <MaterialCommunityIcons
                                    name={showUrgencyDropdown ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color={colors.text.secondary}
                                />
                            </TouchableOpacity>
                            {showUrgencyDropdown && (
                                <View style={styles.dropdownOptions}>
                                    {URGENCY_LEVELS.map((level) => (
                                        <TouchableOpacity
                                            key={level.key}
                                            style={styles.dropdownOption}
                                            onPress={() => {
                                                setUrgency(level.key as 'low' | 'medium' | 'high');
                                                setShowUrgencyDropdown(false);
                                            }}
                                        >
                                            <MaterialCommunityIcons
                                                name={level.icon as any}
                                                size={16}
                                                color={level.color}
                                            />
                                            <Text style={[styles.dropdownOptionText, { color: level.color }]}>
                                                {level.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Pickup Date for Bookings */}
                        {requestType === 'booking' && (
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>Pickup Date & Time *</Text>
                                <TouchableOpacity
                                    style={styles.input}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.inputText}>
                                        {pickupDate.toLocaleString()}
                                    </Text>
                                    <MaterialCommunityIcons name="calendar" size={20} color={colors.text.secondary} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Recurring Request Section - Available for all user types */}
                        {renderRecurrenceSection()}

                        {/* Special Requirements */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Special Requirements</Text>

                            {/* Perishable Options for Agri */}
                            {activeTab === 'agriTRUK' && (
                                <>
                                    <View style={styles.switchRow}>
                                        <View style={styles.switchLabelContainer}>
                                            <Text style={styles.switchLabel}>Perishable Goods</Text>
                                            <Text style={styles.switchSubtitle}>Requires special handling</Text>
                                        </View>
                                        <Switch
                                            value={isPerishable}
                                            onValueChange={setIsPerishable}
                                            trackColor={{ false: colors.text.light + '40', true: accent + '40' }}
                                            thumbColor={isPerishable ? accent : colors.text.light}
                                        />
                                    </View>

                                    {isPerishable && (
                                        <View style={styles.specsContainer}>
                                            {AGRI_PERISHABLES.map((spec) => (
                                                <TouchableOpacity
                                                    key={spec.key}
                                                    style={[
                                                        styles.specChip,
                                                        perishableSpecs.includes(spec.key) && { backgroundColor: accent + '20' }
                                                    ]}
                                                    onPress={() => {
                                                        if (perishableSpecs.includes(spec.key)) {
                                                            setPerishableSpecs(perishableSpecs.filter(s => s !== spec.key));
                                                        } else {
                                                            setPerishableSpecs([...perishableSpecs, spec.key]);
                                                        }
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.specChipText,
                                                        perishableSpecs.includes(spec.key) && { color: accent, fontWeight: 'bold' }
                                                    ]}>
                                                        {spec.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </>
                            )}

                            {/* Special Cargo Options for Cargo */}
                            {activeTab === 'cargoTRUK' && (
                                <>
                                    <View style={styles.switchRow}>
                                        <View style={styles.switchLabelContainer}>
                                            <Text style={styles.switchLabel}>Special Cargo</Text>
                                            <Text style={styles.switchSubtitle}>Requires special handling</Text>
                                        </View>
                                        <Switch
                                            value={isSpecialCargo}
                                            onValueChange={setIsSpecialCargo}
                                            trackColor={{ false: colors.text.light + '40', true: accent + '40' }}
                                            thumbColor={isSpecialCargo ? accent : colors.text.light}
                                        />
                                    </View>

                                    {isSpecialCargo && (
                                        <View style={styles.specsContainer}>
                                            {CARGO_SPECIALS.map((spec) => (
                                                <TouchableOpacity
                                                    key={spec.key}
                                                    style={[
                                                        styles.specChip,
                                                        specialCargoSpecs.includes(spec.key) && { backgroundColor: accent + '20' }
                                                    ]}
                                                    onPress={() => {
                                                        if (specialCargoSpecs.includes(spec.key)) {
                                                            setSpecialCargoSpecs(specialCargoSpecs.filter(s => s !== spec.key));
                                                        } else {
                                                            setSpecialCargoSpecs([...specialCargoSpecs, spec.key]);
                                                        }
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.specChipText,
                                                        specialCargoSpecs.includes(spec.key) && { color: accent, fontWeight: 'bold' }
                                                    ]}>
                                                        {spec.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </>
                            )}

                            {/* Insurance */}
                            <View style={styles.switchRow}>
                                <View style={styles.switchLabelContainer}>
                                    <Text style={styles.switchLabel}>Insure Goods</Text>
                                    <Text style={styles.switchSubtitle}>Protect your shipment</Text>
                                </View>
                                <Switch
                                    value={insureGoods}
                                    onValueChange={setInsureGoods}
                                    trackColor={{ false: colors.text.light + '40', true: accent + '40' }}
                                    thumbColor={insureGoods ? accent : colors.text.light}
                                />
                            </View>

                            {insureGoods && (
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Goods Value (KES)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={insuranceValue}
                                        onChangeText={setInsuranceValue}
                                        placeholder="Enter goods value"
                                        placeholderTextColor={colors.text.light}
                                        keyboardType="numeric"
                                    />
                                </View>
                            )}
                        </View>

                        {/* Business/Broker Specific Options */}
                        {(mode === 'business' || mode === 'broker') && (
                            <View style={styles.fieldGroup}>
                                <View style={styles.switchRow}>
                                    <View style={styles.switchLabelContainer}>
                                        <Text style={styles.switchLabel}>Priority Delivery</Text>
                                        <Text style={styles.switchSubtitle}>Express service</Text>
                                    </View>
                                    <Switch
                                        value={isPriority}
                                        onValueChange={setIsPriority}
                                        trackColor={{ false: colors.text.light + '40', true: accent + '40' }}
                                        thumbColor={isPriority ? accent : colors.text.light}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Additional Notes */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Additional Notes</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={additional}
                                onChangeText={setAdditional}
                                placeholder="Any special instructions for the transporter..."
                                placeholderTextColor={colors.text.light}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                maxLength={100}
                            />
                            <Text style={styles.charCount}>
                                {additional.length}/100 characters
                            </Text>
                        </View>

                        {/* Error Message */}
                        {formError ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{formError}</Text>
                            </View>
                        ) : null}

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            {(mode === 'business' || mode === 'broker') && requestType === 'booking' && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.consolidateButton]}
                                    onPress={handleAddToConsolidate}
                                >
                                    <MaterialCommunityIcons name="layers-plus" size={20} color={colors.white} />
                                    <Text style={styles.actionButtonText}>
                                        {justAdded ? 'Added!' : 'Add to Consolidation'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.actionButton, styles.submitButton]}
                                onPress={handleSubmit}
                            >
                                <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} />
                                <Text style={styles.actionButtonText}>
                                    {requestType === 'instant' ? 'Find Transporters' : 'Place Booking'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Consolidation Management */}
                        {(mode === 'business' || mode === 'broker') && consolidations.length > 0 && (
                            <View style={styles.consolidationSection}>
                                <View style={styles.consolidationHeader}>
                                    <Text style={styles.consolidationTitle}>
                                        Consolidation ({consolidations.length} requests)
                                    </Text>
                                    <TouchableOpacity onPress={clearConsolidations}>
                                        <Text style={styles.clearText}>Clear All</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.consolidationList}>
                                    {consolidations.slice(0, 3).map((item, index) => (
                                        <View key={item.id} style={styles.consolidationItem}>
                                            <Text style={styles.consolidationItemText}>
                                                {item.fromLocation} → {item.toLocation} ({item.productType}, {item.weight})
                                                {item.isRecurring && (
                                                    <Text style={styles.recurringBadge}> 🔄 Recurring</Text>
                                                )}
                                            </Text>
                                            <TouchableOpacity onPress={() => removeConsolidation(item.id!)}>
                                                <Ionicons name="close-circle" size={20} color={colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {consolidations.length > 3 && (
                                        <Text style={styles.moreText}>+{consolidations.length - 3} more</Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={[styles.actionButton, styles.proceedButton]}
                                    onPress={handleProceedToConsolidation}
                                >
                                    <MaterialCommunityIcons name="arrow-right" size={20} color={colors.white} />
                                    <Text style={styles.actionButtonText}>Proceed with Consolidation</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Find Transporters Component */}
            {showTransporters && requestType === 'instant' && (
                <FindTransporters
                    requests={consolidations.length > 0 ? consolidations : [getCurrentRequest()]}
                    distance=""
                    accent={accent}
                    onBackToForm={() => setShowTransporters(false)}
                />
            )}

            {/* Date Pickers */}
            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="datetime"
                date={pickupDate}
                minimumDate={new Date()} // Prevent selecting past dates
                onConfirm={(date) => {
                    // Ensure the selected date is not in the past
                    const now = new Date();
                    if (date < now) {
                        Alert.alert('Invalid Date', 'Pickup date must be in the future.');
                        return;
                    }
                    setPickupDate(date);
                    setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
            />

            <DateTimePickerModal
                isVisible={showRecurringEndDatePicker}
                mode="date"
                date={recurringEndDate || new Date()}
                onConfirm={(date) => {
                    setRecurringEndDate(date);
                    setShowRecurringEndDatePicker(false);
                }}
                onCancel={() => setShowRecurringEndDatePicker(false)}
            />

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    headerTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.white,
    },
    headerSpacer: {
        width: 44,
    },
    clientInfoCard: {
        backgroundColor: colors.white,
        marginHorizontal: spacing.lg,
        marginTop: -10,
        marginBottom: spacing.md,
        borderRadius: 16,
        padding: spacing.lg,
        shadowColor: colors.black,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    clientInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    clientInfoTitle: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    clientInfoContent: {
        gap: spacing.xs,
    },
    clientName: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    clientCompany: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    scrollViewContent: {
        paddingBottom: 100, // Extra padding to ensure button doesn't get hidden behind bottom nav
    },
    tabContainer: {
        flexDirection: 'row',
        marginVertical: spacing.lg,
        gap: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.border,
    },
    tabIcon: {
        marginRight: spacing.sm,
    },
    tabLabel: {
        fontSize: fonts.size.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    requestTypeContainer: {
        flexDirection: 'row',
        marginBottom: spacing.md,
        gap: spacing.xs,
    },
    requestTypeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    requestTypeText: {
        fontSize: fonts.size.sm,
        fontWeight: '500',
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    formCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    fieldGroup: {
        marginBottom: spacing.md,
    },
    fieldLabel: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        backgroundColor: colors.background,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        maxWidth: 80,
        flexShrink: 1,
    },
    locationButtonText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: 4,
        fontWeight: '400',
        flexShrink: 1,
    },
    locationIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
        paddingHorizontal: spacing.sm,
        opacity: 0.7,
        flex: 1,
    },
    locationIndicatorText: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: 4,
        fontWeight: '400',
        flexShrink: 1,
        flex: 1,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.text.light,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        backgroundColor: colors.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    inputText: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        flex: 1,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    suggestionsContainer: {
        backgroundColor: colors.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.text.light,
        marginTop: spacing.xs,
        maxHeight: 200,
    },
    suggestionItem: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    suggestionText: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
    },
    errorContainer: {
        backgroundColor: colors.error + '10',
        padding: spacing.md,
        borderRadius: 8,
        marginBottom: spacing.lg,
    },
    errorText: {
        color: colors.error,
        fontSize: fonts.size.sm,
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
    },
    submitButton: {
        backgroundColor: colors.primary,
    },
    actionButtonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        marginLeft: spacing.sm,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.text.light,
        marginRight: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxLabel: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
    },
    specsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.sm,
        marginLeft: 32,
    },
    specChip: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.text.light,
    },
    specChipText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
    },
    consolidationSection: {
        marginTop: spacing.lg,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    consolidationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    consolidationTitle: {
        fontSize: fonts.size.md,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    clearText: {
        fontSize: fonts.size.sm,
        color: colors.error,
        fontWeight: '600',
    },
    consolidationList: {
        marginBottom: spacing.md,
    },
    consolidationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 8,
        marginBottom: spacing.xs,
    },
    consolidationItemText: {
        fontSize: fonts.size.sm,
        color: colors.text.primary,
        flex: 1,
    },
    moreText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    consolidateButton: {
        backgroundColor: colors.secondary,
    },
    proceedButton: {
        backgroundColor: colors.success,
    },
    charCount: {
        fontSize: fonts.size.xs,
        color: colors.text.light,
        textAlign: 'right',
        marginTop: spacing.xs,
        fontStyle: 'italic',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
        paddingVertical: spacing.sm,
    },
    switchLabelContainer: {
        flex: 1,
        marginRight: spacing.md,
    },
    switchLabel: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        fontWeight: '600',
    },
    switchSubtitle: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    urgencyContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    urgencyButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.text.light,
        backgroundColor: colors.surface,
    },
    urgencyText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    recurrenceContainer: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.text.light + '20',
    },
    recurrenceOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    recurrenceOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.text.light,
    },
    recurrenceOptionText: {
        fontSize: fonts.size.sm,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    recurringBadge: {
        fontSize: fonts.size.xs,
        color: colors.text.secondary,
        marginLeft: spacing.sm,
    },
    dropdownInput: {
        borderWidth: 1,
        borderColor: colors.text.light,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fonts.size.md,
        color: colors.text.primary,
        backgroundColor: colors.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownText: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        flex: 1,
    },
    dropdownOptions: {
        backgroundColor: colors.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.text.light,
        marginTop: spacing.xs,
        maxHeight: 200,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    dropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.text.light + '20',
    },
    dropdownOptionText: {
        fontSize: fonts.size.md,
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
});

export default RequestForm;
