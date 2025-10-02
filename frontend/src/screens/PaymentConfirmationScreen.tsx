import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

interface PaymentConfirmationScreenProps {
  navigation: any;
  route: {
    params: {
      userType: 'broker' | 'transporter';
      subscriptionType: 'trial' | 'renewal' | 'upgrade';
      trialDuration?: number;
      expiredDate?: string;
      amount?: number;
      planName?: string;
    };
  };
}

const PaymentConfirmationScreen: React.FC<PaymentConfirmationScreenProps> = ({ navigation, route }) => {
  const params = route?.params || {};
  const { 
    userType = 'broker', 
    subscriptionType = 'trial', 
    trialDuration = 30, 
    expiredDate = null, 
    amount = 0, 
    planName = 'Trial Plan' 
  } = params;
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Auto-process payment confirmation after a short delay
    const timer = setTimeout(() => {
      handleConfirmPayment();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Safety check to ensure all required values are defined
  if (!userType || !subscriptionType || typeof userType !== 'string' || typeof subscriptionType !== 'string') {
    console.warn('PaymentConfirmationScreen: Missing or invalid required params', { userType, subscriptionType, params });
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusCard}>
          <Text style={styles.title}>Loading...</Text>
          <Text style={styles.description}>Please wait while we load your information.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleConfirmPayment = async () => {
    setProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setConfirmed(true);
      
      // Send payment confirmation notification
      try {
        const { NotificationHelper } = require('../services/notificationHelper');
        const { getAuth } = require('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          await NotificationHelper.sendPaymentNotification('received', {
            userId: user.uid,
            role: userType,
            amount,
            subscriptionType,
            planName
          });
        }
      } catch (notificationError) {
        console.warn('Failed to send payment confirmation notification:', notificationError);
      }
      
      // Show success message
      Alert.alert(
        'Payment Confirmed! 🎉',
        getSuccessMessage(),
        [
          {
            text: 'Continue to Dashboard',
            onPress: () => {
              if (userType === 'broker') {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'BrokerTabs' }]
                });
              } else if (userType === 'transporter') {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TransporterTabs' }]
                });
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Payment confirmation error:', error);
      Alert.alert('Error', 'Payment confirmation failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getSuccessMessage = () => {
    if (subscriptionType === 'trial') {
      return `Your ${trialDuration || 30}-day free trial has been activated! You can now access all premium features.`;
    } else if (subscriptionType === 'renewal') {
      return 'Your subscription has been renewed successfully! You can continue using all premium features.';
    } else if (subscriptionType === 'upgrade') {
      return `Your subscription has been upgraded to ${planName || 'Premium'}! Enjoy your new features.`;
    }
    return 'Payment confirmed successfully!';
  };

  const getTitle = () => {
    if (subscriptionType === 'trial') {
      return 'Trial Activation';
    } else if (subscriptionType === 'renewal') {
      return 'Subscription Renewal';
    } else if (subscriptionType === 'upgrade') {
      return 'Subscription Upgrade';
    }
    return 'Payment Confirmation';
  };

  const getDescription = () => {
    if (subscriptionType === 'trial') {
      return `Activating your ${trialDuration || 30}-day free trial...`;
    } else if (subscriptionType === 'renewal') {
      return 'Renewing your subscription...';
    } else if (subscriptionType === 'upgrade') {
      return 'Upgrading your subscription...';
    }
    return 'Processing your payment...';
  };

  const getIcon = () => {
    if (subscriptionType === 'trial') {
      return 'rocket-launch';
    } else if (subscriptionType === 'renewal') {
      return 'refresh';
    } else if (subscriptionType === 'upgrade') {
      return 'trending-up';
    }
    return 'credit-card';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {getTitle()}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={confirmed ? 'check-circle' : getIcon()}
              size={80}
              color={confirmed ? colors.success : colors.primary}
            />
          </View>
          
          <Text style={styles.title}>
            {confirmed ? 'Payment Confirmed!' : getTitle()}
          </Text>
          
          <Text style={styles.description}>
            {confirmed ? getSuccessMessage() : getDescription()}
          </Text>

          {processing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>
                {subscriptionType === 'trial' ? 'Activating trial...' : subscriptionType ? 'Processing payment...' : 'Processing...'}
              </Text>
            </View>
          )}

          {confirmed && (
            <View style={styles.successContainer}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={styles.successText}>
                {subscriptionType === 'trial' ? 'Trial activated successfully!' : subscriptionType ? 'Payment processed successfully!' : 'Processed successfully!'}
              </Text>
            </View>
          )}
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Transaction Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>User Type:</Text>
            <Text style={styles.detailValue}>{userType && typeof userType === 'string' ? userType.charAt(0).toUpperCase() + userType.slice(1) : 'Unknown'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subscription Type:</Text>
            <Text style={styles.detailValue}>
              {subscriptionType === 'trial' ? 'Free Trial' : 
               subscriptionType === 'renewal' ? 'Renewal' : 
               subscriptionType === 'upgrade' ? 'Upgrade' : 
               (subscriptionType && typeof subscriptionType === 'string') ? 'Subscription' : 'Unknown'}
            </Text>
          </View>
          
          {trialDuration && typeof trialDuration === 'number' && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Trial Duration:</Text>
              <Text style={styles.detailValue}>{trialDuration} days</Text>
            </View>
          )}
          
          {expiredDate && typeof expiredDate === 'string' && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Previous Expiry:</Text>
              <Text style={styles.detailValue}>
                {new Date(expiredDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          
          {amount && typeof amount === 'number' && amount > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>${amount}</Text>
            </View>
          )}
        </View>

        {/* Features Card */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>What's Next?</Text>
          
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.featureText}>
              {subscriptionType === 'trial' ? 'Access to all premium features' : subscriptionType ? 'Full access to all features' : 'Access to all features'}
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.featureText}>
              {userType === 'broker' ? 'Client management tools' : userType === 'transporter' ? 'Job management tools' : 'Management tools'}
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.featureText}>
              Real-time tracking and notifications
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.featureText}>
              Priority customer support
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Button */}
      {confirmed && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              if (userType === 'broker') {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'BrokerTabs' }]
                });
              } else if (userType === 'transporter') {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TransporterTabs' }]
                });
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }]
                });
              }
            }}
          >
            <Text style={styles.continueButtonText}>
              Continue to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    marginVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fonts.size.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  processingContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  processingText: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '10',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  successText: {
    fontSize: fonts.size.md,
    color: colors.success,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  detailLabel: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    fontWeight: '600',
  },
  featuresCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuresTitle: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: fonts.size.md,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  actionContainer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.text.light + '20',
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: 'bold',
  },
});

export default PaymentConfirmationScreen;





