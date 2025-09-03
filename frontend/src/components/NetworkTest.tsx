import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NetworkTest() {
    const [testResults, setTestResults] = useState<string[]>([]);

    const addResult = (message: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const testBasicFetch = async () => {
        addResult('🔍 Testing basic fetch to Google...');
        console.log('\n' + '='.repeat(100));
        console.log('🧪 NETWORK TEST - BASIC FETCH TO GOOGLE');
        console.log('='.repeat(100));
        console.log('⏰ Test timestamp:', new Date().toISOString());
        console.log('='.repeat(100) + '\n');

        try {
            const response = await fetch('https://www.google.com');
            addResult(`✅ Google fetch successful: ${response.status}`);
            console.log('✅ Google fetch successful:', response.status);
        } catch (error) {
            addResult(`❌ Google fetch failed: ${error.message}`);
            console.log('❌ Google fetch failed:', error.message);
        }
    };

    const testBackendHealth = async () => {
        addResult('🔍 Testing backend health endpoint...');
        try {
            const response = await fetch('https://agritruk-backend.onrender.com/api/health');
            const data = await response.json();
            addResult(`✅ Backend health successful: ${response.status}`);
            addResult(`📦 Response: ${JSON.stringify(data)}`);
        } catch (error) {
            addResult(`❌ Backend health failed: ${error.message}`);
        }
    };

    const testBackendWithAuth = async () => {
        addResult('🔍 Testing backend with auth...');
        try {
            const { getAuth } = require('firebase/auth');
            const auth = getAuth();
            const user = auth.currentUser;

            if (!user) {
                addResult('❌ No authenticated user');
                return;
            }

            const token = await user.getIdToken();
            addResult(`🔑 Got Firebase token: ${token ? 'Success' : 'Failed'}`);

            const response = await fetch('https://agritruk-backend.onrender.com/api/transporters/test', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            addResult(`📦 Auth test response: ${JSON.stringify(data)}`);
        } catch (error) {
            addResult(`❌ Backend auth test failed: ${error.message}`);
        }
    };

    const runAllTests = async () => {
        setTestResults([]);
        addResult('🚀 Starting network tests...');

        await testBasicFetch();
        await testBackendHealth();
        await testBackendWithAuth();

        addResult('✅ All tests completed');
    };

    const clearResults = () => {
        setTestResults([]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Network Connectivity Test</Text>

            <TouchableOpacity style={styles.button} onPress={runAllTests}>
                <Text style={styles.buttonText}>Run All Tests</Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.smallButton} onPress={testBasicFetch}>
                    <Text style={styles.buttonText}>Test Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.smallButton} onPress={testBackendHealth}>
                    <Text style={styles.buttonText}>Test Backend</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.smallButton} onPress={testBackendWithAuth}>
                    <Text style={styles.buttonText}>Test Auth</Text>
                </TouchableOpacity>
            </View>

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
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    smallButton: {
        backgroundColor: '#34C759',
        padding: 10,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 2,
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
