import { theme } from '@/constants';
import { Transporter } from '@/types';
import React, { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  transporter: Transporter;
};

const TransporterProfile: FC<Props> = ({ transporter }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{transporter.name}</Text>
      <Text style={styles.details}>
        Vehicle: {transporter.vehicleType}{transporter.bodyType ? ` (${transporter.bodyType})` : ''} • {transporter.plateNumber}
      </Text>
      <Text style={styles.details}>Phone: {transporter.phone}</Text>
      <Text style={styles.subscription}>
        Subscription: {transporter.subscriptionActive ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );
};

export default TransporterProfile;

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.text,
  },
  details: {
    fontSize: 14,
    color: theme.colors.mutedText,
    marginBottom: 2,
  },
  subscription: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});
