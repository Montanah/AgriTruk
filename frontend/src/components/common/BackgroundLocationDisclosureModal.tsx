import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  BackHandler,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../constants/colors';

interface BackgroundLocationDisclosureModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Prominent Disclosure Modal for Background Location Permission
 * 
 * This component meets Google Play Store's Prominent Disclosure and Consent Requirement
 * for apps that access BACKGROUND_LOCATION permission.
 * 
 * Requirements met:
 * - Shown BEFORE requesting background location permission
 * - Clear explanation of why background location is needed
 * - Explicit user consent required
 * - Prominent display (full-screen modal)
 */
const BackgroundLocationDisclosureModal: React.FC<BackgroundLocationDisclosureModalProps> = ({
  visible,
  onAccept,
  onDecline,
}) => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const navigation = useNavigation<any>();

  // Prevent dismissing modal with back button (Android)
  useEffect(() => {
    if (visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Prevent closing modal with back button - user must make a choice
        return true;
      });

      return () => backHandler.remove();
    }
  }, [visible]);

  const handlePrivacyPolicyPress = () => {
    // Navigate to privacy policy screen
    navigation.navigate('PrivacyPolicy');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={() => {
        // Prevent closing on Android back button - user must make a choice
        // This ensures compliance with Google Play requirements
      }}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={() => setHasScrolled(true)}
          scrollEventThrottle={16}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="map-marker-radius"
              size={64}
              color={colors.primary}
              style={styles.icon}
            />
            <Text style={styles.title}>Background Location Access</Text>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Why We Need Background Location</Text>
            <Text style={styles.description}>
              TRUKapp needs to access your location in the background to provide continuous
              real-time tracking of your vehicle while you're transporting goods. This allows:
            </Text>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={24}
                  color={colors.success}
                  style={styles.benefitIcon}
                />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Real-Time Tracking</Text>
                  <Text style={styles.benefitDescription}>
                    Clients can see your vehicle's location in real-time during active trips
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={24}
                  color={colors.success}
                  style={styles.benefitIcon}
                />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Accurate Delivery Updates</Text>
                  <Text style={styles.benefitDescription}>
                    Automatic location updates help provide accurate ETAs and delivery status
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={24}
                  color={colors.success}
                  style={styles.benefitIcon}
                />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Safety & Security</Text>
                  <Text style={styles.benefitDescription}>
                    Your location helps ensure safety and enables quick assistance if needed
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.importantNote}>
              <MaterialCommunityIcons
                name="information"
                size={24}
                color={colors.warning}
                style={styles.infoIcon}
              />
              <View style={styles.noteContent}>
                <Text style={styles.noteTitle}>Important Information</Text>
                <Text style={styles.noteText}>
                  • Location is only tracked when you're actively transporting goods{'\n'}
                  • You can stop tracking at any time from the app settings{'\n'}
                  • Your location data is encrypted and securely stored{'\n'}
                  • Location is only shared with clients for active bookings
                </Text>
              </View>
            </View>

            <View style={styles.dataUsage}>
              <Text style={styles.dataUsageTitle}>Data Usage</Text>
              <Text style={styles.dataUsageText}>
                Background location tracking uses minimal battery and data. Location updates
                are sent every 10 seconds or when you move 100 meters, whichever comes first.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.privacyNote}
              onPress={handlePrivacyPolicyPress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={20}
                color={colors.primary}
                style={styles.privacyIcon}
              />
              <Text style={styles.privacyNoteText}>
                For more information about how we collect, use, and protect your location data,
                please review our{' '}
                <Text style={styles.privacyLink}>Privacy Policy</Text>.
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={onDecline}
          >
            <Text style={styles.declineButtonText}>Not Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={onAccept}
          >
            <MaterialCommunityIcons
              name="check"
              size={20}
              color="#fff"
              style={styles.buttonIcon}
            />
            <Text style={styles.acceptButtonText}>Allow Background Location</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By tapping "Allow Background Location", you consent to TRUKapp accessing your
            location in the background as described above.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  benefitsList: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  benefitIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  importantNote: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  dataUsage: {
    backgroundColor: '#e7f3ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  dataUsageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  dataUsageText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  privacyNote: {
    flexDirection: 'row',
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  privacyIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  privacyLink: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 0,
  },
  footer: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default BackgroundLocationDisclosureModal;

