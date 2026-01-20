import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../constants/colors';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ error, errorInfo });
    // Log error - this will be removed in production by babel plugin if enabled
    console.error('Global ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    // Reset error state to allow app to continue
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || this.state.error?.toString() || 'Unknown error';
      const errorStack = this.state.errorInfo?.componentStack || '';
      
      // Log full error details for debugging
      console.error('ErrorBoundary - Full error details:', {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        message: errorMessage,
        stack: errorStack
      });
      
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.error} style={styles.icon} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry, but something unexpected happened. Please try again.
          </Text>
          
          {/* Show error details in development mode */}
          {(typeof __DEV__ !== 'undefined' && __DEV__) && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorDetailsTitle}>Error Details (Dev Mode):</Text>
              <Text style={styles.errorDetailsText}>{errorMessage}</Text>
              {errorStack ? (
                <Text style={styles.errorStackText}>{errorStack.substring(0, 500)}</Text>
              ) : null}
            </View>
          )}
          
          <TouchableOpacity style={styles.reloadButton} onPress={this.handleReload}>
            <MaterialCommunityIcons name="refresh" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.reloadButtonText}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  reloadButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorDetails: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    width: '100%',
    maxWidth: '90%',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  errorStackText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    opacity: 0.7,
  },
});

export default ErrorBoundary;
