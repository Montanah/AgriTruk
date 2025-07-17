export const mockVehicles = [
  {
    id: 'V001',
    type: 'Truck',
    reg: 'KDA 123A',
    refrigeration: true,
    humidityControl: false,
    specialCargo: false,
    features: 'GPS, ABS',
    insurance: { fileName: 'kda_insurance.pdf', uri: 'https://example.com/kda_insurance.pdf' },
    photos: [
      { uri: 'https://images.unsplash.com/photo-1519681393784-d120267933ba' },
      { uri: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70' },
      { uri: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca' }
    ],
    assignedDriverId: 'D001',
  },
  {
    id: 'V002',
    type: 'Van',
    reg: 'KDB 456B',
    refrigeration: false,
    humidityControl: true,
    specialCargo: true,
    features: 'Bluetooth, Airbags',
    insurance: { fileName: 'kdb_insurance.pdf', uri: 'https://example.com/kdb_insurance.pdf' },
    photos: [
      { uri: 'https://images.unsplash.com/photo-1511918984145-48de785d4c4e' },
      { uri: 'https://images.unsplash.com/photo-1502877338535-766e1452684a' },
      { uri: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99' }
    ],
    assignedDriverId: null,
  },
];
