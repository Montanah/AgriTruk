export type BookingType = 'booking' | 'instant';
export type BookingStatus = 'pending' | 'accepted' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  pickupLocation: string;
  cargoDetails: string;
  pickupTime: string; // ISO string or empty for instant
  status: BookingStatus;
  type: BookingType;
}

export const MOCK_BOOKINGS: Booking[] = [
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
