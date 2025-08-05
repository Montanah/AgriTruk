import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
const BusinessProfileScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Business Profile</Text>
      <Text style={styles.subtitle}>Edit your business logo, name, and contact details here. (UI coming soon)</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f9fc',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a7f5a',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 8,
  },
});
export default BusinessProfileScreen;
