import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getAuth } from 'firebase/auth';

const SimpleAuthDebug: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        setAuthStatus(`✅ Authenticated: ${user.email || user.uid}`);
      } else {
        setAuthStatus('❌ Not authenticated');
      }
    } catch (error) {
      setAuthStatus('❌ Auth error');
      console.error('Auth check error:', error);
    }
    setIsLoading(false);
  };

  const handleTestAuth = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        const token = await user.getIdToken(true);
        Alert.alert(
          'Authentication Test',
          `✅ Authenticated!\nEmail: ${user.email}\nUID: ${user.uid}\nToken: ${token.substring(0, 30)}...`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Authentication Test',
          '❌ Not authenticated. Please log in first.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Authentication Test',
        `❌ Error: ${error}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Auth Debug</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={[styles.statusText, authStatus.includes('✅') ? styles.success : styles.error]}>
          {authStatus}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.button} onPress={handleTestAuth}>
        <Text style={styles.buttonText}>Test Auth</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={checkAuthStatus}>
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
      
      {isLoading && (
        <Text style={styles.loadingText}>Checking...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  success: {
    color: '#27AE60',
  },
  error: {
    color: '#E74C3C',
  },
  button: {
    backgroundColor: '#0F2B04',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingText: {
    textAlig,
    n: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default SimpleAuthDebug;
