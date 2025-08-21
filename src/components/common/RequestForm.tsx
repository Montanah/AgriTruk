import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
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
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { useConsolidations } from '../../context/ConsolidationContext';
import FindTransporters from '../FindTransporters';
import LoadingSpinner from './LoadingSpinner';

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

const PRODUCT_SUGGESTIONS = [
    'Maize', 'Fruits', 'Beans', 'Wheat', 'Rice', 'Vegetables', 'Coffee', 'Tea', 'Livestock',
    'Machinery', 'Electronics', 'Furniture', 'Clothing', 'Chemicals', 'Other',
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

interface RequestFormProps {
    mode: 'shipper' | 'broker' | 'business';
    clientId?: string;
    onClose?: () => void;
    isModal?: boolean;
}

const RequestForm: React.FC<RequestFormProps> = ({ mode, clientId, onClose, isModal = false }) => {
    const navigation = useNavigation();
    const { consolidations, addConsolidation, removeConsolidation, clearConsolidations } = useConsolidations();

    // Form state
    const [activeTab, setActiveTab] = useState('agriTRUK');
    const [requestType, setRequestType] = useState<'instant' | 'booking'>('instant');
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [productType, setProductType] = useState('');
    const [weight, setWeight] = useState('');
    const [pickupDate, setPickupDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showProductSuggestions, setShowProductSuggestions] = useState(false);
    const [additional, setAdditional] = useState('');

    // Special requirements
    const [isPerishable, setIsPerishable] = useState(false);
    const [perishableSpecs, setPerishableSpecs] = useState<string[]>([]);
    const [isSpecialCargo, setIsSpecialCargo] = useState(false);
    const [specialCargoSpecs, setSpecialCargoSpecs] = useState<string[]>([]);
    const [insureGoods, setInsureGoods] = useState(false);
    const [insuranceValue, setInsuranceValue] = useState('');

    // Business/Broker specific
    const [isBulk, setIsBulk] = useState(false);
    const [isPriority, setIsPriority] = useState(false);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringFreq, setRecurringFreq] = useState('');

    // UI state
    const [showTransporters, setShowTransporters] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [justAdded, setJustAdded] = useState(false);

    const accent = activeTab === 'agriTRUK' ? colors.primary : colors.secondary;
    const canConsolidate = mode === 'business' || mode === 'broker';

    const validateForm = () => {
        if (!fromLocation || !toLocation || !productType || !weight) {
            setFormError('Please fill in all required fields.');
            return false;
        }
        setFormError('');
        return true;
    };

    const handleAddToConsolidate = () => {
        if (!validateForm()) return;

        const requestData = {
            id: Date.now().toString(),
            fromLocation,
            toLocation,
            productType,
            weight,
            requestType,
            date: pickupDate.toISOString(),
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
            additional,
            type: activeTab,
            clientId,
        };

        addConsolidation(requestData);

        // Reset form
        setFromLocation('');
        setToLocation('');
        setProductType('');
        setWeight('');
        setPickupDate(new Date());
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
        setAdditional('');

        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1200);
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        if (requestType === 'instant') {
            setShowTransporters(true);
        } else {
            const requestData = {
                fromLocation,
                toLocation,
                productType,
                weight,
                pickupDate,
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
                additional,
                type: activeTab,
                clientId,
            };

            navigation.navigate('BookingConfirmation', {
                requests: consolidations.length > 0 ? consolidations : [requestData],
                mode
            });
        }
    };

    const handleProceedToConsolidation = () => {
        if (consolidations.length === 0) {
            Alert.alert('No Requests', 'Please add requests to consolidation first.');
            return;
        }
        navigation.navigate('Consolidation', { mode });
    };

    const getCurrentRequest = () => ({
        fromLocation,
        toLocation,
        productType,
        weight,
        value: insureGoods ? insuranceValue : '',
        insureGoods,
        additional,
        perishableSpecs,
        specialCargoSpecs,
        isBulk,
        isPriority,
        isRecurring,
        recurringFreq,
        type: activeTab,
        clientId,
    });

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => {
                            if (isModal && onClose) {
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
                        {mode === 'broker' ? 'Place Request for Client' :
                            mode === 'business' ? 'Business Request' : 'Request Transport'}
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>
            </LinearGradient>

            <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Service Type Tabs */}
                    <View style={styles.tabContainer}>
                        {SERVICES.map((service) => (
                            <TouchableOpacity
                                key={service.key}
                                style={[
                                    styles.tab,
                                    activeTab === service.key && { backgroundColor: service.accent + '20' }
                                ]}
                                onPress={() => setActiveTab(service.key)}
                            >
                                <View style={styles.tabIcon}>{service.icon}</View>
                                <Text style={[
                                    styles.tabLabel,
                                    activeTab === service.key && { color: service.accent, fontWeight: 'bold' }
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
                                requestType === 'instant' && { backgroundColor: accent, borderColor: accent }
                            ]}
                            onPress={() => setRequestType('instant')}
                        >
                            <MaterialCommunityIcons
                                name="lightning-bolt"
                                size={20}
                                color={requestType === 'instant' ? colors.white : accent}
                            />
                            <Text style={[
                                styles.requestTypeText,
                                requestType === 'instant' && { color: colors.white, fontWeight: 'bold' }
                            ]}>
                                Instant
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.requestTypeTab,
                                requestType === 'booking' && { backgroundColor: accent, borderColor: accent }
                            ]}
                            onPress={() => setRequestType('booking')}
                        >
                            <MaterialCommunityIcons
                                name="calendar-clock"
                                size={20}
                                color={requestType === 'booking' ? colors.white : accent}
                            />
                            <Text style={[
                                styles.requestTypeText,
                                requestType === 'booking' && { color: colors.white, fontWeight: 'bold' }
                            ]}>
                                Booking
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.formCard}>
                        {/* Location Fields */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Pickup Location *</Text>
                            <TextInput
                                style={styles.input}
                                value={fromLocation}
                                onChangeText={setFromLocation}
                                placeholder="Enter pickup location"
                                placeholderTextColor={colors.text.light}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Delivery Location *</Text>
                            <TextInput
                                style={styles.input}
                                value={toLocation}
                                onChangeText={setToLocation}
                                placeholder="Enter delivery location"
                                placeholderTextColor={colors.text.light}
                            />
                        </View>

                        {/* Product Details */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Product Type *</Text>
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setShowProductSuggestions(!showProductSuggestions)}
                            >
                                <Text style={[styles.inputText, !productType && { color: colors.text.light }]}>
                                    {productType || 'Select product type'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
                            </TouchableOpacity>
                            {showProductSuggestions && (
                                <View style={styles.suggestionsContainer}>
                                    {PRODUCT_SUGGESTIONS.map((suggestion) => (
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
                                <Text style={styles.fieldLabel}>Business/Broker Specific Options</Text>

                                <View style={styles.switchRow}>
                                    <View style={styles.switchLabelContainer}>
                                        <Text style={styles.switchLabel}>Bulk Shipment</Text>
                                        <Text style={styles.switchSubtitle}>Large volume transport</Text>
                                    </View>
                                    <Switch
                                        value={isBulk}
                                        onValueChange={setIsBulk}
                                        trackColor={{ false: colors.text.light + '40', true: accent + '40' }}
                                        thumbColor={isBulk ? accent : colors.text.light}
                                    />
                                </View>

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
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.fieldLabel}>Recurring Frequency</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={recurringFreq}
                                            onChangeText={setRecurringFreq}
                                            placeholder="e.g., Weekly, Monthly, Daily"
                                            placeholderTextColor={colors.text.light}
                                        />
                                    </View>
                                )}
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
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color={colors.white} />
                                ) : (
                                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} />
                                )}
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
                                                {item.fromLocation} → {item.toLocation} ({item.productType}, {item.weight}kg)
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
                />
            )}

            {/* Date Picker Modal */}
            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="datetime"
                date={pickupDate}
                onConfirm={(date) => {
                    setPickupDate(date);
                    setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
            />

            <LoadingSpinner
                visible={loading}
                message="Processing request..."
                size="large"
                type="pulse"
                logo={true}
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
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    tabContainer: {
        flexDirection: 'row',
        marginVertical: spacing.lg,
        gap: spacing.sm,
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
    },
    tabIcon: {
        marginRight: spacing.sm,
    },
    tabLabel: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    requestTypeContainer: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    requestTypeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.text.light,
        backgroundColor: colors.surface,
    },
    requestTypeText: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.secondary,
        marginLeft: spacing.sm,
    },
    formCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    fieldGroup: {
        marginBottom: spacing.lg,
    },
    fieldLabel: {
        fontSize: fonts.size.md,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.sm,
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
});

export default RequestForm;
