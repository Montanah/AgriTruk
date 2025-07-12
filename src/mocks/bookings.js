// Mock bookings and instant requests for transporter management
export const MOCK_BOOKINGS = [
  {
    id: '1',
    pickupLocation: 'Farm A',
    cargoDetails: 'Maize, 2 tons',
    pickupTime: '2024-06-10T10:00:00Z',
    status: 'pending',
    type: 'booking',
  },
  {
    id: '2',
    pickupLocation: 'Warehouse B',
    cargoDetails: 'Fertilizer, 1 ton',
    pickupTime: '2024-06-12T14:00:00Z',
    status: 'accepted',
    type: 'booking',
  },
  {
    id: '3',
    pickupLocation: 'Market C',
    cargoDetails: 'Tomatoes, 500kg',
    pickupTime: '',
    status: 'pending',
    type: 'instant',
  },
  {
    id: '4',
    pickupLocation: 'Depot D',
    cargoDetails: 'Electronics, 200kg',
    pickupTime: '',
    status: 'in-progress',
    type: 'instant',
  },
];
