const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'https://agritruk.onrender.com/api';

// Use placeholder images for demo
const placeholderImage = 'https://via.placeholder.com/150';
const now = new Date().toISOString();

const mockTransporters = [
  {
    transporterId: 'mock-user-1',
    profilePhoto: placeholderImage,
    vehiclePhotos: [placeholderImage, placeholderImage],
    vehicleType: 'truck',
    registration: 'KAA123A',
    humidityControl: true,
    refrigeration: false,
    dlFile: placeholderImage,
    idFile: placeholderImage,
    logBookFile: placeholderImage,
    insuranceFile: placeholderImage,
    createdAt: now,
    updatedAt: now,
    status: 'approved',
  },
  {
    transporterId: 'mock-user-2',
    profilePhoto: placeholderImage,
    vehiclePhotos: [placeholderImage],
    vehicleType: 'van',
    registration: 'KBB456B',
    humidityControl: false,
    refrigeration: true,
    dlFile: placeholderImage,
    idFile: placeholderImage,
    logBookFile: placeholderImage,
    insuranceFile: placeholderImage,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
  },
  {
    transporterId: 'mock-user-3',
    profilePhoto: placeholderImage,
    vehiclePhotos: [placeholderImage, placeholderImage, placeholderImage],
    vehicleType: 'pickup',
    registration: 'KCC789C',
    humidityControl: false,
    refrigeration: false,
    dlFile: placeholderImage,
    idFile: placeholderImage,
    logBookFile: placeholderImage,
    insuranceFile: placeholderImage,
    createdAt: now,
    updatedAt: now,
    status: 'approved',
  },
];

async function seedTransporters() {
  for (const transporter of mockTransporters) {
    try {
      const res = await fetch(`${API_BASE}/transporters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transporter),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to seed transporter:', data);
      } else {
        console.log('Seeded transporter:', data);
      }
    } catch (err) {
      console.error('Error seeding transporter:', err);
    }
  }
}

seedTransporters();
