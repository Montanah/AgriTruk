import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import colors from '../../constants/colors';
import fonts from '../../constants/fonts';
import spacing from '../../constants/spacing';
import { googleMapsService } from '../../services/googleMapsService';

const GoogleMapsTest: React.FC = () => {
    const [testResults, setTestResults] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const addResult = (message: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const clearResults = () => {
        setTestResults([]);
    };

    const testGeocoding = async () => {
        setIsLoading(true);
        addResult('Testing geocoding...');

        try {
            const result = await googleMapsService.geocodeAddress('Nairobi, Kenya');
            addResult(`✅ Geocoding success: ${result.latitude}, ${result.longitude}`);
            addResult(`Address: ${result.address}`);
        } catch (error: any) {
            addResult(`❌ Geocoding failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const testPlacesSearch = async () => {
        setIsLoading(true);
        addResult('Testing places search...');

        try {
            const results = await googleMapsService.searchPlaces('Nairobi');
            addResult(`✅ Places search success: Found ${results.length} places`);
            if (results.length > 0) {
                addResult(`First result: ${results[0].name} - ${results[0].address}`);
            }
        } catch (error: any) {
            addResult(`❌ Places search failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const testPlaceDetails = async () => {
        setIsLoading(true);
        addResult('Testing place details...');

        try {
            // First search for a place to get a place ID
            const places = await googleMapsService.searchPlaces('Nairobi');
            if (places.length > 0) {
                const placeId = places[0].placeId;
                addResult(`Found place ID: ${placeId}`);

                const details = await googleMapsService.getPlaceDetails(placeId);
                addResult(`✅ Place details success: ${details.name}`);
                addResult(`Address: ${details.address}`);
                addResult(`Location: ${details.location.latitude}, ${details.location.longitude}`);
            } else {
                addResult('❌ No places found to test details');
            }
        } catch (error: any) {
            addResult(`❌ Place details failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const testDirections = async () => {
        setIsLoading(true);
        addResult('Testing directions...');

        try {
            const result = await googleMapsService.getDirections(
                'Nairobi, Kenya',
                'Mombasa, Kenya'
            );
            addResult(`✅ Directions success: ${result.distance} in ${result.duration}`);
        } catch (error: any) {
            addResult(`❌ Directions failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const testApiKey = async () => {
        setIsLoading(true);
        try {
            const isWorking = await googleMapsService.testApiKey();
            if (isWorking) {
                addResult('✅ API Key Test: PASSED - API key is working correctly');
            } else {
                addResult('❌ API Key Test: FAILED - Check API key and billing');
            }
        } catch (error: any) {
            addResult(`❌ API Key Test Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const runAllTests = async () => {
        clearResults();
        addResult('Starting Google Maps API tests...');

        await testGeocoding();
        await testPlacesSearch();
        await testPlaceDetails();
        await testDirections();
        await testApiKey(); // Added this line to run the new test

        addResult('All tests completed!');
    };

    const runComprehensiveDiagnostics = async () => {
        setIsLoading(true);
        addResult('🔍 Starting comprehensive Google Maps API diagnostics...');

        try {
            // Test 1: Check API key loading
            addResult('1️⃣ Testing API key loading...');
            const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
                addResult('✅ API key loaded successfully');
                addResult(`   Key preview: ${apiKey.substring(0, 10)}...`);
            } else {
                addResult('❌ API key not loaded properly');
                addResult('   Check your .env file and restart the app');
                return;
            }

            // Test 2: Test basic API connectivity
            addResult('2️⃣ Testing basic API connectivity...');
            const isWorking = await googleMapsService.testApiKey();
            if (isWorking) {
                addResult('✅ Basic API connectivity: PASSED');
            } else {
                addResult('❌ Basic API connectivity: FAILED');
                addResult('   This suggests API key, billing, or API enablement issues');
            }

            // Test 3: Test Places API specifically
            addResult('3️⃣ Testing Places API specifically...');
            try {
                const places = await googleMapsService.searchPlaces('Nairobi');
                if (places && places.length > 0) {
                    addResult('✅ Places API: WORKING');
                    addResult(`   Found ${places.length} places for "Nairobi"`);
                } else {
                    addResult('⚠️ Places API: No results (might be working but no results)');
                }
            } catch (error: any) {
                addResult('❌ Places API: FAILED');
                addResult(`   Error: ${error.message}`);

                // Provide specific troubleshooting steps
                if (error.message.includes('REQUEST_DENIED')) {
                    addResult('   🔧 Troubleshooting: Check API key restrictions and billing');
                } else if (error.message.includes('OVER_QUERY_LIMIT')) {
                    addResult('   🔧 Troubleshooting: Quota exceeded, check billing');
                } else if (error.message.includes('INVALID_REQUEST')) {
                    addResult('   🔧 Troubleshooting: Invalid API request format');
                }
            }

            // Test 4: Test Geocoding API
            addResult('4️⃣ Testing Geocoding API...');
            try {
                const location = await googleMapsService.geocodeAddress('Nairobi, Kenya');
                addResult('✅ Geocoding API: WORKING');
                addResult(`   Nairobi coordinates: ${location.latitude}, ${location.longitude}`);
            } catch (error: any) {
                addResult('❌ Geocoding API: FAILED');
                addResult(`   Error: ${error.message}`);
            }

            addResult('🔍 Diagnostics completed! Check the results above.');

        } catch (error: any) {
            addResult(`❌ Diagnostic error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Google Maps API Test</Text>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={runAllTests}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>
                        {isLoading ? 'Running Tests...' : 'Run All Tests'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={testGeocoding}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Test Geocoding</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={testPlacesSearch}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Test Places Search</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={testPlaceDetails}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Test Place Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={testDirections}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Test Directions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={testApiKey}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Test API Key</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={runComprehensiveDiagnostics}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>🔍 Run Full Diagnostics</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.clearButton]}
                    onPress={clearResults}
                >
                    <Text style={styles.buttonText}>Clear Results</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>Test Results:</Text>
                {testResults.length === 0 ? (
                    <Text style={styles.noResults}>No test results yet. Run a test to see results.</Text>
                ) : (
                    testResults.map((result, index) => (
                        <Text key={index} style={styles.resultText}>
                            {result}
                        </Text>
                    ))
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.lg,
        backgroundColor: colors.background,
    },
    title: {
        fontSize: fonts.size.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    buttonContainer: {
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    button: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    secondaryButton: {
        backgroundColor: colors.secondary,
    },
    clearButton: {
        backgroundColor: colors.text.light,
    },
    buttonText: {
        color: colors.white,
        fontSize: fonts.size.md,
        fontWeight: '600',
    },
    resultsContainer: {
        backgroundColor: colors.white,
        borderRadius: 8,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.text.light + '20',
    },
    resultsTitle: {
        fontSize: fonts.size.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    noResults: {
        fontSize: fonts.size.md,
        color: colors.text.light,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: spacing.md,
    },
    resultText: {
        fontSize: 14,
        fontFamily: fonts.family.regular,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
});

export default GoogleMapsTest;



