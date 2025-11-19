import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/common/Button';
import Spacer from '../components/common/Spacer';
import { colors, fonts, spacing } from '../constants';
import { useResponsive } from '../hooks/useResponsive';

const features = [
  {
    icon: <FontAwesome5 name="tractor" size={38} color={colors.secondary} />,
    graphic: <MaterialCommunityIcons name="truck-delivery" size={60} color={colors.success} />,
    title: 'agriTRUK',
    description: 'For transporting farm goods and all types of agricultural products from farm to market.',
    color: colors.secondary,
    accent: colors.success,
  },
  {
    icon: <Ionicons name="cube-outline" size={38} color={colors.tertiary} />,
    graphic: <FontAwesome5 name="box-open" size={60} color={colors.primary} />,
    title: 'cargoTRUK',
    description: 'For general cargo, logistics, and goods transportation of any kind.',
    color: colors.tertiary,
    accent: colors.primary,
  },
  {
    icon: <MaterialCommunityIcons name="truck" size={38} color={'#FF8C00'} />,
    graphic: <MaterialCommunityIcons name="truck" size={60} color={'#FF8C00'} />,
    title: 'Transporter',
    description: 'For transport companies and businesses in the logistics industry to manage fleets, drivers, and operations',
    color: '#FF8C00',
    accent: '#FF8C00',
  },
  {
    icon: <Ionicons name="location-outline" size={38} color={colors.primary} />,
    graphic: <MaterialCommunityIcons name="map-marker-path" size={60} color={colors.warning} />,
    title: 'Live Tracking',
    description: 'Real-time GPS tracking and delivery updates',
    color: colors.primary,
    accent: colors.warning,
  },
];

const ANIMATION_DURATION = 700;
const DISPLAY_DURATION = 5000;

const WelcomeScreen = () => {
  const { isTablet, maxContentWidth, width: screenWidth, isLandscape } = useResponsive();
  const navigation = useNavigation();
  
  // Responsive logo size - smaller on tablets to prevent it from being too large
  // Even smaller in landscape
  const logoSize = isTablet 
    ? (isLandscape ? Math.min(screenWidth * 0.15, 150) : Math.min(screenWidth * 0.25, 200))
    : screenWidth * 0.36;
  
  const styles = getStyles(isTablet, maxContentWidth, screenWidth, isLandscape, logoSize);
  const [featureIndex, setFeatureIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;

  const handleSignupPress = useCallback(() => {
    navigation.navigate('SignupSelection');
  }, [navigation]);

  const handleSignInPress = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(logoAnim, {
            toValue: -1,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ]),
      ).start();
    }, 0);
    return () => clearTimeout(timeout);
  }, [logoAnim]);

  useEffect(() => {
    const interval = setInterval(
      () => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
            easing: Easing.out(Easing.exp),
          }),
          Animated.timing(translateYAnim, {
            toValue: 36,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
            easing: Easing.out(Easing.exp),
          }),
        ]).start(() => {
          translateYAnim.setValue(-36);
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: ANIMATION_DURATION,
              useNativeDriver: true,
              easing: Easing.in(Easing.exp),
            }),
            Animated.timing(translateYAnim, {
              toValue: 0,
              duration: ANIMATION_DURATION,
              useNativeDriver: true,
              easing: Easing.in(Easing.exp),
            }),
          ]).start(() => {
            // Update feature index after animation completes
            setFeatureIndex((prev) => (prev + 1) % features.length);
          });
        });
      },
      DISPLAY_DURATION + ANIMATION_DURATION * 2,
    );
    return () => clearInterval(interval);
  }, [fadeAnim, translateYAnim]);

  const feature = features[featureIndex];
  const logoTranslate = logoAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-10, 0, 10],
  });

  return (
    <>
      <StatusBar style="light" translucent />
      <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
        <LinearGradient
          colors={[colors.primary, colors.secondary, colors.background]}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.container}>
          <View style={styles.logoBgWrap}>
            <View style={styles.logoBg} />
            <Animated.Image
              source={require('../../assets/images/TRUK Logo.png')}
              style={[styles.logo, { transform: [{ translateX: logoTranslate }] }]}
            />
          </View>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>TRUK</Text>
            <Text style={[styles.brandApp, { backgroundColor: 'transparent', color: '#fff' }]}>app</Text>
          </View>
          <Text style={styles.subtitle}>
            Move farm and cargo products with ease, safety, and speed.
          </Text>
          <Spacer size={spacing.lg} />
          <Animated.View
            style={[
              styles.featureCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateYAnim }, { scale: fadeAnim }],
                shadowColor: feature.accent,
                backgroundColor: 'rgba(255,255,255,0.85)',
                borderRadius: 18,
                paddingVertical: spacing.lg,
                paddingHorizontal: spacing.md,
                minHeight: 90,
                marginTop: 8,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#f0f0f0',
              },
            ]}
          >
            <View
              style={[
                styles.featureAccentDot,
                {
                  backgroundColor: feature.accent,
                  shadowColor: feature.accent,
                },
              ]}
            />
            <View style={styles.featureGraphicWrap}>
              <View style={[styles.featureGraphicBg, { backgroundColor: feature.accent }]} />
              {feature.graphic}
            </View>
            <View style={styles.featureContent}>
              <View style={styles.featureTitleRow}>
                {feature.icon}
                <Text style={[styles.featureTitle, { color: feature.color }]}>{feature.title}</Text>
              </View>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </Animated.View>
          <Spacer size={spacing.xl} />
          <Button
            title="Get Started"
            onPress={handleSignupPress}
            style={styles.button}
            textColor={colors.white}
          />
          <Spacer size={spacing.md} />
          <Button
            title="Sign In"
            onPress={handleSignInPress}
            style={styles.signInButton}
            textColor={colors.primary}
          />
        </View>
      </SafeAreaView>
    </>
  );
};

// Styles need to be created inside component to access responsive values
// We'll create a function that returns styles based on responsive values
const getStyles = (isTablet: boolean, maxContentWidth: number, screenWidth: number, isLandscape: boolean, logoSize: number) => {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    backgroundGradient: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 0,
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: isTablet ? (isLandscape ? spacing.xxl : spacing.xxl * 2) : spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
      zIndex: 1,
      maxWidth: isTablet ? maxContentWidth : '100%',
      alignSelf: 'center',
      width: '100%',
      flexDirection: isTablet && isLandscape ? 'row' : 'column',
      flexWrap: isTablet && isLandscape ? 'wrap' : 'nowrap',
    },
    logoBgWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      zIndex: 2,
      width: logoSize,
      height: logoSize,
    },
    logoBg: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: logoSize,
      height: logoSize,
      borderRadius: 32,
      backgroundColor: colors.white,
      zIndex: 1,
      elevation: 6,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    logo: {
      width: logoSize * 0.89,
      height: logoSize * 0.89,
      borderRadius: 24,
      zIndex: 2,
      resizeMode: 'contain',
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    brandName: {
      fontSize: isTablet ? fonts.size.xxl * 1.2 : fonts.size.xxl,
      fontWeight: 'bold',
      color: colors.primary,
      letterSpacing: 1.2,
      fontFamily: fonts.family.bold,
      marginRight: 8,
    },
    brandApp: {
      fontSize: isTablet ? fonts.size.xxl * 1.2 : fonts.size.xxl,
      fontWeight: 'bold',
      fontFamily: fonts.family.bold,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      minWidth: 48,
      overflow: 'visible',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: isTablet ? fonts.size.lg * 1.1 : fonts.size.lg,
      color: colors.text.primary,
      textAlign: 'center',
      lineHeight: isTablet ? 28 : 24,
      marginTop: 2,
      fontWeight: '600',
      letterSpacing: 0.2,
      maxWidth: isTablet ? 500 : 320,
      marginBottom: spacing.lg,
      fontFamily: fonts.family.medium,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.7)',
      borderRadius: 28,
      paddingVertical: isTablet ? spacing.xl * 1.2 : spacing.xl,
      paddingHorizontal: isTablet ? spacing.xl : spacing.lg,
      marginTop: 2,
      marginBottom: 2,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 16,
      width: '100%',
      maxWidth: isTablet ? 600 : 420,
      minHeight: isTablet ? 130 : 110,
      borderWidth: 1.5,
      borderColor: '#f2f2f2',
      position: 'relative',
      overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    },
  featureAccentDot: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0.85,
    zIndex: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  featureGraphicWrap: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
    position: 'relative',
    zIndex: 2,
  },
  featureGraphicBg: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    opacity: 0.13,
    zIndex: 0,
  },
  featureContent: {
    flex: 1,
    zIndex: 2,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: fonts.size.lg,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  featureDescription: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginTop: 2,
    fontWeight: '500',
  },
    button: {
      width: isTablet ? 280 : 220,
      borderRadius: 18,
      elevation: 2,
    },
    signInButton: {
      backgroundColor: colors.white,
      borderWidth: 1.5,
      borderColor: colors.primary,
      width: isTablet ? 280 : 220,
      borderRadius: 18,
      elevation: 0,
    },
  });
};

export default WelcomeScreen;