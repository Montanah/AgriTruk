import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';

interface VehicleDisplayCardProps {
  vehicle: {
    id?: string;
    make?: string;
    model?: string;
    vehicleRegistration?: string;
    registration?: string;
    type?: string;
    capacity?: number;
    year?: number;
    color?: string;
    bodyType?: string;
    driveType?: string;
    vehicleImagesUrl?: string[];
    photos?: string[];
    insuranceUrl?: string;
    status?: string;
  };
  showImages?: boolean;
  compact?: boolean;
}

const VehicleDisplayCard: React.FC<VehicleDisplayCardProps> = ({
  vehicle,
  showImages = true,
  compact = false,
}) => {
  if (!vehicle || (!vehicle.make && !vehicle.vehicleRegistration && !vehicle.registration)) {
    return null;
  }

  const vehicleImage = vehicle.vehicleImagesUrl?.[0] || vehicle.photos?.[0];
  const registration = vehicle.vehicleRegistration || vehicle.registration;
  const make = vehicle.make || '';
  const model = vehicle.model || '';
  const type = vehicle.type || '';
  const capacity = vehicle.capacity || 0;
  const year = vehicle.year;
  const color = vehicle.color || '';
  const bodyType = vehicle.bodyType || '';
  const driveType = vehicle.driveType || '';

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {showImages && vehicleImage && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: vehicleImage }} style={styles.vehicleImage} />
          {vehicle.vehicleImagesUrl && vehicle.vehicleImagesUrl.length > 1 && (
            <View style={styles.imageCountBadge}>
              <MaterialCommunityIcons name="camera" size={12} color={colors.white} />
              <Text style={styles.imageCountText}>{vehicle.vehicleImagesUrl.length}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.primaryInfo}>
            <Text style={styles.vehicleMake}>
              {make} {model || type}
            </Text>
            {year && (
              <Text style={styles.vehicleYear}>{year}</Text>
            )}
          </View>
          {registration && (
            <View style={styles.registrationBadge}>
              <MaterialCommunityIcons name="identifier" size={16} color={colors.primary} />
              <Text style={styles.registrationText}>{registration}</Text>
            </View>
          )}
        </View>

        {!compact && (
          <View style={styles.detailsGrid}>
            {capacity > 0 && (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="weight-kilogram" size={18} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Capacity</Text>
                <Text style={styles.detailValue}>
                  {(() => {
                    // Capacity is already in tons from backend
                    const cap = typeof capacity === 'number' ? capacity : parseFloat(String(capacity)) || 0;
                    return `${cap.toFixed(2)} tons`;
                  })()}
                </Text>
              </View>
            )}

            {bodyType && (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="cube-outline" size={18} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Body</Text>
                <Text style={styles.detailValue}>{bodyType}</Text>
              </View>
            )}

            {driveType && (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="car-shift-pattern" size={18} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Drive</Text>
                <Text style={styles.detailValue}>{driveType}</Text>
              </View>
            )}

            {color && (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="palette" size={18} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Color</Text>
                <Text style={styles.detailValue}>{color}</Text>
              </View>
            )}
          </View>
        )}

        {registration && compact && (
          <View style={styles.compactDetails}>
            <MaterialCommunityIcons name="identifier" size={14} color={colors.text.secondary} />
            <Text style={styles.compactRegistration}>{registration}</Text>
            {capacity > 0 && (
              <>
                <Text style={styles.compactSeparator}>•</Text>
                <Text style={styles.compactCapacity}>
                  {(() => {
                    // Capacity is already in tons from backend
                    const cap = typeof capacity === 'number' ? capacity : parseFloat(String(capacity)) || 0;
                    return `${cap.toFixed(2)} tons`;
                  })()}
                </Text>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  compactContainer: {
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  imageContainer: {
    marginBottom: spacing.md,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  vehicleImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
    backgroundColor: colors.background,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.black + '80',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: fonts.family.medium,
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  primaryInfo: {
    flex: 1,
  },
  vehicleMake: {
    fontSize: 18,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  vehicleYear: {
    fontSize: 14,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  registrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  registrationText: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginTop: 2,
  },
  compactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  compactRegistration: {
    fontSize: 13,
    fontFamily: fonts.family.bold,
    color: colors.primary,
    marginLeft: 4,
  },
  compactSeparator: {
    fontSize: 12,
    color: colors.text.secondary,
    marginHorizontal: spacing.xs,
  },
  compactCapacity: {
    fontSize: 13,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
});

export default VehicleDisplayCard;

