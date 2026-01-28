import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import { testAuthentication, testBackendWithoutAuth } from '../utils/testAuth';
import colors from '../constants/colors';
import fonts from '../constants/fonts';
import spacing from '../constants/spacing';

const AuthTestComponent: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setIsLoading(true);
    
    // Test backend connectivity first
    const backendResult = await testBackendWithoutAuth();
    setBackendStatus(backendResult.success ? '✅ Backend accessible' : '❌ Backend error');
    
    // Test authentication
    const authResult = await testAuthentication();
    setAuthStatus(authResult.success ? '✅ Authenticated' : '❌ Not authenticated');
    
    setIsLoading(false);
  };

  const handleTestAuth = async () => {
    const result = await testAuthentication();
    Alert.alert(
      'Authentication Test',
      result.success ? 'Authentication successful!' : `Authentication failed: ${result.error}`,
      [{ text: 'OK' }]
    );
  };

  const handleTestBackend = async () => {
    const result = await testBackendWithoutAuth();
    Alert.alert(
      'Backend Test',
      result.success ? 'Backend is accessible!' : `Backend error: ${result.error}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Debug Information</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Backend Status:</Text>
        <Text style={[styles.statusText, backendStatus.includes('✅') ? styles.success : styles.error]}>
          {backendStatus}
        </Text>
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Authentication Status:</Text>
        <Text style={[styles.statusText, authStatus.includes('✅') ? styles.success : styles.error]}>
          {authStatus}
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleTestBackend}>
          <Text style={styles.buttonText}>Test Backend</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleTestAuth}>
          <Text style={styles.buttonText}>Test Auth</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={runTests}>
          <Text style={styles.buttonText}>Refresh Tests</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <Text style={styles.loadingText}>Running tests...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    margin: spacing.md,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: fonts.size.lg,
    fontFamily: fonts.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.light + '20',
  },
  statusLabel: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
    color: colors.text.secondary,
  },
  statusText: {
    fontSize: fonts.size.md,
    fontFamily: fonts.family.medium,
  },
  success: {
    color: colors.success,
  },
  error: {
    color: colors.error,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  buttonText: {
    color: colors.white,
    fontSize: fonts.size.sm,
    fontFamily: fonts.family.medium,
    textAlign: 'center',
  },
  loadingText: {
    textAlig,
    n: 'center',
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
});

export default AuthTestComponent;
