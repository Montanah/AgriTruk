import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

interface VerificationOptionsScreenProps {
  navigation: any;
  route: any;
}

const VerificationOptionsScreen: React.FC<VerificationOptionsScreenProps> = ({
  navigation,
  route,
}) => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleEmailVerification = () => {
    if (!userData?.email) {
      Alert.alert('Error', 'No email address found for this account.');
      return;
    }

    navigation.navigate('EmailVerification', {
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      userId: userData.uid,
    });
  };

  const handlePhoneVerification = () => {
    if (!userData?.phone) {
      Alert.alert('Error', 'No phone number found for this account.');
      return;
    }

    navigation.navigate('PhoneOTPScreen', {
      phone: userData.phone,
      role: userData.role,
      userId: userData.uid,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark, colors.secondary, colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, colors.secondary, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={48} color={colors.white} />
          </View>
          <Text style={styles.title}>Verify Your Account</Text>
          <Text style={styles.subtitle}>
            Choose how you'd like to verify your account
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleEmailVerification}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="mail" size={32} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Verify with Email</Text>
              <Text style={styles.optionDescription}>
                We'll send a verification code to your email address
              </Text>
              {userData?.email && (
                <Text style={styles.optionEmail}>{userData.email}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handlePhoneVerification}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="call" size={32} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Verify with Phone</Text>
              <Text style={styles.optionDescription}>
                We'll send a verification code to your phone number
              </Text>
              {userData?.phone && (
                <Text style={styles.optionPhone}>{userData.phone}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can verify both methods for added security
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: fonts.size.lg,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 36 : 48,
    left: 24,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fonts.size.xl + 4,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fonts.size.md,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  optionsContainer: {
    flex: 1,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  optionEmail: {
    fontSize: fonts.size.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  optionPhone: {
    fontSize: fonts.size.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: fonts.size.sm,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default VerificationOptionsScreen;

