import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { fonts, spacing } from '../constants';
import colors from '../constants/colors';

export default function TransporterProcessingScreen({ route }) {
  // route.params?.transporterType can be 'individual' or 'company'
  const transporterType = route?.params?.transporterType || 'individual';
  const navigation = useNavigation();
  // Animated glowing ring effect (LED-like)
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  const ringSpin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Progress steps
  const steps = [
    { label: 'Submitted', icon: 'cloud-upload-outline' },
    { label: 'Under Review', icon: 'eye-outline' },
    { label: 'Approved', icon: 'checkmark-circle-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.profileGlowWrap}>
        <Animated.View
          style={{
            transform: [{ rotate: ringSpin }, { scale: pulseAnim }],
            position: 'absolute',
            left: 0, right: 0, top: 0, bottom: 0,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#00FF6A',
            shadowOpacity: 0.85,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 0 },
            elevation: 16,
          }}
        >
          <LinearGradient
            colors={['#00FF6A', '#00C853', '#00FF6A', '#00C853', '#00FF6A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.glowRing}
          />
          <Animated.View
            style={{
              position: 'absolute',
              left: 30, top: 30, right: 30, bottom: 30,
              borderRadius: 30,
              backgroundColor: '#00FF6A',
              opacity: pulseAnim.interpolate({ inputRange: [1, 1.18], outputRange: [0.18, 0.32] }),
              shadowColor: '#00FF6A',
              shadowOpacity: 0.9,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 0 },
              elevation: 10,
            }}
          />
        </Animated.View>
        <View style={styles.profileIconWrap}>
          <Ionicons name={transporterType === 'company' ? 'business-outline' : 'person-circle-outline'} size={80} color={'#00FF6A'} />
        </View>
      </View>
      <View style={styles.cardWrap}>
        <Text style={styles.title}>{transporterType === 'company' ? 'Company Profile Under Review' : 'Documents Under Review'}</Text>
        <Text style={styles.subtitle}>
          {transporterType === 'company'
            ? 'Your company profile and documents have been submitted and are being reviewed by our admin team.'
            : 'Your profile and documents have been submitted and are being reviewed by our admin team.'}
        </Text>
        {/* Progress Timeline */}
        <View style={styles.timelineRow}>
          {steps.map((step, idx) => (
            <View key={step.label} style={styles.timelineStep}>
              <Ionicons
                name={step.icon}
                size={32}
                color={idx === 1 ? colors.primary : colors.text.light}
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.timelineLabel, idx === 1 && { color: colors.primary, fontWeight: 'bold' }]}>{step.label}</Text>
              {idx < steps.length - 1 && <View style={styles.timelineBar} />}
            </View>
          ))}
        </View>
        <Text style={styles.waitingText}>Your documents are under review. You will be notified once your account is activated.</Text>
        <View style={styles.tipsBox}>
          <Ionicons name="information-circle-outline" size={22} color={colors.secondary} style={{ marginRight: 8 }} />
          <Text style={styles.tipsText}>
            {transporterType === 'company'
              ? 'Tip: You can prepare your fleet and driver details for quick onboarding once approved.'
              : 'Tip: Make sure your contact details are up to date for faster communication.'}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && { backgroundColor: colors.primary + '22' },
          ]}
          onPress={() => {/* Placeholder for refresh logic */ }}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.refreshBtnText}>Refresh Status</Text>
        </Pressable>
      </View>
      <View style={{ marginTop: 32, width: '100%' }}>
        <Text style={{ textAlign: 'center', color: colors.text.light, marginBottom: 8 }}>
          For UI testing only:
        </Text>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.text.secondary, marginBottom: 4 }}>
            Go to {transporterType === 'company' ? 'Company' : 'Transporter'} Dashboard
          </Text>
          <View style={{ width: 220 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                marginBottom: 8,
              }}
              onPress={() => navigation.navigate('TransporterTabs', { transporterType })}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Go to {transporterType === 'company' ? 'Company' : 'Transporter'} Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  profileGlowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    width: 120,
    height: 120,
    alignSelf: 'center',
  },
  glowRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.92,
    borderWidth: 4,
    borderColor: '#00FF6A',
    backgroundColor: '#003f1f',
  },
  profileIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  cardWrap: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 22,
    marginBottom: 18,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    maxWidth: 340,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
    width: '100%',
  },
  timelineStep: {
    alignItems: 'center',
    flexDirection: 'column',
    flex: 1,
    position: 'relative',
  },
  timelineLabel: {
    fontSize: fonts.size.sm,
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: 2,
  },
  timelineBar: {
    position: 'absolute',
    top: 16,
    right: -8,
    width: 16,
    height: 2,
    backgroundColor: colors.text.light,
    zIndex: 0,
  },
  waitingText: {
    color: colors.text.secondary,
    fontSize: fonts.size.md,
    marginTop: spacing.lg,
    textAlign: 'center',
    maxWidth: 320,
  },
  tipsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.secondary + '33',
    maxWidth: 340,
    alignSelf: 'center',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginTop: 18,
    marginBottom: 2,
  },
  refreshBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  tipsText: {
    color: colors.secondary,
    fontSize: fonts.size.sm,
    flex: 1,
  },
});
