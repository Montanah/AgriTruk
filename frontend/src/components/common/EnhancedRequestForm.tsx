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
import { PRODUCT_SUGGESTIONS } from '../../constants/productSuggestions';
import spacing from '../../constants/spacing';
import { useConsolidations } from '../../context/ConsolidationContext';
import FindTransporters from '../FindTransporters';
import LoadingSpinner from './LoadingSpinner';
import LocationPicker from './LocationPicker';

const SERVICES = [
    {
        key: 'agriTRUK',
        label: 'Agricultural',
        subtitle: 'Farm produce & livestock',
        accent: colors.primary,
        icon: <FontAwesome5 name="tractor" size={24} color={colors.primary} />,
        gradient: [colors.primary, '#2E7D32'],
    },
    {
        key: 'cargoTRUK',
        label: 'Cargo',
        subtitle: 'General goods & packages',
        accent: colors.secondary,
        icon: <MaterialCommunityIcons name="truck" size={24} color={colors.secondary} />,
        gradient: [colors.secondary, '#1976D2'],
    },
];

const CARGO_SPECIALS = [
    { key: 'fragile', label: 'Fragile', icon: 'glass-fragile' },
    { key: 'oversized', label: 'Oversized', icon: 'resize' },
    { key: 'hazardous', label: 'Hazardous', icon: 'alert-circle' },
    { key: 'temperature', label: 'Temperature Controlled', icon: 'thermometer' },
    { key: 'highvalue', label: 'High Value', icon: 'diamond' },
    { key: 'livestock', label: 'Livestock/Animals', icon: 'cow' },
    { key: 'bulk', label: 'Bulk', icon: 'package-variant' },
    { key: 'perishable', label: 'Perishable', icon: 'clock-fast' },
    { key: 'other', label: 'Other', icon: 'dots-horizontal' },
];

const AGRI_PERISHABLES = [
    { key: 'fruits', label: 'Fresh Fruits', icon: 'apple' },
    { key: 'vegetables', label: 'Vegetables', icon: 'carrot' },
    { key: 'dairy', label: 'Dairy Products', icon: 'cow' },
    { key: 'meat', label: 'Meat & Poultry', icon: 'food-drumstick' },
    { key: 'seafood', label: 'Seafood', icon: 'fish' },
    { key: 'flowers', label: 'Flowers', icon: 'flower' },
    { key: 'herbs', label: 'Herbs & Spices', icon: 'leaf' },
    { key: 'other', label: 'Other Perishables', icon: 'dots-horizontal' },
];

interface EnhancedRequestFormProps {
    mode?: 'broker' | 'business' | 'shipper';
    clientId?: string;
    selectedClient?: any;
    onClose?: () => void;
    isModal?: boolean;
}

const EnhancedRequestForm: React.FC<EnhancedRequestFormProps> = ({ 
    mode, 
    clientId, 
    selectedClient, 
    onClose, 
    isModal = false 
}) => {
    const navigation = useNavigation<any>();
    const { consolidations, addConsolidation, removeConsolidation, clearConsolidations } = useConsolidations();

    // Form state
    const [activeTab, setActiveTab] = useState('agriTRUK');
    const [requestType, setRequestType] = useState<'instant' | 'booking'>('instant');
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [productType, setProductType] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<string[]>(PRODUCT_SUGGESTIONS);
    const [weight, setWeight] = useState('');
    const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
    const [pickupDate, setPickupDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showProductSuggestions, setShowProductSuggestions] = useState(false);
    const [showTransporters, setShowTransporters] = useState(false);
    const [justAdded, setJustAdded] = useState(false);

    // Special requirements
    const [isPerishable, setIsPerishable] = useState(false);
    const [perishableSpecs, setPerishableSpecs] = useState<string[]>([]);
    const [isSpecialCargo, setIsSpecialCargo] = useState(false);
    const [specialCargoSpecs, setSpecialCargoSpecs] = useState<string[]>([]);
    const [insureGoods, setInsureGoods] = useState(false);
    const [insuranceValue, setInsuranceValue] = useState('');

    // Enhanced recurrent functionality
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringFreq, setRecurringFreq] = useState('');
    const [recurringTimeframe, setRecurringTimeframe] = useState('');
    const [recurringDuration, setRecurringDuration] = useState('');
    const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null);
    const [customRecurrence, setCustomRecurrence] = useState('');
    const [isBulk, setIsBulk] = useState(false);
    const [bulkQuantity, setBulkQuantity] = useState('');
    const [additional, setAdditional] = useState('');
    const [isPriority, setIsPriority] = useState(false);

    const accent = activeTab === 'agriTRUK' ? colors.primary : colors.secondary;

    const validateForm = () => {
        if (!fromLocation.trim()) {
            Alert.alert('Validation Error', 'Please enter pickup location');
            return false;
        }
        if (!toLocation.trim()) {
            Alert.alert('Validation Error', 'Please enter delivery location');
            return false;
        }
        if (!productType.trim()) {
            Alert.alert('Validation Error', 'Please enter product type');
            return false;
        }
        if (!weight.trim()) {
            Alert.alert('Validation Error', 'Please enter weight');
            return false;
        }
        return true;
    };

    const createRequestData = () => {
        return {
            fromLocation,
            toLocation,
            productType,
            weight,
            urgency,
            pickupDate: pickupDate.toISOString(),
            isPerishable,
            perishableSpecs,
            isSpecialCargo,
            specialCargoSpecs,
            insureGoods,
            insuranceValue,
            isRecurring,
            recurringFreq,
            recurringTimeframe,
            recurringDuration,
            recurringEndDate: recurringEndDate?.toISOString() || null,
            customRecurrence,
            isBulk,
            bulkQuantity,
            additional,
            isPriority,
            type: activeTab,
            requestType,
            clientId,
        };
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        if (requestType === 'instant') {
            setShowTransporters(true);
        } else {
            const requestData = createRequestData();
            navigation.navigate('BookingConfirmation', {
                requests: consolidations.length > 0 ? consolidations : [requestData],
                mode
            });
        }
    };

    const handleAddToConsolidate = () => {
        if (!validateForm()) return;

        const requestData = createRequestData();
        addConsolidation(requestData);

        // Reset form
        setFromLocation('');
        setToLocation('');
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

    const togglePerishableSpec = (spec: string) => {
        setPerishableSpecs(prev => 
            prev.includes(spec) 
                ? prev.filter(s => s !== spec)
                : [...prev, spec]
        );
    };

    const toggleSpecialCargoSpec = (spec: string) => {
        setSpecialCargoSpecs(prev => 
            prev.includes(spec) 
                ? prev.filter(s => s !== spec)
                : [...prev, spec]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Enhanced Header */}
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
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>
                            {mode === 'broker' ? 'Place Request for Client' :
                                mode === 'business' ? 'Business Request' : 'Request Transport'}
                        </Text>
                        <Text style={styles.headerSubtitle}>Professional transport solutions</Text>
                    </View>
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
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Enhanced Service Type Cards */}
                    <View style={styles.serviceCardsContainer}>
                        {SERVICES.map((service) => (
                            <TouchableOpacity
                                key={service.key}
                                style={[
                                    styles.serviceCard,
                                    activeTab === service.key && styles.serviceCardActive
                                ]}
                                onPress={() => setActiveTab(service.key)}
                            >
                                <LinearGradient
                                    colors={activeTab === service.key ? service.gradient : [colors.white, colors.white]}
                                    style={styles.serviceCardGradient}
                                >
                                    <View style={styles.serviceCardContent}>
                                        <View style={[
                                            styles.serviceIconContainer,
                                            activeTab === service.key && styles.serviceIconContainerActive
                                        ]}>
                                            {service.icon}
                                        </View>
                                        <View style={styles.serviceTextContainer}>
                                            <Text style={[
                                                styles.serviceLabel,
                                                activeTab === service.key && styles.serviceLabelActive
                                            ]}>
                                                {service.label}
                                            </Text>
                                            <Text style={[
                                                styles.serviceSubtitle,
                                                activeTab === service.key && styles.serviceSubtitleActive
                                            ]}>
                                                {service.subtitle}
                                            </Text>
                                        </View>
                                        {activeTab === service.key && (
                                            <View style={styles.selectedIndicator}>
                                                <MaterialCommunityIcons name="check-circle" size={20} color={colors.white} />
                                            </View>
                                        )}
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Enhanced Request Type Toggle */}
                    <View style={styles.requestTypeContainer}>
                        <TouchableOpacity
                            style={[
                                styles.requestTypeCard,
                                requestType === 'instant' && styles.requestTypeCardActive
                            ]}
                            onPress={() => setRequestType('instant')}
                        >
                            <View style={styles.requestTypeIconContainer}>
                                <MaterialCommunityIcons
                                    name="lightning-bolt"
                                    size={24}
                                    color={requestType === 'instant' ? colors.white : accent}
                                />
                            </View>
                            <View style={styles.requestTypeTextContainer}>
                                <Text style={[
                                    styles.requestTypeTitle,
                                    requestType === 'instant' && styles.requestTypeTitleActive
                                ]}>
                                    Instant Request
                                </Text>
                                <Text style={[
                                    styles.requestTypeDescription,
                                    requestType === 'instant' && styles.requestTypeDescriptionActive
                                ]}>
                                    Get transporters immediately
                                </Text>
                            </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[
                                styles.requestTypeCard,
                                requestType === 'booking' && styles.requestTypeCardActive
                            ]}
                            onPress={() => setRequestType('booking')}
                        >
                            <View style={styles.requestTypeIconContainer}>
                                <MaterialCommunityIcons
                                    name="calendar-clock"
                                    size={24}
                                    color={requestType === 'booking' ? colors.white : accent}
                                />
                            </View>
                            <View style={styles.requestTypeTextContainer}>
                                <Text style={[
                                    styles.requestTypeTitle,
                                    requestType === 'booking' && styles.requestTypeTitleActive
                                ]}>
                                    Scheduled Booking
                                </Text>
                                <Text style={[
                                    styles.requestTypeDescription,
                                    requestType === 'booking' && styles.requestTypeDescriptionActive
                                ]}>
                                    Plan for future transport
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Enhanced Form Card */}
                    <View style={styles.formCard}>
                        {/* Location Fields */}
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="map-marker" size={20} color={accent} />
                            <Text style={styles.sectionTitle}>Location Details</Text>
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Pickup Location *</Text>
                            <LocationPicker
                                placeholder="Enter pickup location"
                                value={fromLocation}
                                onAddressChange={setFromLocation}
                                onLocationSelected={(location) => {
                                    console.log('Pickup location selected:', location);
                                }}
                                useCurrentLocation={true}
                                isPickupLocation={true}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Delivery Location *</Text>
                            <LocationPicker
                                placeholder="Enter delivery location"
                                value={toLocation}
                                onAddressChange={setToLocation}
                                onLocationSelected={(location) => {
                                    console.log('Delivery location selected:', location);
                                }}
                            />
                        </View>

                        {/* Product Details */}
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="package-variant" size={20} color={accent} />
                            <Text style={styles.sectionTitle}>Product Details</Text>
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Product Type *</Text>
                            <TextInput
                                style={styles.input}
                                value={productType}
                                onChangeText={(text) => {
                                    setProductType(text);
                                    if (text.trim().length === 0) {
                                        setShowProductSuggestions(false);
                                        setFilteredProducts(PRODUCT_SUGGESTIONS);
                                    } else {
                                        const lower = text.toLowerCase();
                                        const startsWith = PRODUCT_SUGGESTIONS.filter(p => p.toLowerCase().startsWith(lower));
                                        const contains = PRODUCT_SUGGESTIONS.filter(p => 
                                            p.toLowerCase().includes(lower) && !p.toLowerCase().startsWith(lower)
                                        );
                                        setFilteredProducts([...startsWith, ...contains]);
                                        setShowProductSuggestions(true);
                                    }
                                }}
                                placeholder="Enter product type"
                                placeholderTextColor={colors.text.light}
                            />
                            {showProductSuggestions && filteredProducts.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    {filteredProducts.slice(0, 5).map((product, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.suggestionItem}
                                            onPress={() => {
                                                setProductType(product);
                                                setShowProductSuggestions(false);
                                            }}
                                        >
                                            <MaterialCommunityIcons name="package-variant" size={16} color={colors.text.secondary} />
                                            <Text style={styles.suggestionText}>{product}</Text>
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
                                placeholder="Enter weight in kilograms"
                                placeholderTextColor={colors.text.light}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Special Requirements */}
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="shield-check" size={20} color={accent} />
                            <Text style={styles.sectionTitle}>Special Requirements</Text>
                        </View>

                        {/* Perishable Goods */}
                        {activeTab === 'agriTRUK' && (
                            <View style={styles.fieldGroup}>
                                <View style={styles.switchContainer}>
                                    <View style={styles.switchLabelContainer}>
                                        <MaterialCommunityIcons name="clock-fast" size={20} color={colors.warning} />
                                        <Text style={styles.switchLabel}>Perishable Goods</Text>
                                    </View>
                                    <Switch
                                        value={isPerishable}
                                        onValueChange={setIsPerishable}
                                        trackColor={{ false: colors.border, true: colors.warning + '40' }}
                                        thumbColor={isPerishable ? colors.warning : colors.text.light}
                                    />
                                </View>
                                {isPerishable && (
                                    <View style={styles.specsContainer}>
                                        <Text style={styles.specsTitle}>Select perishable types:</Text>
                                        <View style={styles.specsGrid}>
                                            {AGRI_PERISHABLES.map((spec) => (
                                                <TouchableOpacity
                                                    key={spec.key}
                                                    style={[
                                                        styles.specChip,
                                                        perishableSpecs.includes(spec.key) && styles.specChipActive
                                                    ]}
                                                    onPress={() => togglePerishableSpec(spec.key)}
                                                >
                                                    <MaterialCommunityIcons 
                                                        name={spec.icon as any} 
                                                        size={16} 
                                                        color={perishableSpecs.includes(spec.key) ? colors.white : colors.text.secondary} 
                                                    />
                                                    <Text style={[
                                                        styles.specChipText,
                                                        perishableSpecs.includes(spec.key) && styles.specChipTextActive
                                                    ]}>
                                                        {spec.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Special Cargo */}
                        {activeTab === 'cargoTRUK' && (
                            <View style={styles.fieldGroup}>
                                <View style={styles.switchContainer}>
                                    <View style={styles.switchLabelContainer}>
                                        <MaterialCommunityIcons name="shield-alert" size={20} color={colors.error} />
                                        <Text style={styles.switchLabel}>Special Cargo</Text>
                                    </View>
                                    <Switch
                                        value={isSpecialCargo}
                                        onValueChange={setIsSpecialCargo}
                                        trackColor={{ false: colors.border, true: colors.error + '40' }}
                                        thumbColor={isSpecialCargo ? colors.error : colors.text.light}
                                    />
                                </View>
                                {isSpecialCargo && (
                                    <View style={styles.specsContainer}>
                                        <Text style={styles.specsTitle}>Select special requirements:</Text>
                                        <View style={styles.specsGrid}>
                                            {CARGO_SPECIALS.map((spec) => (
                                                <TouchableOpacity
                                                    key={spec.key}
                                                    style={[
                                                        styles.specChip,
                                                        specialCargoSpecs.includes(spec.key) && styles.specChipActive
                                                    ]}
                                                    onPress={() => toggleSpecialCargoSpec(spec.key)}
                                                >
                                                    <MaterialCommunityIcons 
                                                        name={spec.icon as any} 
                                                        size={16} 
                                                        color={specialCargoSpecs.includes(spec.key) ? colors.white : colors.text.secondary} 
                                                    />
                                                    <Text style={[
                                                        styles.specChipText,
                                                        specialCargoSpecs.includes(spec.key) && styles.specChipTextActive
                                                    ]}>
                                                        {spec.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Insurance */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.switchContainer}>
                                <View style={styles.switchLabelContainer}>
                                    <MaterialCommunityIcons name="shield-check" size={20} color={colors.success} />
                                    <Text style={styles.switchLabel}>Insure Goods</Text>
                                </View>
                                <Switch
                                    value={insureGoods}
                                    onValueChange={setInsureGoods}
                                    trackColor={{ false: colors.border, true: colors.success + '40' }}
                                    thumbColor={insureGoods ? colors.success : colors.text.light}
                                />
                            </View>
                            {insureGoods && (
                                <View style={styles.insuranceContainer}>
                                    <Text style={styles.fieldLabel}>Insurance Value (KES)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={insuranceValue}
                                        onChangeText={setInsuranceValue}
                                        placeholder="Enter insurance value"
                                        placeholderTextColor={colors.text.light}
                                        keyboardType="numeric"
                                    />
                                </View>
                            )}
                        </View>

                        {/* Priority Toggle */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.switchContainer}>
                                <View style={styles.switchLabelContainer}>
                                    <MaterialCommunityIcons name="priority-high" size={20} color={colors.warning} />
                                    <Text style={styles.switchLabel}>Priority Request</Text>
                                </View>
                                <Switch
                                    value={isPriority}
                                    onValueChange={setIsPriority}
                                    trackColor={{ false: colors.border, true: colors.warning + '40' }}
                                    thumbColor={isPriority ? colors.warning : colors.text.light}
                                />
                            </View>
                        </View>

                        {/* Additional Notes */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Additional Notes</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={additional}
                                onChangeText={setAdditional}
                                placeholder="Any special instructions or additional information"
                                placeholderTextColor={colors.text.light}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.secondaryButton]}
                            onPress={handleAddToConsolidate}
                        >
                            <MaterialCommunityIcons name="plus" size={20} color={accent} />
                            <Text style={[styles.actionButtonText, { color: accent }]}>Add to Consolidation</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.primaryButton, { backgroundColor: accent }]}
                            onPress={handleSubmit}
                        >
                            <MaterialCommunityIcons 
                                name={requestType === 'instant' ? "lightning-bolt" : "calendar-check"} 
                                size={20} 
                                color={colors.white} 
                            />
                            <Text style={styles.actionButtonText}>
                                {requestType === 'instant' ? 'Find Transporters' : 'Schedule Booking'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Consolidations Display */}
                    {consolidations.length > 0 && (
                        <View style={styles.consolidationsCard}>
                            <View style={styles.consolidationsHeader}>
                                <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.primary} />
                                <Text style={styles.consolidationsTitle}>Consolidation ({consolidations.length})</Text>
                            </View>
                            <View style={styles.consolidationsList}>
                                {consolidations.slice(0, 3).map((item, index) => (
                                    <View key={index} style={styles.consolidationItem}>
                                        <View style={styles.consolidationInfo}>
                                            <Text style={styles.consolidationProduct}>{item.productType}</Text>
                                            <Text style={styles.consolidationRoute}>
                                                {item.fromLocation} → {item.toLocation}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => removeConsolidation(index)}
                                        >
                                            <MaterialCommunityIcons name="close" size={16} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {consolidations.length > 3 && (
                                    <Text style={styles.moreText}>+{consolidations.length - 3} more</Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.proceedButton]}
                                onPress={() => navigation.navigate('Consolidation')}
                            >
                                <MaterialCommunityIcons name="arrow-right" size={20} color={colors.white} />
                                <Text style={styles.actionButtonText}>Proceed with Consolidation</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Find Transporters Component */}
            {showTransporters && requestType === 'instant' && (
                <FindTransporters
                    requests={consolidations.length > 0 ? consolidations : [createRequestData()]}
                    distance=""
                    accent={accent}
                    onBack={() => setShowTransporters(false)}
                />
            )}

            {/* Date Pickers */}
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.white,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.white + 'CC',
        textAlign: 'center',
        marginTop: 2,
    },
    headerSpacer: {
        width: 40,
    },
    clientInfoCard: {
        backgroundColor: colors.white,
        margin: spacing.lg,
        borderRadius: 16,
        padding: spacing.lg,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    clientInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    clientInfoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: spacing.sm,
    },
    clientInfoContent: {
        marginLeft: spacing.lg,
    },
    clientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: 2,
    },
    clientCompany: {
        fontSize: 14,
        color: colors.text.secondary,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    serviceCardsContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        gap: spacing.md,
    },
    serviceCard: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    serviceCardActive: {
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    serviceCardGradient: {
        padding: spacing.lg,
    },
    serviceCardContent: {
        alignItems: 'center',
    },
    serviceIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    serviceIconContainerActive: {
        backgroundColor: colors.white + '20',
    },
    serviceTextContainer: {
        alignItems: 'center',
    },
    serviceLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    serviceLabelActive: {
        color: colors.white,
    },
    serviceSubtitle: {
        fontSize: 12,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    serviceSubtitleActive: {
        color: colors.white + 'CC',
    },
    selectedIndicator: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
    },
    requestTypeContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        gap: spacing.md,
    },
    requestTypeCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    requestTypeCardActive: {
        borderColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    requestTypeIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    requestTypeTextContainer: {
        flex: 1,
    },
    requestTypeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    requestTypeTitleActive: {
        color: colors.primary,
    },
    requestTypeDescription: {
        fontSize: 12,
        color: colors.text.secondary,
    },
    requestTypeDescriptionActive: {
        color: colors.primary + 'CC',
    },
    formCard: {
        backgroundColor: colors.white,
        marginHorizontal: spacing.lg,
        borderRadius: 20,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        marginTop: spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    fieldGroup: {
        marginBottom: spacing.lg,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: 16,
        color: colors.text.primary,
        backgroundColor: colors.white,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    suggestionsContainer: {
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: spacing.xs,
        maxHeight: 200,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    suggestionText: {
        fontSize: 14,
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    switchLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    specsContainer: {
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.background,
        borderRadius: 12,
    },
    specsTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    specsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    specChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    specChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    specChipText: {
        fontSize: 12,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    specChipTextActive: {
        color: colors.white,
    },
    insuranceContainer: {
        marginTop: spacing.md,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        gap: spacing.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    secondaryButton: {
        backgroundColor: colors.white,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.white,
        marginLeft: spacing.sm,
    },
    consolidationsCard: {
        backgroundColor: colors.white,
        marginHorizontal: spacing.lg,
        borderRadius: 20,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    consolidationsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    consolidationsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary,
        marginLeft: spacing.sm,
    },
    consolidationsList: {
        marginBottom: spacing.md,
    },
    consolidationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    consolidationInfo: {
        flex: 1,
    },
    consolidationProduct: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.primary,
        marginBottom: 2,
    },
    consolidationRoute: {
        fontSize: 14,
        color: colors.text.secondary,
    },
    removeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.error + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreText: {
        fontSize: 14,
        color: colors.text.secondary,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: spacing.sm,
    },
    proceedButton: {
        backgroundColor: colors.primary,
        marginTop: spacing.md,
    },
});

export default EnhancedRequestForm;
