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
  // Consistent with RequestForm structure
  fromLocation: string; // Changed from pickupLocation
  toLocation: string; // Changed from destination
  productType: string; // Add product type field
  weight: string; // Add weight field
  estimatedValue: number; // Add estimated value field
  urgency: 'low' | 'medium' | 'high'; // Add urgency field
  createdAt: string; // Add creation timestamp
  specialRequirements: string[]; // Add special requirements array

  // Legacy fields for backward compatibility
  pickupLocation?: string; // Keep for backward compatibility
  cargoDetails?: string; // Keep for backward compatibility

  pickupTime: string; // ISO string or empty for instant
  status: BookingStatus;
  type: BookingType;
  transporterType: string; // 'individual' | 'company'
  assignedDriver?: AssignedDriver; // For company bookings
  transporter?: Transporter;
  vehicle?: Vehicle;
  client: {
    name: string;
    rating: number;
    completedOrders: number;
  };
  pricing: {
    basePrice: number;
    urgencyBonus: number;
    specialHandling: number;
    insuranceCost: number;
    total: number;
  };
  route: {
    distance: string;
    estimatedTime: string;
    detour: string;
  };
  reference?: string;
  eta?: string;
  distance?: string;
  estimatedCost?: number; // Keep for backward compatibility
  specialFeatures?: string[];

  // Additional RequestForm fields
  insureGoods: boolean;
  insuranceValue: number;
  isRecurring?: boolean;
  recurringFreq?: string;
  additional?: string;
  serviceType: 'agriTRUK' | 'cargoTRUK';
}

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: '1',
    // New RequestForm structure
    fromLocation: 'Farm A, Nakuru',
    toLocation: 'Warehouse X, Nairobi',
    productType: 'Maize',
    weight: '2000kg',
    estimatedValue: 150000,
    urgency: 'medium',
    createdAt: '2024-06-10T08:00:00Z',
    specialRequirements: ['bulk', 'fast-delivery'],

    // Legacy fields for backward compatibility
    pickupLocation: 'Farm A',
    cargoDetails: 'Maize, 2 tons',

    pickupTime: '2024-06-10T10:00:00Z',
    status: 'pending',
    type: 'booking',
    transporterType: 'individual',
    client: {
      name: 'Farm A Ltd.',
      rating: 4.5,
      completedOrders: 100,
    },
    pricing: {
      basePrice: 12000,
      urgencyBonus: 1000,
      specialHandling: 2000,
      insuranceCost: 1500,
      total: 16500,
    },
    route: {
      distance: '120 km',
      estimatedTime: '2.5 hours',
      detour: '0 km',
    },
    insureGoods: true,
    insuranceValue: 150000,
    isRecurring: false,
    additional: 'Please handle with care - premium quality maize',
    serviceType: 'agriTRUK',
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
    // New RequestForm structure
    fromLocation: 'Warehouse B, Eldoret',
    toLocation: 'Market Y, Kisumu',
    productType: 'Fertilizer',
    weight: '1000kg',
    estimatedValue: 80000,
    urgency: 'low',
    createdAt: '2024-06-12T12:00:00Z',
    specialRequirements: ['hazardous', 'bulk'],

    // Legacy fields for backward compatibility
    pickupLocation: 'Warehouse B',
    cargoDetails: 'Fertilizer, 1 ton',

    pickupTime: '2024-06-12T14:00:00Z',
    status: 'accepted',
    type: 'booking',
    transporterType: 'individual',
    client: {
      name: 'Warehouse B Co.',
      rating: 4.2,
      completedOrders: 50,
    },
    pricing: {
      basePrice: 8000,
      urgencyBonus: 0,
      specialHandling: 1500,
      insuranceCost: 0,
      total: 9500,
    },
    route: {
      distance: '95 km',
      estimatedTime: '2 hours',
      detour: '0 km',
    },
    insureGoods: false,
    insuranceValue: 0,
    isRecurring: true,
    recurringFreq: 'Monthly',
    additional: 'Certified for hazardous materials transport',
    serviceType: 'cargoTRUK',
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
    // New RequestForm structure
    fromLocation: 'Market C, Mombasa',
    toLocation: 'Factory Z, Nakuru',
    productType: 'Tomatoes',
    weight: '500kg',
    estimatedValue: 35000,
    urgency: 'high',
    createdAt: '2024-06-13T09:30:00Z',
    specialRequirements: ['perishable', 'refrigerated', 'fast-delivery'],

    // Legacy fields for backward compatibility
    pickupLocation: 'Market C',
    cargoDetails: 'Tomatoes, 500kg',

    pickupTime: '',
    status: 'pending',
    type: 'instant',
    transporterType: 'company',
    client: {
      name: 'Market C Suppliers',
      rating: 4.3,
      completedOrders: 85,
    },
    pricing: {
      basePrice: 15000,
      urgencyBonus: 2000,
      specialHandling: 3000,
      insuranceCost: 350,
      total: 20350,
    },
    route: {
      distance: '180 km',
      estimatedTime: '3 hours',
      detour: '0 km',
    },
    insureGoods: true,
    insuranceValue: 35000,
    isRecurring: false,
    additional: 'Fresh tomatoes - requires temperature-controlled transport',
    serviceType: 'agriTRUK',
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
    // New RequestForm structure
    fromLocation: 'Depot D, Nairobi',
    toLocation: 'Warehouse W, Mombasa',
    productType: 'Electronics',
    weight: '200kg',
    estimatedValue: 120000,
    urgency: 'medium',
    createdAt: '2024-06-14T11:15:00Z',
    specialRequirements: ['fragile', 'highvalue', 'temperature'],

    // Legacy fields for backward compatibility
    pickupLocation: 'Depot D',
    cargoDetails: 'Electronics, 200kg',

    pickupTime: '',
    status: 'in-progress',
    type: 'instant',
    transporterType: 'individual',
    client: {
      name: "Ali's Electronics",
      rating: 4.4,
      completedOrders: 70,
    },
    pricing: {
      basePrice: 18000,
      urgencyBonus: 1000,
      specialHandling: 2500,
      insuranceCost: 1200,
      total: 22700,
    },
    route: {
      distance: '200 km',
      estimatedTime: '4 hours',
      detour: '5 km',
    },
    insureGoods: true,
    insuranceValue: 120000,
    isRecurring: false,
    additional: 'Fragile electronics - handle with extreme care',
    serviceType: 'cargoTRUK',
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
    // New RequestForm structure
    fromLocation: 'Factory E, Thika',
    toLocation: 'Warehouse V, Eldoret',
    productType: 'Machinery Parts',
    weight: '3000kg',
    estimatedValue: 500000,
    urgency: 'low',
    createdAt: '2024-06-15T07:00:00Z',
    specialRequirements: ['oversized', 'bulk', 'priority'],

    // Legacy fields for backward compatibility
    pickupLocation: 'Factory E',
    cargoDetails: 'Machinery Parts, 3 tons',

    pickupTime: '2024-06-15T09:00:00Z',
    status: 'scheduled',
    type: 'booking',
    transporterType: 'company',
    client: {
      name: 'Factory E Co.',
      rating: 4.6,
      completedOrders: 120,
    },
    pricing: {
      basePrice: 25000,
      urgencyBonus: 0,
      specialHandling: 5000,
      insuranceCost: 5000,
      total: 35000,
    },
    route: {
      distance: '250 km',
      estimatedTime: '5 hours',
      detour: '10 km',
    },
    insureGoods: true,
    insuranceValue: 500000,
    isRecurring: true,
    recurringFreq: 'Weekly',
    additional: 'Heavy machinery parts - requires special loading equipment',
    serviceType: 'cargoTRUK',
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
