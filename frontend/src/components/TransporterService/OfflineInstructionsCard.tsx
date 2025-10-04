import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

interface OfflineInstructionsCardProps {
  onToggleAccepting: () => void;
  isFirstTime?: boolean;
}

const OfflineInstructionsCard: React.FC<OfflineInstructionsCardProps> = ({
  onToggleAccepting,
  isFirstTime = false
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons 
          name="wifi-off" 
          size={24} 
          color={colors.warning} 
        />
        <Text style={styles.title}>
          {isFirstTime ? 'Welcome! You\'re Currently Offline' : 'You\'re Currently Offline'}
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          {isFirstTime 
            ? 'To start receiving job requests and earning money, you need to go online by turning on the "Accepting New Requests" toggle.'
            : 'You\'re not currently accepting new booking requests. Turn on the toggle below to start receiving jobs.'
          }
        </Text>
        
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to go online:</Text>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Go to your Profile tab</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Find "Accepting New Requests" toggle</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Turn it ON to start receiving jobs</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={onToggleAccepting}
        >
          <MaterialCommunityIcons name="wifi" size={20} color={colors.white} />
          <Text style={styles.actionButtonText}>Go to Profile Settings</Text>
        </TouchableOpacity>
      </View>
      
      {isFirstTime && (
        <View style={styles.tipContainer}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color={colors.primary} />
          <Text style={styles.tipText}>
            <Text style={styles.tipBold}>Pro Tip:</Text> You can toggle this on/off anytime to control when you want to receive job requests.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fonts.size.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  content: {
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fonts.size.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  instructions: {
    backgroundColor: colors.background.light,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  instructionTitle: {
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepNumberText: {
    fontSize: fonts.size.sm,
    fontWeight: 'bold',
    color: colors.white,
  },
  stepText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  actionButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  tipText: {
    fontSize: fonts.size.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    flex: 1,
    lineHeight: 18,
  },
  tipBold: {
    fontWeight: 'bold',
    color: colors.primary,
  },
});

export default OfflineInstructionsCard;
