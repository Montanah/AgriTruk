import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { fonts, spacing } from '../constants';
import colors from '../constants/colors';

export default function TransporterProcessingScreen({ route }) {
  // route.params?.transporterType can be 'individual' or 'company'
  const transporterType = route?.params?.transporterType || 'individual';
  const navigation = useNavigation();
  const [profilePhotoUrl, setProfilePhotoUrl] = React.useState(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [currentStatus, setCurrentStatus] = React.useState('pending'); // pending, under review, approved, rejected, etc.
  const [statusMessage, setStatusMessage] = React.useState('Your documents are under review. You will be notified once your account is activated.');

  // Helper to map status to step index
  const getStepIndex = (status) => {
    if (!status) return 0;
    if (status === 'approved') return 2;
    if (status === 'pending' || status === 'under review' || status === 'under_review') return 1;
    return 0;
  };

  // Helper to get user-friendly status message
  const getStatusMessage = (status) => {
    if (status === 'approved') return 'Your account has been approved! Redirecting to dashboard...';
    if (status === 'rejected') return 'Your documents were rejected. Please contact support or re-submit.';
    if (status === 'pending' || status === 'under review' || status === 'under_review') return 'Your documents are under review. You will be notified once your account is activated.';
    return 'Your profile status is being processed.';
  };

  // Fetch profile photo and status on mount
  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`https://agritruk-backend.onrender.com/api/transporters/profile/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.transporter && data.transporter.driverProfileImage) {
            setProfilePhotoUrl(data.transporter.driverProfileImage);
          }
          if (data.transporter && data.transporter.status) {
            setCurrentStatus(data.transporter.status);
            setStatusMessage(getStatusMessage(data.transporter.status));
            // If approved, navigate to dashboard after short delay
            if (data.transporter.status === 'approved') {
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'TransporterTabs', params: { transporterType: data.transporter.transporterType || transporterType } },
                  ],
                });
              }, 1200);
            }
          }
        }
      } catch (err) {
        // ignore
      }
      setLoadingProfile(false);
    };
    fetchProfile();
  }, []);

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
          {loadingProfile ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : profilePhotoUrl ? (
            <Image
              source={{ uri: profilePhotoUrl }}
              style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#eee' }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name={transporterType === 'company' ? 'business-outline' : 'person-circle-outline'} size={80} color={'#00FF6A'} />
          )}
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
        <View style={styles.progressStepperRow}>
          {steps.map((step, idx) => {
            const stepIndex = getStepIndex(currentStatus);
            const isCurrent = idx === stepIndex;
            const isCompleted = idx < stepIndex;
            return (
              <React.Fragment key={step.label}>
                <View style={[styles.progressStepCircle, isCurrent && styles.progressStepCircleActive, isCompleted && styles.progressStepCircleCompleted]}>
                  <LinearGradient
                    colors={isCurrent ? ['#00FF6A', '#00C853'] : isCompleted ? ['#00C853', '#00FF6A'] : ['#e0e0e0', '#f5f5f5']}
                    style={styles.progressStepGradient}
                  >
                    <Ionicons
                      name={step.icon}
                      size={26}
                      color={isCurrent || isCompleted ? '#fff' : colors.text.light}
                      style={{ alignSelf: 'center' }}
                    />
                  </LinearGradient>
                </View>
                {idx < steps.length - 1 && (
                  <View style={[styles.progressStepBar, isCompleted && styles.progressStepBarCompleted, isCurrent && styles.progressStepBarActive]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
        <View style={styles.progressStepperLabelsRow}>
          {steps.map((step, idx) => {
            const stepIndex = getStepIndex(currentStatus);
            const isCurrent = idx === stepIndex;
            return (
              <Text
                key={step.label}
                style={[styles.progressStepperLabel, isCurrent && styles.progressStepperLabelActive]}
              >
                {step.label}
              </Text>
            );
          })}
        </View>
        <Text style={styles.waitingText}>{statusMessage}</Text>
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
          onPress={async () => {
            try {
              // Get user ID from Firebase Auth
              const { getAuth } = require('firebase/auth');
              const auth = getAuth();
              const user = auth.currentUser;
              if (!user) {
                alert('Not authenticated');
                return;
              }
              // Determine endpoint based on transporterType
              const endpoint = transporterType === 'company'
                ? `https://agritruk-backend.onrender.com/api/companies/${user.uid}`
                : `https://agritruk-backend.onrender.com/api/transporters/profile/me`;
              // Get JWT token
              const token = await user.getIdToken();
              // Fetch status from backend with Authorization header
              const res = await fetch(endpoint, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              const data = await res.json();
              if (!res.ok) {
                setStatusMessage(data.message || 'Failed to fetch status');
                return;
              }
              // Update status and message
              let status = data.status || data.body?.status || (data.transporter && data.transporter.status) || 'unknown';
              setCurrentStatus(status);
              setStatusMessage(getStatusMessage(status));
              // If approved, navigate to dashboard
              if (status === 'approved') {
                setTimeout(() => {
                  navigation.reset({
                    index: 0,
                    routes: [
                      { name: 'TransporterTabs', params: { transporterType: (data.transporter && data.transporter.transporterType) || transporterType } },
                    ],
                  });
                }, 1200);
              }
            } catch (err) {
              setStatusMessage('Error refreshing status: ' + err.message);
            }
          }}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.refreshBtnText}>Refresh Status</Text>
        </Pressable>
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
  progressStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
    width: '100%',
    minHeight: 54,
  },
  progressStepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    marginHorizontal: 2,
  },
  progressStepCircleActive: {
    borderColor: '#00FF6A',
    backgroundColor: '#00FF6A22',
    elevation: 4,
    shadowOpacity: 0.18,
  },
  progressStepCircleCompleted: {
    borderColor: '#00C853',
    backgroundColor: '#00C85322',
  },
  progressStepGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepBar: {
    height: 6,
    width: 32,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginHorizontal: 2,
  },
  progressStepBarActive: {
    backgroundColor: '#00FF6A',
  },
  progressStepBarCompleted: {
    backgroundColor: '#00C853',
  },
  progressStepperLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  progressStepperLabel: {
    flex: 1,
    fontSize: fonts.size.sm,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  progressStepperLabelActive: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: fonts.size.md,
    textShadowColor: '#00FF6A44',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
