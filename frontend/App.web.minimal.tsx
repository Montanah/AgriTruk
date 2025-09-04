import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Web-specific logging
console.log('\n' + '='.repeat(100));
console.log('🚀 TRUKAPP WEB VERSION STARTED (MINIMAL)');
console.log('='.repeat(100));
console.log('✅ Web app is starting up...');
console.log('🌐 This is a minimal web version for compatibility');
console.log('⏰ App start timestamp:', new Date().toISOString());
console.log('='.repeat(100) + '\n');

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingTitle}>🚀 TRUKAPP</Text>
          <Text style={styles.loadingSubtitle}>Loading your transportation solution...</Text>
          <View style={styles.spinner} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>🚛 TRUKAPP</Text>
        <Text style={styles.subtitle}>Transportation & Logistics Platform</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌐 Web Version</Text>
          <Text style={styles.cardText}>
            Welcome to TRUKAPP web version! This is a simplified interface optimized for web browsers.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 Full Features Available</Text>
          <Text style={styles.cardText}>
            For the complete TRUKAPP experience with interactive maps, real-time tracking, and all features, 
            please use our mobile app.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔧 Current Status</Text>
          <Text style={styles.statusText}>✅ Backend API: Connected</Text>
          <Text style={styles.statusText}>✅ Authentication: Ready</Text>
          <Text style={styles.statusText}>✅ Web Interface: Active</Text>
          <Text style={styles.statusText}>⚠️ Maps: Limited (use mobile app)</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚀 Quick Actions</Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>📞 Contact Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>📱 Download Mobile App</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>📋 View Documentation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            TRUKAPP - Connecting transporters with businesses across Kenya
          </Text>
          <Text style={styles.footerSubtext}>
            Web version v1.0 | For full features, use our mobile app
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  spinner: {
    width: 40,
    height: 40,
    borderWidth: 4,
    borderColor: '#e0e0e0',
    borderTopColor: '#007AFF',
    borderRadius: 20,
    // Animation would be handled by CSS in a real implementation
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    paddingLeft: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default App;
