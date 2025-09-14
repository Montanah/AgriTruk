import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../constants/colors';
import { apiRequest } from '../utils/api';

export default function APITestComponent() {
    const [isLoading, setIsLoading] = useState(false);
    const [testResults, setTestResults] = useState<string[]>([]);

    const addResult = (message: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const testHealthEndpoint = async () => {
        setIsLoading(true);
        addResult('🔍 Testing health endpoint...');

        try {
            // API test - health endpoint

            const response = await apiRequest('/health');
            addResult(`✅ Health endpoint successful: ${JSON.stringify(response)}`);
            // Health endpoint test successful
        } catch (error) {
            addResult(`❌ Health endpoint failed: ${error.message}`);
            // Health endpoint test failed
        } finally {
            setIsLoading(false);
        }
    };

    const testTransporterEndpoint = async () => {
        setIsLoading(true);
        addResult('🔍 Testing transporter endpoint...');

        try {
            // API test - transporter endpoint
            // Test separator

            // This will likely fail with 401, but we'll see the request in logs
            const response = await apiRequest('/transporters/test');
            addResult(`✅ Transporter endpoint successful: ${JSON.stringify(response)}`);
            // Transporter endpoint test successful
        } catch (error) {
            addResult(`❌ Transporter endpoint failed: ${error.message}`);
            // Transporter endpoint test failed
        } finally {
            setIsLoading(false);
        }
    };

    const clearResults = () => {
        setTestResults([]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>API Test Component</Text>
            <Text style={styles.subtitle}>Check your terminal for detailed logs!</Text>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={testHealthEndpoint}
                disabled={isLoading}
            >
                <Text style={styles.buttonText}>
                    {isLoading ? 'Testing...' : 'Test Health Endpoint'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
                onPress={testTransporterEndpoint}
                disabled={isLoading}
            >
                <Text style={styles.buttonText}>
                    {isLoading ? 'Testing...' : 'Test Transporter Endpoint'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
                <Text style={styles.clearButtonText}>Clear Results</Text>
            </TouchableOpacity>

            <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>Test Results:</Text>
                {testResults.map((result, index) => (
                    <Text key={index} style={styles.resultText}>
                        {result}
                    </Text>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#f5f5f5',
        margin: 10,
        borderRadius: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: colors.text.light,
        marginBottom: 15,
        textAlign: 'center',
    },
    button: {
        backgroundColor: colors.primary,
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    secondaryButton: {
        backgroundColor: colors.secondary,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    clearButton: {
        backgroundColor: '#FF3B30',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
    },
    clearButtonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    resultsContainer: {
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 8,
        maxHeight: 200,
    },
    resultsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    resultText: {
        fontSize: 12,
        marginBottom: 5,
        fontFamily: 'monospace',
    },
});
