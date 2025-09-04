#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🔍 TRUKAPP Backend Connectivity Test');
console.log('=====================================\n');

const BACKEND_URL = 'https://agritruk.onrender.com';
const API_ENDPOINTS = [
    '/',
    '/api/health',
    '/api/auth',
];

async function testEndpoint(url) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        
        const req = client.request(url, { 
            method: 'GET',
            timeout: 10000,
            headers: {
                'User-Agent': 'TRUKAPP-Test/1.0'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    url,
                    status: res.statusCode,
                    headers: res.headers,
                    data: data.substring(0, 200), // First 200 chars
                    success: res.statusCode >= 200 && res.statusCode < 300
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                url,
                status: 'ERROR',
                error: error.message,
                success: false
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                url,
                status: 'TIMEOUT',
                error: 'Request timeout after 10 seconds',
                success: false
            });
        });

        req.end();
    });
}

async function runTests() {
    console.log(`Testing backend at: ${BACKEND_URL}\n`);

    for (const endpoint of API_ENDPOINTS) {
        const fullUrl = `${BACKEND_URL}${endpoint}`;
        console.log(`Testing: ${fullUrl}`);
        
        const result = await testEndpoint(fullUrl);
        
        if (result.success) {
            console.log(`✅ Status: ${result.status}`);
            console.log(`📄 Response: ${result.data}`);
        } else {
            console.log(`❌ Status: ${result.status}`);
            console.log(`🚨 Error: ${result.error || 'Unknown error'}`);
        }
        
        console.log('---\n');
    }

    // Test specific auth endpoint with POST
    console.log('Testing POST to /api/auth (should return 401 without auth)');
    const authTest = await testPostAuth();
    if (authTest.success) {
        console.log(`✅ Auth endpoint responds correctly: ${authTest.status}`);
    } else {
        console.log(`❌ Auth endpoint error: ${authTest.error}`);
    }
}

async function testPostAuth() {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            action: 'resend-email-code'
        });

        const options = {
            hostname: 'agritruk.onrender.com',
            port: 443,
            path: '/api/auth',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'TRUKAPP-Test/1.0'
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: data.substring(0, 200),
                    success: res.statusCode === 401 || res.statusCode === 400 // Expected without auth
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                status: 'ERROR',
                error: error.message,
                success: false
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                status: 'TIMEOUT',
                error: 'Request timeout',
                success: false
            });
        });

        req.write(postData);
        req.end();
    });
}

runTests().then(() => {
    console.log('🏁 Backend connectivity test completed');
    console.log('\n📋 Summary:');
    console.log('- If you see 200/401 responses, the backend is running');
    console.log('- If you see timeouts/errors, there may be network issues');
    console.log('- Check your environment variables and network connection');
}).catch(console.error);
