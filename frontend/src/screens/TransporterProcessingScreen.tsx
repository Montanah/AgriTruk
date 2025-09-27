import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { fonts, spacing } from '../constants';
import colors from '../constants/colors';
import { API_ENDPOINTS } from '../constants/api';
import subscriptionService from '../services/subscriptionService';

export default function TransporterProcessingScreen({ route }) {
  // route.params?.transporterType can be 'individual' or 'company'
  const transporterType = route?.params?.transporterType || 'individual';
  const navigation = useNavigation();
  const [profilePhotoUrl, setProfilePhotoUrl] = React.useState(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [currentStatus, setCurrentStatus] = React.useState('pending'); // pending, under review, approved, rejected, etc.
  const [statusMessage, setStatusMessage] = React.useState('Your documents are under review. You will be notified once your account is activated.');
  const [subscriptionStatus, setSubscriptionStatus] = React.useState(null);
  const [checkingSubscription, setCheckingSubscription] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

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

  // Check subscription status
  const checkSubscriptionStatus = async () => {
    try {
      setCheckingSubscription(true);
      const status = await subscriptionService.getSubscriptionStatus();
      setSubscriptionStatus(status);
      
      console.log('Transporter subscription status:', status);
      
      // If user needs trial activation, redirect to trial screen
      if (status.needsTrialActivation || 
          !status || 
          (!status.hasActiveSubscription && !status.isTrialActive && status.subscriptionStatus === 'none')) {
        console.log('Transporter needs trial activation, redirecting to trial screen');
        navigation.reset({
          index: 0,
          routes: [{
            name: 'SubscriptionTrialScreen',
            params: {
              userType: transporterType,
              subscriptionStatus: status
            }
          }]
        });
        return;
      }
      
      // If subscription has expired, redirect to expiry screen
      if (status.subscriptionStatus === 'expired' || status.trialUsed) {
        console.log('Transporter subscription expired, redirecting to expired screen');
        navigation.reset({
          index: 0,
          routes: [{
            name: 'SubscriptionExpiredScreen',
            params: {
              userType: transporterType,
              userId: 'current_user', // Will be replaced with actual user ID
              expiredDate: new Date().toISOString()
            }
          }]
        });
        return;
      }
      
      // If trial is active but expiring soon (less than 3 days), show warning
      if (status.isTrialActive && status.daysRemaining <= 3) {
        console.log(`Trial expiring in ${status.daysRemaining} days`);
        // You could show a warning modal here
      }
      
      console.log('Transporter has active subscription, proceeding to dashboard');
      
    } catch (error) {
      console.error('Error checking subscription status:', error);
      // On error, assume user needs trial activation
      navigation.reset({
        index: 0,
        routes: [{
          name: 'SubscriptionTrialScreen',
          params: {
            userType: transporterType,
            subscriptionStatus: { needsTrialActivation: true }
          }
        }]
      });
    } finally {
      setCheckingSubscription(false);
    }
  };

  // Fetch profile photo and status on mount
  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          setStatusMessage('Not authenticated. Please sign in again.');
          setLoadingProfile(false);
          return;
        }
        
        const token = await user.getIdToken();
        
        // Determine endpoint based on transporterType
        const endpoint = transporterType === 'company'
          ? `${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`
          : `${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`;
        
        console.log('Initial fetch from:', endpoint);
        
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
          const res = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (res.ok) {
            const data = await res.json();
            console.log('Initial fetch response:', data);
            
            if (transporterType === 'company') {
              // Handle companies array response
              if (Array.isArray(data) && data.length > 0) {
                const company = data[0]; // Get the first (and should be only) company
                console.log('Company data:', company);
                
                if (company.companyLogo) {
                  setProfilePhotoUrl(company.companyLogo);
                }
                if (company.status) {
                  setCurrentStatus(company.status);
                  setStatusMessage(getStatusMessage(company.status));
                  // If approved, check subscription status before navigating
                  if (company.status === 'approved') {
                    // Check subscription status first
                    await checkSubscriptionStatus();
                    
                    // The navigation will be handled in checkSubscriptionStatus
                    // If no subscription issues, navigate to dashboard
                    setTimeout(() => {
                      navigation.reset({
                        index: 0,
                        routes: [
                          { name: 'TransporterTabs', params: { transporterType: 'company' } },
                        ],
                      });
                    }, 1200);
                  }
                }
              } else {
                console.log('No companies found for transporter');
                setStatusMessage('No company profile found. Please complete your company profile first.');
              }
            } else {
              // Handle individual transporter response
              if (data.transporter && data.transporter.driverProfileImage) {
                setProfilePhotoUrl(data.transporter.driverProfileImage);
              }
              if (data.transporter && data.transporter.status) {
                setCurrentStatus(data.transporter.status);
                setStatusMessage(getStatusMessage(data.transporter.status));
                // If approved, check subscription status before navigating
                if (data.transporter.status === 'approved') {
                  // Check subscription status first
                  await checkSubscriptionStatus();
                  
                  // The navigation will be handled in checkSubscriptionStatus
                  // If no subscription issues, navigate to dashboard
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
          } else {
            const errorText = await res.text();
            console.error('Initial fetch error:', res.status, errorText);
            setStatusMessage(`Failed to load status: ${res.status} - ${errorText}`);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            setStatusMessage('Request timed out. Please check your internet connection and try refreshing.');
          } else {
            throw fetchError;
          }
        }
      } catch (err) {
        console.error('Initial fetch error:', err);
        if (err.message.includes('Network request failed')) {
          setStatusMessage('Network error: Please check your internet connection and try refreshing.');
        } else if (err.message.includes('timeout')) {
          setStatusMessage('Request timed out. Please try refreshing.');
        } else {
          setStatusMessage('Error loading status: ' + err.message);
        }
      }
      setLoadingProfile(false);
    };
    fetchProfile();
  }, [transporterType]);

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
        
        {checkingSubscription && (
          <View style={styles.subscriptionCheckContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.subscriptionCheckText}>Checking subscription status...</Text>
          </View>
        )}
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
            isRetrying && { opacity: 0.6 },
          ]}
          disabled={isRetrying}
          onPress={async () => {
            if (isRetrying) return;
            
            try {
              setIsRetrying(true);
              setRetryCount(prev => prev + 1);
              setStatusMessage('Refreshing status...');
              
              // Get user ID from Firebase Auth
              const { getAuth } = require('firebase/auth');
              const auth = getAuth();
              const user = auth.currentUser;
              if (!user) {
                setStatusMessage('Not authenticated. Please sign in again.');
                return;
              }

              // Determine endpoint based on transporterType
              const endpoint = transporterType === 'company'
                ? `${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`
                : `${API_ENDPOINTS.TRANSPORTERS}/${user.uid}`;
              
              console.log('Fetching status from:', endpoint);
              
              // Get JWT token
              const token = await user.getIdToken();
              
              // Add timeout to the fetch request
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
              
              try {
                // Fetch status from backend with Authorization header
                const res = await fetch(endpoint, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  signal: controller.signal,
                });
                
                clearTimeout(timeoutId);
                
                if (!res.ok) {
                  const errorText = await res.text();
                  console.error('Status fetch error:', res.status, errorText);
                  setStatusMessage(`Failed to fetch status: ${res.status} - ${errorText}`);
                  return;
                }
                
                const data = await res.json();
                console.log('Status fetch response:', data);
                
                // Update status and message based on transporter type
                let status = 'unknown';
                if (transporterType === 'company') {
                  // Handle companies array response
                  if (Array.isArray(data) && data.length > 0) {
                    const company = data[0]; // Get the first (and should be only) company
                    status = company.status || 'unknown';
                    console.log('Company status:', status);
                    
                    // Update profile photo if available
                    if (company.companyLogo) {
                      setProfilePhotoUrl(company.companyLogo);
                    }
                  } else {
                    console.log('No companies found for transporter');
                    setStatusMessage('No company profile found. Please complete your company profile first.');
                    return;
                  }
                } else {
                  // Handle individual transporter response
                  status = data.status || data.body?.status || (data.transporter && data.transporter.status) || 'unknown';
                  console.log('Transporter status:', status);
                }
                
                setCurrentStatus(status);
                setStatusMessage(getStatusMessage(status));
                
                // Reset retry count on success
                setRetryCount(0);
                
                // If approved, check subscription status before navigating
                if (status === 'approved') {
                  // Check subscription status and let it handle navigation
                  await checkSubscriptionStatus();
                  
                  // Only navigate to dashboard if subscription check didn't redirect elsewhere
                  // The checkSubscriptionStatus function will handle navigation to trial/expired screens
                  // If it returns without redirecting, then user has active subscription
                  setTimeout(() => {
                    // Double-check that we're still on this screen (not redirected by subscription check)
                    if (navigation.getState().routes[navigation.getState().index].name === 'TransporterProcessingScreen') {
                      navigation.reset({
                        index: 0,
                        routes: [
                          { name: 'TransporterTabs', params: { transporterType: (data.transporter && data.transporter.transporterType) || transporterType } },
                        ],
                      });
                    }
                  }, 2000); // Increased timeout to allow subscription check to complete
                }
              } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                  setStatusMessage('Request timed out. Please check your internet connection and try again.');
                } else {
                  throw fetchError;
                }
              }
            } catch (err) {
              console.error('Refresh status error:', err);
              if (err.message.includes('Network request failed')) {
                setStatusMessage(`Network error: Please check your internet connection and try again. (Attempt ${retryCount + 1})`);
              } else if (err.message.includes('timeout')) {
                setStatusMessage(`Request timed out. Please try again. (Attempt ${retryCount + 1})`);
              } else {
                setStatusMessage(`Error refreshing status: ${err.message} (Attempt ${retryCount + 1})`);
              }
            } finally {
              setIsRetrying(false);
            }
          }}
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
          ) : (
            <Ionicons name="refresh" size={20} color={colors.primary} style={{ marginRight: 6 }} />
          )}
          <Text style={styles.refreshBtnText}>
            {isRetrying ? 'Refreshing...' : 'Refresh Status'}
          </Text>
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
  subscriptionCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
  },
  subscriptionCheckText: {
    color: colors.primary,
    fontSize: fonts.size.sm,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
});
