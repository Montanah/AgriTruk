import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useRef, useState, useEffect } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, spacing } from '../constants';
import colors from '../constants/colors';

import NotificationBell from '../components/Notification/NotificationBell';
import { useTransporters } from '../hooks/UseTransporters';
import { apiRequest } from '../utils/api';

import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

// import * as Location from 'expo-location';
// import MapView, { Marker, Polyline } from 'react-native-maps';
// import { GOOGLE_MAPS_API_KEY } from '@env';
// import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const TAB_UNDERLINE_WIDTH = 120;
const TAB_COUNT = 2;
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

type RootStackParamList = {
  TripDetails: { booking: any };
  // ...other screens
};

const ServiceRequestScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState('agriTRUK');
  const [fromLocation, setFromLocation] = useState('Current Location');
  // const [fromCoords, setFromCoords] = useState(null); // { latitude, longitude }
  // const [toLocation, setToLocation] = useState('');
  // const [toCoords, setToCoords] = useState(null); // { latitude, longitude }
  // const [distance, setDistance] = useState('');
  // const [routeCoords, setRouteCoords] = useState([]); // For Polyline
  // TEMP: Use static values to avoid errors
  const [fromCoords, setFromCoords] = useState({ latitude: 0, longitude: 0 });
  const [toLocation, setToLocation] = useState('');
  const [toCoords, setToCoords] = useState({ latitude: 0, longitude: 0 });
  const [distance, setDistance] = useState('');
  const [routeCoords, setRouteCoords] = useState([]);
  const [productType, setProductType] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [isPerishable, setIsPerishable] = useState(false);
  const [perishableSpecs, setPerishableSpecs] = useState<string[]>([]);
  const [isSpecialCargo, setIsSpecialCargo] = useState(false);
  const [specialCargoSpecs, setSpecialCargoSpecs] = useState<string[]>([]);
  const [weight, setWeight] = useState('');
  const [value, setValue] = useState('');
  const [additional, setAdditional] = useState('');
  const [error, setError] = useState('');
  const [anim] = useState(new Animated.Value(0));
  const tabIndex = activeTab === 'agriTRUK' ? 0 : 1;
  const pan = useRef(new Animated.ValueXY()).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [showTransporters, setShowTransporters] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [loadingDistance, setLoadingDistance] = useState(false);
  type Transporter = {
    id: string;
    name: string;
    phone: string;
    photo: string;
    est: string;
    rating: number;
    status: string;
    vehicleType: string;
    bodyType?: string;
    vehicleMake: string;
    vehicleColor: string;
    capacity: number;
    reg: string;
    driveType?: string;
    refrigeration?: boolean;
    humidityControl?: boolean;
    canHandle?: string[];
    perishableSpecs?: string[];
    specialCargo?: string[];
    costPerKm: number;
  };

  const [filteredTransporters, setFilteredTransporters] = useState<Transporter[]>([]);
  const [loadingTransporters, setLoadingTransporters] = useState(false);
  let { transporters, loading: loadingAllTransporters, error: transportersError } = useTransporters();
  if (!Array.isArray(transporters)) {
    console.warn('transporters is not an array or is undefined, defaulting to []', transporters);
    transporters = [];
  }
  const [formCollapsed, setFormCollapsed] = useState(false);
  const scrollRef = useRef(null);

  // Booking/Instant toggle
  const [requestType, setRequestType] = useState('instant'); // 'instant' or 'booking'
  const [pickupTime, setPickupTime] = useState(null); // Date object for booking
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Animate tab underline
  const animateTab = (to) => {
    Animated.timing(anim, {
      toValue: to,
      duration: 100,
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
        let newValue = Math.max(0, Math.min(1, 0.5 - gestureState.dx / 240));
        anim.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (anim._value < 0.5) {
          handleTabSwitch('agriTRUK', 0);
        } else {
          handleTabSwitch('cargoTRUK', 1);
        }
      },
    }),
  ).current;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(accent);
  }, [activeTab]);

  // TEMP: Comment out geolocation and distance fetching
  // useEffect(() => {
  //   (async () => {
  //     setLoadingGeo(true);
  //     let { status } = await Location.requestForegroundPermissionsAsync();
  //     if (status !== 'granted') {
  //       setError('Permission to access location was denied');
  //       setLoadingGeo(false);
  //       return;
  //     }
  //     let location = await Location.getCurrentPositionAsync({});
  //     setFromCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
  //     setFromLocation('Current Location');
  //     setLoadingGeo(false);
  //   })();
  // }, []);

  // useEffect(() => {
  //   if (fromCoords && toCoords) {
  //     setLoadingDistance(true);
  //     // Distance Matrix API
  //     fetch(
  //       `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${fromCoords.latitude},${fromCoords.longitude}&destinations=${toCoords.latitude},${toCoords.longitude}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`
  //     )
  //       .then((res) => res.json())
  //       .then((data) => {
  //         if (
  //           data.rows &&
  //           data.rows[0] &&
  //           data.rows[0].elements &&
  //           data.rows[0].elements[0] &&
  //           data.rows[0].elements[0].distance
  //         ) {
  //           setDistance(data.rows[0].elements[0].distance.text);
  //         } else {
  //           setDistance('');
  //         }
  //         setLoadingDistance(false);
  //       })
  //       .catch(() => {
  //         setDistance('');
  //         setLoadingDistance(false);
  //       });
  //     // Directions API for route polyline
  //     fetch(
  //       `https://maps.googleapis.com/maps/api/directions/json?origin=${fromCoords.latitude},${fromCoords.longitude}&destination=${toCoords.latitude},${toCoords.longitude}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}`
  //     )
  //       .then((res) => res.json())
  //       .then((data) => {
  //         if (data.routes && data.routes[0] && data.routes[0].overview_polyline) {
  //           const points = decodePolyline(data.routes[0].overview_polyline.points);
  //           setRouteCoords(points);
  //         } else {
  //           setRouteCoords([]);
  //         }
  //       })
  //       .catch(() => setRouteCoords([]));
  //   }
  // }, [fromCoords, toCoords]);

  // Polyline decoder
  function decodePolyline(encoded) {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  }

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
    if (!fromCoords || !toCoords || !weight || !productType) return false;
    if (activeTab === 'agriTRUK' && isPerishable && perishableSpecs.length === 0) return false;
    if (activeTab === 'cargoTRUK' && isSpecialCargo && specialCargoSpecs.length === 0) return false;
    if (requestType === 'booking' && !pickupTime) return false;
    return true;
  };

  const accent = activeTab === 'agriTRUK' ? colors.primary : colors.secondary;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 10, paddingRight: 8, backgroundColor: accent }}>
        <NotificationBell />
      </View>
      <View style={{ height: Platform.OS === 'ios' ? 44 : 32, backgroundColor: accent, width: '100%' }} />
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
          ref={scrollRef}
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
                  <Text style={[styles.tabLabel, activeTab === tab.key && { color: tab.accent }]}> {tab.label} </Text>
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
                  ...(containerWidth
                    ? [{
                      left: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          getUnderlineLeft(0, containerWidth),
                          getUnderlineLeft(1, containerWidth),
                        ],
                      }),
                    }]
                    : []),
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
            {/* Request Type Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  requestType === 'instant' && {
                    backgroundColor: accent,
                    borderColor: accent,
                    borderWidth: 2,
                    shadowColor: accent,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.18,
                    shadowRadius: 6,
                    elevation: 4,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => setRequestType('instant')}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    requestType === 'instant' && {
                      color: colors.white,
                      fontWeight: 'bold',
                      fontSize: fonts.size.lg,
                      letterSpacing: 0.5,
                    },
                  ]}
                >
                  Instant
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  requestType === 'booking' && {
                    backgroundColor: accent,
                    borderColor: accent,
                    borderWidth: 2,
                    shadowColor: accent,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.18,
                    shadowRadius: 6,
                    elevation: 4,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => setRequestType('booking')}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    requestType === 'booking' && {
                      color: colors.white,
                      fontWeight: 'bold',
                      fontSize: fonts.size.lg,
                      letterSpacing: 0.5,
                    },
                  ]}
                >
                  Booking
                </Text>
              </TouchableOpacity>
            </View>
            {/* Map Section (TEMPORARILY DISABLED) */}
            {/* <View style={{ width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: 18, backgroundColor: '#eaeaea' }}>
              {loadingGeo ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={accent} />
                  <Text style={{ color: accent, marginTop: 8 }}>Getting your location...</Text>
                </View>
              ) : (
                <MapView
                  style={{ flex: 1 }}
                  region={
                    fromCoords && toCoords
                      ? {
                          latitude: (fromCoords.latitude + toCoords.latitude) / 2,
                          longitude: (fromCoords.longitude + toCoords.longitude) / 2,
                          latitudeDelta: Math.abs(fromCoords.latitude - toCoords.latitude) * 2 + 0.05,
                          longitudeDelta: Math.abs(fromCoords.longitude - toCoords.longitude) * 2 + 0.05,
                        }
                      : fromCoords
                      ? {
                          latitude: fromCoords.latitude,
                          longitude: fromCoords.longitude,
                          latitudeDelta: 0.05,
                          longitudeDelta: 0.05,
                        }
                      : {
                          latitude: 0,
                          longitude: 0,
                          latitudeDelta: 0.05,
                          longitudeDelta: 0.05,
                        }
                  }
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                  provider={Platform.OS === 'android' ? 'google' : undefined}
                >
                  {fromCoords && (
                    <Marker coordinate={fromCoords} title="From" description={fromLocation} pinColor={colors.primary} />
                  )}
                  {toCoords && (
                    <Marker coordinate={toCoords} title="To" description={toLocation} pinColor={colors.secondary} />
                  )}
                  {routeCoords.length > 0 && (
                    <Polyline coordinates={routeCoords} strokeColor={accent} strokeWidth={4} />
                  )}
                </MapView>
              )}
            </View> */}
            {/* Form Card */}
            <View style={styles.formCard}>
              {formCollapsed && (
                <TouchableOpacity
                  style={{ alignSelf: 'flex-end', marginBottom: 8, padding: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.text.light }}
                  onPress={() => setFormCollapsed(false)}
                >
                  <Text style={{ color: accent, fontWeight: 'bold', fontSize: 13 }}>Expand Form</Text>
                </TouchableOpacity>
              )}
              {!formCollapsed && <>
                <Text style={styles.label}>From</Text>
                <TouchableOpacity style={styles.locationInput}>
                  <Ionicons name="locate" size={18} color={accent} style={{ marginRight: 8 }} />
                  <Text style={styles.locationText}>{fromLocation}</Text>
                  <Text style={styles.changeText}>Current</Text>
                </TouchableOpacity>
                <Text style={styles.label}>To</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter destination"
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
                    {(PRODUCT_SUGGESTIONS || []).filter((p) =>
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
                        <Text style={[styles.toggleLabel, isPerishable && { color: colors.white }]}> Perishable </Text>
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
                        <Text style={[styles.toggleLabel, !isPerishable && { color: colors.white }]}> Normal </Text>
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
                        <Text style={[styles.toggleLabel, isSpecialCargo && { color: colors.white }]}> Special Cargo </Text>
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
                        <Text style={[styles.toggleLabel, !isSpecialCargo && { color: colors.white }]}> Normal </Text>
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
                {/* Booking Pickup Time Field */}
                {requestType === 'booking' && (
                  <>
                    <Text style={styles.label}>Pickup Time</Text>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={{ color: pickupTime ? colors.text.primary : colors.text.light }}>
                        {pickupTime ? pickupTime.toLocaleString() : 'Select pickup date and time'}
                      </Text>
                    </TouchableOpacity>
                    <DateTimePickerModal
                      isVisible={showDatePicker}
                      mode="datetime"
                      date={pickupTime || new Date()}
                      onConfirm={(date) => {
                        setPickupTime(date);
                        setShowDatePicker(false);
                      }}
                      onCancel={() => setShowDatePicker(false)}
                    />
                  </>
                )}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                {loadingDistance && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <ActivityIndicator size="small" color={accent} />
                    <Text style={{ marginLeft: 8, color: accent }}>Calculating distance...</Text>
                  </View>
                )}
                {distance && !loadingDistance && (
                  <Text style={{ color: accent, fontWeight: 'bold', marginTop: 8 }}>
                    Distance: {distance}
                  </Text>
                )}
              </>}
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
                {requestType === 'booking' && (
                  <Text style={styles.summaryText}>Pickup Time: {pickupTime ? pickupTime.toLocaleString() : '---'}</Text>
                )}
                <Text style={styles.summaryText}>Type: {requestType === 'booking' ? 'Booking' : 'Instant'}</Text>
                {distance && !loadingDistance && (
                  <Text style={[styles.summaryText, { color: accent }]}>Distance: {distance}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.findBtn,
                  { backgroundColor: isValid() ? accent : colors.text.light },
                ]}
                disabled={!isValid()}
                onPress={() => {
                  if (requestType === 'booking') {
                    // Integrate with backend booking API
                    const bookingPayload = {
                      fromLocation,
                      toLocation,
                      productType,
                      weight,
                      value,
                      additional,
                      perishableSpecs,
                      specialCargoSpecs,
                      pickupTime: pickupTime ? pickupTime.toISOString() : '',
                      requestType,
                      fromCoords,
                      toCoords,
                      distance,
                    };
                    const endpoint = activeTab === 'agriTRUK' ? '/bookings/agri' : '/bookings/cargo';
                    apiRequest(endpoint, {
                      method: 'POST',
                      body: JSON.stringify(bookingPayload),
                    })
                      .then(() => {
                        Alert.alert('Booking placed!', 'Your booking has been created successfully.');
                      })
                      .catch((err) => {
                        Alert.alert('Booking failed', err.message || 'Failed to create booking');
                      });
                  } else {
                    setLoadingTransporters(true);
                    setShowTransporters(false);
                    setFormCollapsed(true);
                    setTimeout(() => {
                      let filtered = (transporters || []).filter((t) => {
                        if (activeTab === 'agriTRUK') {
                          if (isPerishable) {
                            return (
                              t.canHandle?.includes('perishable') &&
                              perishableSpecs.every((spec) => t.perishableSpecs?.includes(spec))
                            );
                          }
                          return t.canHandle?.includes('agri');
                        } else {
                          if (isSpecialCargo) {
                            return (
                              t.canHandle?.includes('cargo') &&
                              specialCargoSpecs.every((spec) => t.specialCargo?.includes(spec))
                            );
                          }
                          return t.canHandle?.includes('cargo');
                        }
                      });
                      setFilteredTransporters(filtered);
                      setLoadingTransporters(false);
                      setShowTransporters(true);
                      if (scrollRef.current) {
                        scrollRef.current.scrollToEnd({ animated: true });
                      }
                    }, 1400);
                  }
                }}
              >
                <Text style={styles.findBtnText}>{requestType === 'booking' ? 'Place Booking' : 'Find Transporters'}</Text>
              </TouchableOpacity>
              {/* Transporter List or Skeleton Loader */}
              {requestType === 'instant' && (loadingTransporters || showTransporters) && (
                <View style={{ width: '100%', marginTop: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: accent }}>
                    Available Transporters
                  </Text>
                  {loadingTransporters ? (
                    <>
                      <Text style={{ textAlign: 'center', color: accent, fontWeight: 'bold', marginBottom: 12, fontSize: 16 }}>
                        Finding available transporters...
                      </Text>
                      {[1, 2, 3].map((i) => (
                        <View
                          key={i}
                          style={{
                            backgroundColor: colors.surface,
                            borderRadius: 14,
                            padding: 16,
                            marginBottom: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            opacity: 0.6,
                          }}
                        >
                          <View style={{ marginRight: 16 }}>
                            <View
                              style={{
                                width: 54,
                                height: 54,
                                borderRadius: 27,
                                backgroundColor: '#e0e0e0',
                              }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ height: 16, width: '60%', backgroundColor: '#e0e0e0', borderRadius: 8, marginBottom: 8 }} />
                            <View style={{ height: 12, width: '40%', backgroundColor: '#e0e0e0', borderRadius: 8, marginBottom: 6 }} />
                            <View style={{ height: 10, width: '30%', backgroundColor: '#e0e0e0', borderRadius: 8, marginBottom: 6 }} />
                            <View style={{ height: 14, width: '50%', backgroundColor: '#e0e0e0', borderRadius: 8 }} />
                          </View>
                          <View style={{ width: 70, height: 32, backgroundColor: '#e0e0e0', borderRadius: 8 }} />
                        </View>
                      ))}
                    </>
                  ) : showTransporters ? (
                    filteredTransporters.length === 0 ? (
                      <Text style={{ color: colors.error, marginBottom: 12 }}>
                        No suitable transporters found for your request.
                      </Text>
                    ) : (
                      filteredTransporters.map((t) => {
                        // Calculate estimated amount if possible
                        let estAmount = '';
                        let distNum = parseFloat((distance || '').replace(/[^\d.]/g, ''));
                        if (!isNaN(distNum) && t.costPerKm) {
                          estAmount = `KES ${(distNum * t.costPerKm).toFixed(2)}`;
                        }
                        return (
                          <View
                            key={t.id}
                            style={{
                              backgroundColor: colors.surface,
                              borderRadius: 16,
                              padding: 16,
                              marginBottom: 16,
                              shadowColor: colors.black,
                              shadowOpacity: 0.08,
                              shadowRadius: 8,
                              elevation: 2,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                              <View
                                style={{
                                  width: 54,
                                  height: 54,
                                  borderRadius: 27,
                                  backgroundColor: '#eee',
                                  overflow: 'hidden',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  marginRight: 16,
                                }}
                              >
                                <Animated.Image
                                  source={{ uri: t.photo }}
                                  style={{ width: 54, height: 54, borderRadius: 27 }}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 16, color: colors.text.primary }}>{t.name}</Text>
                                <Text style={{ color: accent, fontWeight: 'bold', fontSize: 13 }}>ETA: {t.est || 'N/A'}</Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <MaterialCommunityIcons name="star" size={16} color={colors.secondary} style={{ marginRight: 2 }} />
                                  <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 15 }}>{t.rating}</Text>
                                </View>
                                <Text style={{ color: t.status === 'Active' ? colors.success : colors.warning, fontWeight: 'bold', fontSize: 12 }}>{t.status}</Text>
                              </View>
                            </View>
                            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 15, marginBottom: 2 }}>
                              {t.vehicleType}{t.bodyType ? ` (${t.bodyType})` : ''} • {t.vehicleMake} • {t.vehicleColor} • {t.capacity}T • {t.reg}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                              {t.refrigeration && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                                  <MaterialCommunityIcons name="snowflake" size={15} color={accent} style={{ marginRight: 2 }} />
                                  <Text style={{ color: accent, fontSize: 13 }}>Refrigerated</Text>
                                </View>
                              )}
                              {t.humidityControl && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                                  <MaterialCommunityIcons name="water-percent" size={15} color={accent} style={{ marginRight: 2 }} />
                                  <Text style={{ color: accent, fontSize: 13 }}>Humidity Ctrl</Text>
                                </View>
                              )}
                              {t.driveType && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                                  <MaterialCommunityIcons name="car" size={15} color={accent} style={{ marginRight: 2 }} />
                                  <Text style={{ color: accent, fontSize: 13 }}>{t.driveType}</Text>
                                </View>
                              )}
                            </View>
                            {estAmount && (
                              <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 15, marginBottom: 2 }}>
                                Estimated Amount: {estAmount}
                              </Text>
                            )}
                            <TouchableOpacity
                              style={{
                                backgroundColor: accent,
                                borderRadius: 10,
                                paddingVertical: 8,
                                paddingHorizontal: 18,
                                alignSelf: 'flex-end',
                                marginTop: 8,
                              }}
                              onPress={() => navigation.navigate('TripDetails', {
                                booking: {
                                  id: t.id,
                                  pickupLocation: fromLocation,
                                  toLocation: toLocation,
                                  cargoDetails: productType + (weight ? `, ${weight} kg` : ''),
                                  pickupTime: '',
                                  status: 'in-progress',
                                  type: 'instant',
                                  transporterType: 'individual',
                                  transporter: {
                                    id: t.id,
                                    name: t.name,
                                    phone: t.phone,
                                    photo: t.photo,
                                  },
                                  vehicle: {
                                    type: t.vehicleType,
                                    color: t.vehicleColor,
                                    make: t.vehicleMake,
                                    capacity: t.capacity + 'T',
                                    plate: t.reg,
                                    driveType: t.driveType || '',
                                  },
                                  reference: 'REF-' + t.id,
                                  eta: t.est,
                                  distance: distance,
                                }
                              })}
                            >
                              <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 16 }}>Select</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )
                  ) : null}
                </View>
              )}
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
  note: {
    marginTop: 8,
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ServiceRequestScreen;
