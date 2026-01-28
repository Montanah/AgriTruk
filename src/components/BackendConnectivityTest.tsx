import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiRequest, testBackendConnectivity } from '../utils/api';

export default function BackendConnectivityTest() {
    const [isLoading, setIsLoading] = useState(false);
    const [testResults, setTestResults] = useState<string[]>([]);

    const addResult = (message: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const testConnectivity = async () => {
        setIsLoading(true);
        setTestResults([]);

        try {
            addResult('🔍 Starting backend connectivity test...');

            // Test 1: Health endpoint
            addResult('🔍 Testing health endpoint...');
            const isHealthy = await testBackendConnectivity();

            if (isHealthy) {
                addResult('✅ Backend health check passed');

                // Test 2: Try a simple API request
                addResult('🔍 Testing API request...');
                try {
                    const data = await apiRequest('/health');
                    addResult('✅ API request successful');
                    addResult(`📦 Response: ${JSON.stringify(data)}`);
                } catch (apiError) {
                    addResult(`❌ API request failed: ${apiError.message}`);
                }
            } else {
                addResult('❌ Backend health check failed');
                addResult('💡 Possible issues:');
                addResult('   - Backend server not running');
                addResult('   - Network connectivity issues');
                addResult('   - Backend URL incorrect');
            }
        } catch (error) {
            addResult(`❌ Test failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const clearResults = () => {
        setTestResults([]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Backend Connectivity Test</Text>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={testConnectivity}
                disabled={isLoading}
            >
                <Text style={styles.buttonText}>
                    {isLoading ? 'Testing...' : 'Test Backend Connection'}
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
        marginBottom: 15,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
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
        maxHeight: 300,
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
