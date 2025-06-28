import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { fonts, spacing } from '../constants';

export default function TransporterProcessingScreen() {
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

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 18 }}>
        <Ionicons name="cloud-upload-outline" size={64} color={colors.primary} />
      </Animated.View>
      <Text style={styles.title}>Documents Under Review</Text>
      <Text style={styles.subtitle}>
        Your profile and documents have been submitted and are being reviewed by our admin team.
      </Text>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      <Text style={styles.waitingText}>Please wait for approval. You will be notified once your account is activated.</Text>
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
  waitingText: {
    color: colors.text.secondary,
    fontSize: fonts.size.md,
    marginTop: spacing.lg,
    textAlign: 'center',
    maxWidth: 320,
  },
});
