export type BookingType = 'booking' | 'instant';
export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'scheduled'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export interface AssignedDriver {
  id: string;
  name: string;
  phone: string;
  photo?: string;
}

export interface Vehicle {
  type: string;
  color: string;
  make: string;
  capacity: string;
  plate: string;
}

export interface Transporter {
  id: string;
  name: string;
  phone: string;
  photo?: string;
}

export interface Booking {
  id: string;
  pickupLocation: string;
  cargoDetails: string;
  pickupTime: string; // ISO string or empty for instant
  status: BookingStatus;
  type: BookingType;
  transporterType: string; // 'individual' | 'company'
  assignedDriver?: AssignedDriver; // For company bookings
  transporter?: Transporter;
  vehicle?: Vehicle;
  reference?: string;
  eta?: string;
  distance?: string;
}

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: '1',
    pickupLocation: 'Farm A',
    cargoDetails: 'Maize, 2 tons',
    pickupTime: '2024-06-10T10:00:00Z',
    status: 'pending',
    type: 'booking',
    transporterType: 'individual',
    transporter: {
      id: 't1',
      name: 'Jana',
      phone: '+254700111111',
      photo: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    vehicle: {
      type: 'Pickup',
      color: 'White',
      make: 'Isuzu',
      capacity: '1 ton',
      plate: 'KDA 123A',
    },
    reference: 'REF-001',
    eta: '20 min',
    distance: '8 km',
  },
  {
    id: '2',
    pickupLocation: 'Warehouse B',
    cargoDetails: 'Fertilizer, 1 ton',
    pickupTime: '2024-06-12T14:00:00Z',
    status: 'accepted',
    type: 'booking',
    transporterType: 'individual',
    transporter: {
      id: 't2',
      name: 'Moses',
      phone: '+254700222222',
      photo: 'https://randomuser.me/api/portraits/men/45.jpg',
    },
    vehicle: {
      type: 'Van',
      color: 'Blue',
      make: 'Toyota',
      capacity: '2 tons',
      plate: 'KDB 456B',
    },
    reference: 'REF-002',
    eta: '10 min',
    distance: '3 km',
  },
  {
    id: '3',
    pickupLocation: 'Market C',
    cargoDetails: 'Tomatoes, 500kg',
    pickupTime: '',
    status: 'pending',
    type: 'instant',
    transporterType: 'company',
    assignedDriver: {
      id: 'd1',
      name: 'John Doe',
      phone: '+254700123456',
      photo: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    transporter: {
      id: 't3',
      name: 'TransCo Ltd.',
      phone: '+254700333333',
      photo: 'https://randomuser.me/api/portraits/men/46.jpg',
    },
    vehicle: {
      type: 'Closed Truck',
      color: 'White',
      make: 'Isuzu',
      capacity: '10T',
      plate: 'KDA 123',
    },
    reference: 'REF-003',
    eta: '15 min',
    distance: '5 km',
  },
  {
    id: '4',
    pickupLocation: 'Depot D',
    cargoDetails: 'Electronics, 200kg',
    pickupTime: '',
    status: 'in-progress',
    type: 'instant',
    transporterType: 'individual',
    transporter: {
      id: 't4',
      name: 'Ali',
      phone: '+254700444444',
      photo: 'https://randomuser.me/api/portraits/men/47.jpg',
    },
    vehicle: {
      type: 'Lorry',
      color: 'Silver',
      make: 'Nissan',
      capacity: '5 tons',
      plate: 'KDD 101D',
    },
    reference: 'REF-004',
    eta: '25 min',
    distance: '12 km',
  },
];
