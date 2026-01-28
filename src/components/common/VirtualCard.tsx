import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../constants/colors';
import { fonts, spacing } from '../../constants';
import { detectCardType, formatCardNumber, validateCardNumber } from '../../utils/cardValidation';

interface VirtualCardProps {
  cardNumber: string;
  expiryDate: string;
  cardholderName: string;
  cvv: string;
  isFlipped?: boolean;
  onFlip?: () => void;
  style?: any;
}

const VirtualCard: React.FC<VirtualCardProps> = ({
  cardNumber,
  expiryDate,
  cardholderName,
  cvv,
  isFlipped = false,
  onFlip,
  style,
}) => {
  const [cardType, setCardType] = useState<any>(null);
  const [isValid, setIsValid] = useState(false);
  const [formattedNumber, setFormattedNumber] = useState('');

  const flipAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Detect card type and validate
    const detectedType = detectCardType(cardNumber);
    const validation = validateCardNumber(cardNumber);
    
    setCardType(detectedType);
    setIsValid(validation.isValid);
    setFormattedNumber(validation.formattedNumber);

    // Animate card type detection
    if (detectedType) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow animation for valid cards
      if (validation.isValid) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: false,
            }),
          ])
        ).start();
      }
    }
  }, [cardNumber]);

  useEffect(() => {
    // Handle flip animation
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 1 : 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [isFlipped]);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const getCardGradient = () => {
    if (!cardType) return ['#1a1a1a', '#2d2d2d'];
    
    switch (cardType.name) {
      // Major International Cards
      case 'Visa':
        return ['#1A1F71', '#2A2F8A'];
      case 'Mastercard':
        return ['#EB001B', '#F79E1B'];
      case 'American Express':
        return ['#006FCF', '#00A8E8'];
      case 'Discover':
        return ['#FF6000', '#FF8C00'];
      
      // International Cards
      case 'JCB':
        return ['#007B49', '#00A86B'];
      case 'Diners Club':
        return ['#0079BE', '#0099CC'];
      case 'UnionPay':
        return ['#E21836', '#FF3366'];
      
      // European Cards
      case 'Maestro':
        return ['#009639', '#00B84A'];
      case 'Dankort':
        return ['#0066CC', '#0088FF'];
      case 'Carte Bancaire':
        return ['#003399', '#0055CC'];
      
      // Asian Cards
      case 'BC Card':
        return ['#FF6600', '#FF8833'];
      
      // Regional Cards
      case 'RuPay':
        return ['#FF6B35', '#FF8A5B'];
      case 'Elo':
        return ['#00A651', '#00C76B'];
      case 'Hipercard':
        return ['#FF6600', '#FF8833'];
      
      // Corporate Cards
      case 'Corporate Visa':
        return ['#1A1F71', '#2A2F8A'];
      case 'Corporate Mastercard':
        return ['#EB001B', '#F79E1B'];
      
      // Debit Cards
      case 'Visa Debit':
        return ['#1A1F71', '#2A2F8A'];
      case 'Mastercard Debit':
        return ['#EB001B', '#F79E1B'];
      
      // Prepaid Cards
      case 'Visa Prepaid':
        return ['#1A1F71', '#2A2F8A'];
      case 'Mastercard Prepaid':
        return ['#EB001B', '#F79E1B'];
      
      // Store Cards
      case 'Store Card':
        return ['#666666', '#888888'];
      
      default:
        return ['#1a1a1a', '#2d2d2d'];
    }
  };

  const getCardIcon = () => {
    if (!cardType) return 'credit-card';
    return cardType.icon;
  };

  const renderCardFront = () => (
    <Animated.View
      style={[
        styles.cardFace,
        {
          transform: [
            { rotateY: frontInterpolate },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={getCardGradient()}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Card Type Badge */}
        {cardType && (
          <Animated.View
            style={[
              styles.cardTypeBadge,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ]}
          >
            <MaterialCommunityIcons
              name={getCardIcon() as any}
              size={24}
              color={colors.white}
            />
            <Text style={styles.cardTypeText}>{cardType.name}</Text>
          </Animated.View>
        )}

        {/* Card Number */}
        <View style={styles.cardNumberContainer}>
          <Text style={styles.cardNumber}>
            {formattedNumber || '•••• •••• •••• ••••'}
          </Text>
          {isValid && (
            <Animated.View
              style={[
                styles.validIndicator,
                {
                  opacity: glowAnim,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={16}
                color={colors.success}
              />
            </Animated.View>
          )}
        </View>

        {/* Cardholder Name and Expiry */}
        <View style={styles.cardDetails}>
          <View style={styles.cardholderContainer}>
            <Text style={styles.cardholderLabel}>CARDHOLDER</Text>
            <Text style={styles.cardholderName}>
              {cardholderName || 'YOUR NAME'}
            </Text>
          </View>
          <View style={styles.expiryContainer}>
            <Text style={styles.expiryLabel}>EXPIRES</Text>
            <Text style={styles.expiryDate}>
              {expiryDate || 'MM/YY'}
            </Text>
          </View>
        </View>

        {/* Chip */}
        <View style={styles.chip}>
          <View style={styles.chipInner} />
        </View>

        {/* Flip Button */}
        {onFlip && (
          <TouchableOpacity
            style={styles.flipButton}
            onPress={onFlip}
          >
            <MaterialCommunityIcons
              name="flip-horizontal"
              size={16}
              color={colors.white}
            />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );

  const renderCardBack = () => (
    <Animated.View
      style={[
        styles.cardFace,
        {
          transform: [
            { rotateY: backInterpolate },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={getCardGradient()}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Magnetic Strip */}
        <View style={styles.magneticStrip} />

        {/* CVV Section */}
        <View style={styles.cvvSection}>
          <View style={styles.cvvStrip} />
          <View style={styles.cvvContainer}>
            <Text style={styles.cvvLabel}>CVV</Text>
            <Text style={styles.cvvNumber}>
              {cvv || '•••'}
            </Text>
          </View>
        </View>

        {/* Card Type on Back */}
        {cardType && (
          <View style={styles.backCardType}>
            <MaterialCommunityIcons
              name={getCardIcon() as any}
              size={20}
              color={colors.white}
            />
            <Text style={styles.backCardTypeText}>{cardType.name}</Text>
          </View>
        )}

        {/* Flip Button */}
        {onFlip && (
          <TouchableOpacity
            style={styles.flipButton}
            onPress={onFlip}
          >
            <MaterialCommunityIcons
              name="flip-horizontal"
              size={16}
              color={colors.white}
            />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.cardContainer}>
        {renderCardFront()}
        {renderCardBack()}
      </View>
      
      {/* Card Status Indicator */}
      <View style={styles.statusContainer}>
        {cardType && (
          <View style={styles.statusItem}>
            <MaterialCommunityIcons
              name={isValid ? "check-circle" : "alert-circle"}
              size={16}
              color={isValid ? colors.success : colors.warning}
            />
            <Text style={[
              styles.statusText,
              { color: isValid ? colors.success : colors.warning }
            ]}>
              {isValid ? 'Valid Card' : 'Invalid Card'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const cardWidth = width * 0.85;
const cardHeight = cardWidth * 0.63; // Standard credit card ratio

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  cardContainer: {
    width: cardWidth,
    height: cardHeight,
    position: 'relative',
  },
  cardFace: {
    position: 'absolute',
    width: cardWidth,
    height: cardHeight,
    borderRadius: 16,
    backfaceVisibility: 'hidden',
  },
  cardGradient: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.lg,
    justifyContent: 'space-between',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  cardTypeBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  cardTypeText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  cardNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  cardNumber: {
    color: colors.white,
    fontSize: fonts.size.xl,
    fontFamily: 'monospace',
    letterSpacing: 2,
    fontWeight: '500',
  },
  validIndicator: {
    marginLeft: spacing.sm,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.lg,
  },
  cardholderContainer: {
    flex: 1,
  },
  cardholderLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: fonts.size.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
  cardholderName: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  expiryContainer: {
    alignItems: 'flex-end',
  },
  expiryLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: fonts.size.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
  expiryDate: {
    color: colors.white,
    fontSize: fonts.size.md,
    fontWeight: '600',
    marginTop: spacing.xs,
    fontFamily: 'monospace',
  },
  chip: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    width: 32,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipInner: {
    width: 24,
    height: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
  },
  magneticStrip: {
    position: 'absolute',
    top: spacing.lg,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: colors.black,
  },
  cvvSection: {
    position: 'absolute',
    top: spacing.xl + 32,
    right: spacing.lg,
    left: spacing.lg,
    height: 24,
    backgroundColor: colors.white,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  cvvStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.black,
  },
  cvvContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cvvLabel: {
    color: colors.black,
    fontSize: fonts.size.xs,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  cvvNumber: {
    color: colors.black,
    fontSize: fonts.size.sm,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  backCardType: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backCardTypeText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  flipButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: spacing.xs,
    fontSize: fonts.size.sm,
    fontWeight: '600',
  },
});

export default VirtualCard;
