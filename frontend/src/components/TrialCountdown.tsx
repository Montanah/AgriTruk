import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

interface TrialCountdownProps {
  trialExpiryDate: string;
  onUpgrade?: () => void;
}

const TrialCountdown: React.FC<TrialCountdownProps> = ({ trialExpiryDate, onUpgrade }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(trialExpiryDate).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [trialExpiryDate]);

  const isExpiringSoon = timeLeft.days <= 3;

  return (
    <View style={[styles.container, isExpiringSoon && styles.expiringSoon]}>
      <Text style={[styles.title, isExpiringSoon && styles.expiringText]}>
        {timeLeft.days > 0 ? 'Trial Remaining' : 'Trial Expired'}
      </Text>
      
      {timeLeft.days > 0 ? (
        <View style={styles.timeContainer}>
          <View style={styles.timeUnit}>
            <Text style={[styles.timeValue, isExpiringSoon && styles.expiringText]}>
              {timeLeft.days}
            </Text>
            <Text style={[styles.timeLabel, isExpiringSoon && styles.expiringText]}>
              Days
            </Text>
          </View>
          <View style={styles.timeUnit}>
            <Text style={[styles.timeValue, isExpiringSoon && styles.expiringText]}>
              {timeLeft.hours}
            </Text>
            <Text style={[styles.timeLabel, isExpiringSoon && styles.expiringText]}>
              Hours
            </Text>
          </View>
          <View style={styles.timeUnit}>
            <Text style={[styles.timeValue, isExpiringSoon && styles.expiringText]}>
              {timeLeft.minutes}
            </Text>
            <Text style={[styles.timeLabel, isExpiringSoon && styles.expiringText]}>
              Minutes
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.expiredText, isExpiringSoon && styles.expiringText]}>
          Your trial has expired. Please upgrade to continue.
        </Text>
      )}

      {isExpiringSoon && onUpgrade && (
        <Text style={styles.upgradeText}>
          Upgrade now to continue using premium features!
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    marginVertical: spacing.sm,
    alignItems: 'center',
  },
  expiringSoon: {
    backgroundColor: '#FF6B6B',
  },
  title: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  expiringText: {
    color: colors.white,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  timeUnit: {
    alignItems: 'center',
  },
  timeValue: {
    fontSize: fonts.size.xl + 4,
    fontWeight: 'bold',
    color: colors.white,
  },
  timeLabel: {
    fontSize: fonts.size.sm,
    color: colors.white,
    marginTop: 2,
  },
  expiredText: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  upgradeText: {
    fontSize: fonts.size.sm,
    color: colors.white,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default TrialCountdown;