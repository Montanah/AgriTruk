import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
}

export class ErrorBoundary extends React.Component<{}, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ error, errorInfo });
    // You can also log error to an error reporting service here
    console.error('Global ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Something went wrong.</Text>
          <Text style={styles.error}>{this.state.error?.toString()}</Text>
          <Text style={styles.stack}>{this.state.errorInfo?.componentStack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#b00020', marginBottom: 12 },
  error: { color: '#b00020', fontSize: 16, marginBottom: 8 },
  stack: { color: '#333', fontSize: 12, marginTop: 8 },
});

export default ErrorBoundary;
