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

export interface Booking {
  id: string;
  pickupLocation: string;
  cargoDetails: string;
  pickupTime: string; // ISO string or empty for instant
  status: BookingStatus;
  type: BookingType;
  transporterType: string; // 'individual' | 'company'
  assignedDriver?: AssignedDriver; // For company bookings
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
  },
  {
    id: '2',
    pickupLocation: 'Warehouse B',
    cargoDetails: 'Fertilizer, 1 ton',
    pickupTime: '2024-06-12T14:00:00Z',
    status: 'accepted',
    type: 'booking',
    transporterType: 'individual',
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
      name: 'John Driver',
      phone: '+254700123456',
      photo: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
  },
  {
    id: '4',
    pickupLocation: 'Depot D',
    cargoDetails: 'Electronics, 200kg',
    pickupTime: '',
    status: 'in-progress',
    type: 'instant',
    transporterType: 'individual',
  },
];
