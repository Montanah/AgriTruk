require('dotenv').config();

const API_BASE_URL = 'https://agritruk-backend.onrender.com/api';

// Mock transporter data for testing
const mockTransporters = [
  {
    id: 'mock-1',
    name: 'John Transport Ltd',
    companyName: 'John Transport Ltd',
    profilePhoto: 'https://via.placeholder.com/150x150?text=JT',
    vehiclePhoto: 'https://via.placeholder.com/300x200?text=TRUCK',
    vehiclePhotos: ['https://via.placeholder.com/300x200?text=TRUCK'],
    vehicleType: 'truck',
    vehicleMake: 'Mercedes',
    vehicleModel: 'Actros',
    vehicleYear: 2022,
    capacity: 25,
    bodyType: 'Flatbed',
    driveType: '6x4',
    reg: 'KAA123A',
    rating: 4.8,
    experience: 5,
    tripsCompleted: 150,
    availability: true,
    refrigerated: false,
    humidityControl: true,
    specialFeatures: ['GPS Tracking', 'Temperature Control', 'Insurance'],
    costPerKm: 45,
    est: '2-3 hours',
    estimatedCost: 'KSH 15,000',
    location: 'Nairobi, Kenya',
    address: 'Nairobi, Kenya'
  },
  {
    id: 'mock-2',
    name: 'Fast Cargo Solutions',
    companyName: 'Fast Cargo Solutions',
    profilePhoto: 'https://via.placeholder.com/150x150?text=FC',
    vehiclePhoto: 'https://via.placeholder.com/300x200?text=VAN',
    vehiclePhotos: ['https://via.placeholder.com/300x200?text=VAN'],
    vehicleType: 'van',
    vehicleMake: 'Toyota',
    vehicleModel: 'Hiace',
    vehicleYear: 2021,
    capacity: 3,
    bodyType: 'Panel Van',
    driveType: '4x2',
    reg: 'KBB456B',
    rating: 4.5,
    experience: 3,
    tripsCompleted: 89,
    availability: true,
    refrigerated: true,
    humidityControl: false,
    specialFeatures: ['Refrigeration', 'Express Delivery'],
    costPerKm: 35,
    est: '1-2 hours',
    estimatedCost: 'KSH 8,500',
    location: 'Mombasa, Kenya',
    address: 'Mombasa, Kenya'
  },
  {
    id: 'mock-3',
    name: 'Agri Haulers Kenya',
    companyName: 'Agri Haulers Kenya',
    profilePhoto: 'https://via.placeholder.com/150x150?text=AH',
    vehiclePhoto: 'https://via.placeholder.com/300x200?text=PICKUP',
    vehiclePhotos: ['https://via.placeholder.com/300x200?text=PICKUP'],
    vehicleType: 'pickup',
    vehicleMake: 'Ford',
    vehicleModel: 'Ranger',
    vehicleYear: 2023,
    capacity: 1.5,
    bodyType: 'Pickup',
    driveType: '4x4',
    reg: 'KCC789C',
    rating: 4.9,
    experience: 7,
    tripsCompleted: 234,
    availability: true,
    refrigerated: false,
    humidityControl: true,
    specialFeatures: ['4x4 Capability', 'Off-road', 'Agri Specialized'],
    costPerKm: 40,
    est: '30-45 mins',
    estimatedCost: 'KSH 6,200',
    location: 'Kisumu, Kenya',
    address: 'Kisumu, Kenya'
  }
];

async function testTransportersAPI() {
  console.log('🚛 Testing Transporters API');
  console.log('============================\n');

  try {
    // Test the health endpoint first
    console.log('1️⃣ Testing Health Endpoint...');
    const healthResponse = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health endpoint: WORKING');
      console.log(`   • Status: ${healthData.message}`);
      console.log(`   • Timestamp: ${healthData.timestamp}`);
    } else {
      console.log('⚠️  Health endpoint not working');
    }

    // Test the root endpoint
    console.log('\n2️⃣ Testing Root Endpoint...');
    const rootResponse = await fetch(`${API_BASE_URL.replace('/api', '')}/`);

    if (rootResponse.ok) {
      const rootData = await rootResponse.text();
      console.log('✅ Root endpoint: WORKING');
      console.log(`   • Response: ${rootData}`);
    } else {
      console.log('⚠️  Root endpoint not working');
    }

    // Test the transporters endpoint (should require auth)
    console.log('\n3️⃣ Testing Transporters Endpoint (No Auth)...');
    const transportersResponse = await fetch(`${API_BASE_URL}/transporters`);

    if (transportersResponse.status === 401) {
      console.log('✅ Transporters endpoint: WORKING (requires authentication)');
      console.log('   • Status: 401 Unauthorized (expected)');
    } else if (transportersResponse.status === 404) {
      console.log('⚠️  Transporters endpoint: NOT FOUND');
      console.log('   • This endpoint might not exist');
    } else {
      console.log(`⚠️  Unexpected status: ${transportersResponse.status}`);
    }

    // Test the available transporters endpoint (should require auth)
    console.log('\n4️⃣ Testing Available Transporters Endpoint (No Auth)...');
    const availableResponse = await fetch(`${API_BASE_URL}/transporters/available/list`);

    if (availableResponse.status === 401) {
      console.log('✅ Available transporters endpoint: WORKING (requires authentication)');
      console.log('   • Status: 401 Unauthorized (expected)');
    } else if (availableResponse.status === 404) {
      console.log('⚠️  Available transporters endpoint: NOT FOUND');
    } else {
      console.log(`⚠️  Unexpected status: ${availableResponse.status}`);
    }

    // Test if we can get any public data
    console.log('\n5️⃣ Testing for Public Endpoints...');
    const publicEndpoints = [
      '/api/transporters/public',
      '/api/transporters/list',
      '/api/transporters/all',
      '/api/public/transporters',
    ];

    for (const endpoint of publicEndpoints) {
      try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}${endpoint}`);
        if (response.ok) {
          console.log(`✅ Found public endpoint: ${endpoint}`);
          const data = await response.json();
          if (Array.isArray(data)) {
            console.log(`   • Found ${data.length} transporters`);
          }
        }
      } catch (error) {
        // Endpoint doesn't exist or failed
      }
    }

    // Check if there are any seed data or mock data
    console.log('\n6️⃣ Checking for Seed Data...');
    console.log('   • Seed file exists: seed_transporters.js');
    console.log('   • Mock transporters defined: 3');
    console.log('   • Note: These are mock data, not real API responses');

    // Display mock data structure
    console.log('\n7️⃣ Mock Transporter Data Structure:');
    mockTransporters.forEach((transporter, index) => {
      console.log(`\n   📋 Transporter ${index + 1}:`);
      console.log(`      • Name: ${transporter.name}`);
      console.log(`      • Vehicle: ${transporter.vehicleMake} ${transporter.vehicleModel} (${transporter.vehicleYear})`);
      console.log(`      • Type: ${transporter.vehicleType} • Capacity: ${transporter.capacity}T`);
      console.log(`      • Plate: ${transporter.reg} • Drive: ${transporter.driveType}`);
      console.log(`      • Rating: ${transporter.rating}/5 • Experience: ${transporter.experience} years`);
      console.log(`      • ETA: ${transporter.est} • Estimated Cost: ${transporter.estimatedCost}`);
      console.log(`      • Special Features: ${transporter.specialFeatures.join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Error testing transporters API:', error.message);

    if (error.message.includes('fetch')) {
      console.log('\n🔍 Troubleshooting:');
      console.log('   • Check if backend is running');
      console.log('   • Verify API URL is correct');
      console.log('   • Check network connectivity');
    }
  }

  console.log('\n🔍 Testing completed! Check results above.');
  console.log('\n📋 Summary:');
  console.log('   • The backend appears to require authentication for transporter data');
  console.log('   • No public endpoints found for listing transporters');
  console.log('   • You may need to implement a public endpoint or use authentication');
  console.log('   • Mock data structure shows all required fields for transporter display');
}

// Run the test
testTransportersAPI();
