import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../../constants';

const { width } = Dimensions.get('window');

const roles = [
  {
    key: 'farmer',
    label: 'Farmer',
    accent: colors.primary,
    icon: (animatedStyle: any) => (
      <Animated.View style={animatedStyle}>
        <FontAwesome5 name="tractor" size={32} color={colors.primary} />
      </Animated.View>
    ),
    description: 'For farmers moving produce to market',
  },
  {
    key: 'business',
    label: 'Business',
    accent: colors.secondary,
    icon: (animatedStyle: any) => (
      <Animated.View style={animatedStyle}>
        <Ionicons name="business" size={32} color={colors.secondary} />
      </Animated.View>
    ),
    description: 'For agri-businesses and cooperatives',
  },
  {
    key: 'individual',
    label: 'Individual',
    accent: colors.tertiary,
    icon: (animatedStyle: any) => (
      <Animated.View style={animatedStyle}>
        <FontAwesome5 name="user" size={32} color={colors.tertiary} />
      </Animated.View>
    ),
    description: 'For individuals needing transport',
  },
  {
    key: 'driver',
    label: 'Driver',
    accent: '#FF8C00',
    icon: (animatedStyle: any) => (
      <Animated.View style={animatedStyle}>
        <MaterialCommunityIcons name="truck" size={32} color="#FF8C00" />
      </Animated.View>
    ),
    description: 'For transporters and drivers',
  },
];

const SignupSelectionScreen = () => {
  const navigation = useNavigation();

  // Logo left-right motion
  const logoAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(logoAnim, {
          toValue: -1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [logoAnim]);

  const logoTranslate = logoAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-10, 0, 10],
  });

  // Card + icon animations
  const cardAnims = roles.map(() => useRef(new Animated.Value(0)).current);
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stagger in cards
    Animated.stagger(
      120,
      cardAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
        }),
      ),
    ).start();

    // Looping pulse for icons
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <>
      <StatusBar style="light" translucent />
      <LinearGradient
        colors={[
          '#081c0f',
          colors.primaryDark,
          colors.primary,
          colors.secondary,
          colors.background,
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.container}>
          {/* Animated Logo */}
          <View style={styles.logoBgWrap}>
            <View style={styles.logoBg} />
            <Animated.Image
              source={require('../../../assets/images/TRUK Logo.png')}
              style={[styles.logo, { transform: [{ translateX: logoTranslate }] }]}
            />
          </View>
          <Text style={styles.title}>Signing up as?</Text>
          {roles.map((role, i) => (
            <Animated.View
              key={role.key}
              style={{
                opacity: cardAnims[i],
                transform: [
                  {
                    translateY: cardAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                  {
                    scale: cardAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                onPress={() => navigation.navigate('Signup', { role: role.key })}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.cardWrap,
                    role.key === 'driver' && { borderColor: '#FF8C00', borderWidth: 0.5 },
                  ]}
                >
                  <LinearGradient
                    colors={['#ffffffcc', '#f7f9fcbb', '#ffffffaa']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Animated.View
                    style={[
                      styles.accentDot,
                      role.key === 'driver'
                        ? { backgroundColor: '#FF8C00', shadowColor: '#FF8C00' }
                        : { backgroundColor: role.accent, shadowColor: role.accent },
                      {
                        transform: [
                          {
                            scale: cardAnims[i].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.7, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <View style={styles.iconWrap}>
                    {role.icon({ transform: [{ scale: iconPulse }] })}
                  </View>
                  <View style={styles.roleContent}>
                    <Text
                      style={[
                        styles.roleLabel,
                        role.key === 'driver' ? { color: '#FF8C00' } : { color: role.accent },
                      ]}
                    >
                      {role.label}
                    </Text>
                    <Text style={styles.roleDescription}>{role.description}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoBgWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    zIndex: 2,
    width: width * 0.32,
    height: width * 0.32,
  },
  logoBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.32,
    height: width * 0.32,
    borderRadius: 24,
    backgroundColor: colors.white,
    zIndex: 1,
    elevation: 6,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  logo: {
    width: width * 0.28,
    height: width * 0.28,
    borderRadius: 18,
    zIndex: 2,
    resizeMode: 'contain',
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: '#ffffffee',
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontFamily: fonts.family.bold,
    letterSpacing: 0.5,
  },
  cardWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 22,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    width: width - spacing.xl * 2,
    maxWidth: 440,
    borderWidth: 1.2,
    borderColor: '#eeeeee',
    position: 'relative',
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  accentDot: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.85,
    zIndex: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
    zIndex: 2,
  },
  roleContent: {
    flex: 1,
    zIndex: 2,
  },
  roleLabel: {
    fontSize: fonts.size.lg,
    fontWeight: '700',
    marginBottom: 2,
    fontFamily: fonts.family.bold,
    letterSpacing: 0.2,
  },
  roleDescription: {
    fontSize: fonts.size.md,
    color: '#333',
    lineHeight: 20,
    fontWeight: '500',
    opacity: 0.85,
  },
});

export default SignupSelectionScreen;
