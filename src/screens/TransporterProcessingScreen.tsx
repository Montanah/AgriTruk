import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { fonts, spacing } from '../constants';

export default function TransporterProcessingScreen({ route }) {
  // route.params?.transporterType can be 'individual' or 'company'
  const transporterType = route?.params?.transporterType || 'individual';
  const spinAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
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
      <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 18 }}>
        <Ionicons name={transporterType === 'company' ? 'business-outline' : 'person-circle-outline'} size={64} color={colors.primary} />
      </Animated.View>
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
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      <Text style={styles.waitingText}>Please wait for approval. You will be notified once your account is activated.</Text>
      <View style={styles.tipsBox}>
        <Ionicons name="information-circle-outline" size={22} color={colors.secondary} style={{ marginRight: 8 }} />
        <Text style={styles.tipsText}>
          {transporterType === 'company'
            ? 'Tip: You can prepare your fleet and driver details for quick onboarding once approved.'
            : 'Tip: Make sure your contact details are up to date for faster communication.'}
        </Text>
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
  },
  tipsText: {
    color: colors.secondary,
    fontSize: fonts.size.sm,
    flex: 1,
  },
});
