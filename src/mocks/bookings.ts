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
  experience?: string;
  languages?: string[];
  rating?: number;
}

export interface Vehicle {
  type: string;
  color: string;
  make: string;
  capacity: string;
  plate: string;
  bodyType?: string;
  driveType?: string;
  year?: string;
  photo?: string;
  specialFeatures?: string[];
  insurance?: boolean;
  gpsTracking?: boolean;
}

export interface Transporter {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  costPerKm?: number;
  rating?: number;
  experience?: string;
  languages?: string[];
  availability?: string;
  profilePhoto?: string;
  tripsCompleted?: number;
  status?: string;
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
  estimatedCost?: number;
  specialFeatures?: string[];
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
      profilePhoto: 'https://randomuser.me/api/portraits/women/44.jpg',
      costPerKm: 120,
      rating: 4.8,
      experience: '5 years',
      languages: ['English', 'Swahili'],
      availability: '24/7',
      tripsCompleted: 156,
      status: 'Active',
    },
    vehicle: {
      type: 'Pickup',
      bodyType: 'open',
      color: 'White',
      make: 'Isuzu',
      capacity: '1 ton',
      plate: 'KDA 123A',
      driveType: '4WD',
      year: '2019',
      photo: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&h=300&fit=crop',
      specialFeatures: ['agri-specialized', 'rural-routes'],
      insurance: true,
      gpsTracking: true,
    },
    reference: 'REF-001',
    eta: '20 min',
    distance: '8 km',
    estimatedCost: 960,
    specialFeatures: ['refrigerated', 'humidity-control'],
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
      profilePhoto: 'https://randomuser.me/api/portraits/men/45.jpg',
      costPerKm: 100,
      rating: 4.6,
      experience: '3 years',
      languages: ['English', 'Swahili', 'Kikuyu'],
      availability: 'Business hours',
      tripsCompleted: 89,
      status: 'Active',
    },
    vehicle: {
      type: 'Van',
      bodyType: 'closed',
      color: 'Blue',
      make: 'Toyota',
      capacity: '2 tons',
      plate: 'KDB 456B',
      driveType: '2WD',
      year: '2017',
      photo: 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&h=300&fit=crop',
      specialFeatures: ['hazardous-certified', 'fast-delivery'],
      insurance: true,
      gpsTracking: true,
    },
    reference: 'REF-002',
    eta: '10 min',
    distance: '3 km',
    estimatedCost: 300,
    specialFeatures: ['hazardous-certified'],
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
      experience: '8 years',
      languages: ['English', 'Swahili', 'French'],
      rating: 4.9,
    },
    transporter: {
      id: 't3',
      name: 'TransCo Ltd.',
      phone: '+254700333333',
      photo: 'https://randomuser.me/api/portraits/men/46.jpg',
      profilePhoto: 'https://randomuser.me/api/portraits/men/46.jpg',
      costPerKm: 150,
      rating: 4.9,
      experience: '8 years',
      languages: ['English', 'Swahili', 'French'],
      availability: '24/7',
      tripsCompleted: 342,
      status: 'Active',
    },
    vehicle: {
      type: 'Truck',
      bodyType: 'closed',
      color: 'White',
      make: 'Isuzu',
      capacity: '10T',
      plate: 'KDA 123',
      driveType: '4WD',
      year: '2022',
      photo: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&h=300&fit=crop',
      specialFeatures: ['premium-service', 'temperature-controlled', 'high-value-insurance'],
      insurance: true,
      gpsTracking: true,
    },
    reference: 'REF-003',
    eta: '15 min',
    distance: '5 km',
    estimatedCost: 750,
    specialFeatures: ['temperature-controlled', 'premium-service'],
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
      profilePhoto: 'https://randomuser.me/api/portraits/men/47.jpg',
      costPerKm: 90,
      rating: 4.4,
      experience: '4 years',
      languages: ['Swahili', 'Kikuyu', 'English'],
      availability: 'Weekdays + Weekends',
      tripsCompleted: 67,
      status: 'Active',
    },
    vehicle: {
      type: 'Lorry',
      bodyType: 'open',
      color: 'Silver',
      make: 'Nissan',
      capacity: '5 tons',
      plate: 'KDD 101D',
      driveType: '2WD',
      year: '2018',
      photo: 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&h=300&fit=crop',
      specialFeatures: ['livestock-transport', 'agri-specialized'],
      insurance: true,
      gpsTracking: false,
    },
    reference: 'REF-004',
    eta: '25 min',
    distance: '12 km',
    estimatedCost: 1080,
    specialFeatures: ['fragile-handling'],
  },
  {
    id: '5',
    pickupLocation: 'Factory E',
    cargoDetails: 'Machinery Parts, 3 tons',
    pickupTime: '2024-06-15T09:00:00Z',
    status: 'scheduled',
    type: 'booking',
    transporterType: 'company',
    assignedDriver: {
      id: 'd2',
      name: 'Sarah Kamau',
      phone: '+254700555555',
      photo: 'https://randomuser.me/api/portraits/women/48.jpg',
      experience: '6 years',
      languages: ['English', 'Swahili'],
      rating: 4.7,
    },
    transporter: {
      id: 't5',
      name: 'Premium Logistics Ltd',
      phone: '+254700777888',
      photo: 'https://randomuser.me/api/portraits/men/4.jpg',
      profilePhoto: 'https://randomuser.me/api/portraits/men/4.jpg',
      costPerKm: 180,
      rating: 4.9,
      experience: '8 years',
      languages: ['English', 'Swahili', 'French'],
      availability: '24/7',
      tripsCompleted: 234,
      status: 'Active',
    },
    vehicle: {
      type: 'Truck',
      bodyType: 'closed',
      color: 'Silver',
      make: 'Mercedes-Benz',
      capacity: '15T',
      plate: 'KDD 999D',
      driveType: '4WD',
      year: '2022',
      photo: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400&h=300&fit=crop',
      specialFeatures: [
        'premium-service',
        'temperature-controlled',
        'high-value-insurance',
        'real-time-tracking',
      ],
      insurance: true,
      gpsTracking: true,
    },
    reference: 'REF-005',
    eta: '45 min',
    distance: '30 km',
    estimatedCost: 5400,
    specialFeatures: ['oversized-capable', 'high-value-insurance'],
  },
];
