import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { EXTERNAL_URLS } from '../constants/images';

class NetworkService {
  private isConnected = false;
  private connectionType: string | null = null;
  private listeners: Array<(isConnected: boolean) => void> = [];

  constructor() {
    this.initializeNetworkMonitoring();
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring() {
    // Get initial network state
    NetInfo.fetch().then(state => {
      this.isConnected = state.isConnected || false;
      this.connectionType = state.type;
      console.log('🌐 Initial network state:', { isConnected: this.isConnected, type: this.connectionType });
    });

    // Listen for network state changes
    NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected || false;
      this.connectionType = state.type;

      console.log('🌐 Network state changed:', { 
        isConnected: this.isConnected, 
        type: this.connectionType,
        wasConnected 
      });

      // Notify listeners
      this.listeners.forEach(listener => listener(this.isConnected));

      // Show alert if connection was lost
      if (wasConnected && !this.isConnected) {
        this.showConnectionLostAlert();
      } else if (!wasConnected && this.isConnected) {
        this.showConnectionRestoredAlert();
      }
    });
  }

  /**
   * Check if device is connected to internet
   */
  isConnectedToInternet(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection type
   */
  getConnectionType(): string | null {
    return this.connectionType;
  }

  /**
   * Add network state listener
   */
  addNetworkListener(listener: (isConnected: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Test internet connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      // Test basic connectivity
      const response = await fetch(EXTERNAL_URLS.GOOGLE, {
        method: 'HEAD',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Test Firebase connectivity
   */
  async testFirebaseConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(EXTERNAL_URLS.FIREBASE_FIRESTORE, {
        method: 'HEAD',
        timeout: 10000,
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Firebase connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Show connection lost alert
   */
  private showConnectionLostAlert() {
    Alert.alert(
      'Connection Lost',
      'Your internet connection has been lost. Some features may not work properly.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Show connection restored alert
   */
  private showConnectionRestoredAlert() {
    Alert.alert(
      'Connection Restored',
      'Your internet connection has been restored.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Get detailed network information
   */
  async getNetworkInfo() {
    try {
      const state = await NetInfo.fetch();
      const connectivityTest = await this.testConnectivity();
      const firebaseTest = await this.testFirebaseConnectivity();

      return {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
        connectivityTest,
        firebaseTest,
        details: state.details,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return {
        isConnected: false,
        type: 'unknown',
        isInternetReachable: false,
        connectivityTest: false,
        firebaseTest: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Diagnose connection issues
   */
  async diagnoseConnectionIssues() {
    console.log('🔍 Diagnosing connection issues...');
    
    const networkInfo = await this.getNetworkInfo();
    console.log('📊 Network Info:', networkInfo);

    if (!networkInfo.isConnected) {
      console.log('❌ Device is not connected to any network');
      return {
        issue: 'no_network',
        message: 'Device is not connected to any network',
        solution: 'Check your WiFi or mobile data connection'
      };
    }

    if (!networkInfo.connectivityTest) {
      console.log('❌ Device is connected but cannot reach the internet');
      return {
        issue: 'no_internet',
        message: 'Device is connected but cannot reach the internet',
        solution: 'Check your internet connection or try a different network'
      };
    }

    if (!networkInfo.firebaseTest) {
      console.log('❌ Internet works but Firebase is unreachable');
      return {
        issue: 'firebase_unreachable',
        message: 'Internet works but Firebase services are unreachable',
        solution: 'Firebase services may be down or blocked by your network'
      };
    }

    console.log('✅ All connectivity tests passed');
    return {
      issue: 'none',
      message: 'All connectivity tests passed',
      solution: 'Connection issues may be temporary'
    };
  }
}

export const networkService = new NetworkService();
