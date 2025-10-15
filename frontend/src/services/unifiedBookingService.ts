/**
 * Unified Booking Management Service
 * Provides consistent booking and request management across all user roles
 */

import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';
import { generateUnifiedBookingId, getDisplayBookingId } from '../utils/unifiedIdSystem';

// Unified data structures
export interface UnifiedBooking {
  id: string;
  bookingId: string; // User-friendly display ID
  type: 'instant' | 'booking' | 'consolidated';
  status: BookingStatus;
  fromLocation: LocationData;
  toLocation: LocationData;
  productType: string;
  weight: string;
  urgency: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  estimatedValue?: number;
  description?: string;
  price?: number;
  
  // Client information
  client: {
    id: string;
    name: string;
    company?: string;
    phone: string;
    email: string;
    type: 'shipper' | 'business' | 'broker';
  };
  
  // Transporter information (when assigned)
  transporter?: {
    id: string;
    name: string;
    phone: string;
    profilePhoto?: string;
    rating?: number;
    experience?: string;
    availability?: string;
    tripsCompleted?: number;
    status?: string;
  };
  
  // Vehicle information (when assigned)
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: string;
    type: string;
    registration: string;
    color: string;
    capacity: string;
  };
  
  // Consolidation data
  isConsolidated?: boolean;
  consolidatedBookings?: UnifiedBooking[];
  consolidationId?: string;
  
  // Tracking data
  tracking?: {
    currentLocation?: LocationData;
    lastUpdate?: string;
    estimatedArrival?: string;
    route?: LocationData[];
  };
  
  // Broker-specific data
  brokerData?: {
    brokerId: string;
    brokerName: string;
    clientId: string;
    clientName: string;
    commission?: number;
  };
  
  // Business-specific data
  businessData?: {
    businessId: string;
    businessName: string;
    department?: string;
    costCenter?: string;
    approvalRequired?: boolean;
    approvedBy?: string;
    approvedAt?: string;
  };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
  region?: string;
  country?: string;
}

export type BookingStatus = 
  | 'pending'           // Initial state
  | 'confirmed'         // Accepted by transporter
  | 'picked_up'         // Cargo picked up
  | 'in_transit'        // Currently being transported
  | 'delivered'         // Successfully delivered
  | 'cancelled'         // Cancelled by any party
  | 'disputed'          // Under dispute
  | 'completed';        // Fully completed (payment, rating, etc.)

export interface BookingFilters {
  status?: BookingStatus[];
  type?: ('instant' | 'booking' | 'consolidated')[];
  dateRange?: {
    start: string;
    end: string;
  };
  clientId?: string;
  transporterId?: string;
  urgency?: ('low' | 'medium' | 'high')[];
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  totalValue: number;
  averageValue: number;
}

class UnifiedBookingService {
  private static instance: UnifiedBookingService;
  private cache: Map<string, UnifiedBooking[]> = new Map();
  private lastFetch: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): UnifiedBookingService {
    if (!UnifiedBookingService.instance) {
      UnifiedBookingService.instance = new UnifiedBookingService();
    }
    return UnifiedBookingService.instance;
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  /**
   * Get bookings for a specific user role
   */
  async getBookings(
    userRole: 'shipper' | 'broker' | 'business' | 'transporter' | 'driver',
    filters?: BookingFilters
  ): Promise<UnifiedBooking[]> {
    const cacheKey = `${userRole}_${JSON.stringify(filters || {})}`;
    const now = Date.now();
    
    // Check cache
    if (this.cache.has(cacheKey) && this.lastFetch.has(cacheKey)) {
      const lastFetchTime = this.lastFetch.get(cacheKey)!;
      if (now - lastFetchTime < this.CACHE_DURATION) {
        return this.cache.get(cacheKey)!;
      }
    }

    try {
      const token = await this.getAuthToken();
      let endpoint: string;
      
      // Determine endpoint based on user role
      switch (userRole) {
        case 'shipper':
          endpoint = `${API_ENDPOINTS.BOOKINGS}/shipper`;
          break;
        case 'broker':
          endpoint = `${API_ENDPOINTS.BROKERS}/requests`;
          break;
        case 'business':
          endpoint = `${API_ENDPOINTS.BOOKINGS}/business`;
          break;
        case 'transporter':
        case 'driver':
          endpoint = `${API_ENDPOINTS.BOOKINGS}/transporter`;
          break;
        default:
          throw new Error(`Unsupported user role: ${userRole}`);
      }

      // Add query parameters for filters
      const queryParams = new URLSearchParams();
      if (filters?.status) {
        queryParams.append('status', filters.status.join(','));
      }
      if (filters?.type) {
        queryParams.append('type', filters.type.join(','));
      }
      if (filters?.dateRange) {
        queryParams.append('startDate', filters.dateRange.start);
        queryParams.append('endDate', filters.dateRange.end);
      }
      if (filters?.clientId) {
        queryParams.append('clientId', filters.clientId);
      }
      if (filters?.transporterId) {
        queryParams.append('transporterId', filters.transporterId);
      }
      if (filters?.urgency) {
        queryParams.append('urgency', filters.urgency.join(','));
      }

      const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const bookings = this.normalizeBookings(data.bookings || data.requests || data.data || []);
      
      // Cache the results
      this.cache.set(cacheKey, bookings);
      this.lastFetch.set(cacheKey, now);
      
      return bookings;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  /**
   * Get booking statistics for a user role
   */
  async getBookingStats(userRole: string): Promise<BookingStats> {
    try {
      const bookings = await this.getBookings(userRole as any);
      
      const stats: BookingStats = {
        total: bookings.length,
        pending: 0,
        confirmed: 0,
        inTransit: 0,
        delivered: 0,
        cancelled: 0,
        totalValue: 0,
        averageValue: 0,
      };

      bookings.forEach(booking => {
        switch (booking.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'confirmed':
            stats.confirmed++;
            break;
          case 'in_transit':
          case 'picked_up':
            stats.inTransit++;
            break;
          case 'delivered':
          case 'completed':
            stats.delivered++;
            break;
          case 'cancelled':
            stats.cancelled++;
            break;
        }
        
        if (booking.estimatedValue) {
          stats.totalValue += booking.estimatedValue;
        }
      });

      stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;
      
      return stats;
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      throw error;
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    message?: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          message,
          metadata,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update booking status: ${response.status} ${response.statusText}`);
      }

      // Clear cache to force refresh
      this.clearCache();
      
      return true;
    } catch (error) {
      console.error('Error updating booking status:', error);
      return false;
    }
  }

  /**
   * Create a new booking/request
   */
  async createBooking(
    bookingData: Partial<UnifiedBooking>,
    userRole: 'shipper' | 'broker' | 'business'
  ): Promise<UnifiedBooking> {
    try {
      const token = await this.getAuthToken();
      
      // Generate unified booking ID
      const bookingId = generateUnifiedBookingId(
        bookingData.productType?.toLowerCase().includes('agricultural') ? 'agri' : 'cargo',
        bookingData.type === 'instant' ? 'instant' : 'booking',
        bookingData.isConsolidated || false
      );

      const payload = {
        ...bookingData,
        bookingId,
        status: 'pending' as BookingStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let endpoint: string;
      switch (userRole) {
        case 'shipper':
          endpoint = `${API_ENDPOINTS.BOOKINGS}`;
          break;
        case 'broker':
          endpoint = `${API_ENDPOINTS.BROKERS}/requests`;
          break;
        case 'business':
          endpoint = `${API_ENDPOINTS.BOOKINGS}/business`;
          break;
        default:
          throw new Error(`Unsupported user role for booking creation: ${userRole}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create booking: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const booking = this.normalizeBooking(data.booking || data.request || data);
      
      // Clear cache to force refresh
      this.clearCache();
      
      return booking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  /**
   * Consolidate multiple bookings (for brokers)
   */
  async consolidateBookings(
    bookingIds: string[],
    consolidationData: {
      fromLocation: LocationData;
      toLocation: LocationData;
      productType: string;
      totalWeight: string;
      urgency: 'low' | 'medium' | 'high';
      description?: string;
    }
  ): Promise<UnifiedBooking> {
    try {
      const token = await this.getAuthToken();
      
      const consolidationId = generateUnifiedBookingId(
        consolidationData.productType.toLowerCase().includes('agricultural') ? 'agri' : 'cargo',
        'booking',
        true
      );

      const payload = {
        ...consolidationData,
        bookingId: consolidationId,
        type: 'consolidated' as const,
        status: 'pending' as BookingStatus,
        consolidatedBookingIds: bookingIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_ENDPOINTS.BROKERS}/consolidate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to consolidate bookings: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const consolidatedBooking = this.normalizeBooking(data.consolidatedBooking || data);
      
      // Clear cache to force refresh
      this.clearCache();
      
      return consolidatedBooking;
    } catch (error) {
      console.error('Error consolidating bookings:', error);
      throw error;
    }
  }

  /**
   * Get real-time tracking data for a booking
   */
  async getTrackingData(bookingId: string): Promise<UnifiedBooking['tracking']> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.BOOKINGS}/${bookingId}/tracking`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tracking data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.tracking;
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      throw error;
    }
  }

  /**
   * Normalize booking data from different API responses
   */
  private normalizeBookings(bookings: any[]): UnifiedBooking[] {
    return bookings.map(booking => this.normalizeBooking(booking));
  }

  /**
   * Normalize a single booking from API response
   */
  private normalizeBooking(booking: any): UnifiedBooking {
    return {
      id: booking.id || booking.bookingId || booking._id,
      bookingId: booking.bookingId || getDisplayBookingId(booking) || booking.id,
      type: this.normalizeType(booking.type),
      status: this.normalizeStatus(booking.status),
      fromLocation: this.normalizeLocation(booking.fromLocation || booking.pickupLocation),
      toLocation: this.normalizeLocation(booking.toLocation || booking.deliveryLocation),
      productType: booking.productType || booking.cargoDetails || booking.cargoType || 'General Cargo',
      weight: booking.weight || booking.cargoWeight || 'N/A',
      urgency: this.normalizeUrgency(booking.urgency),
      createdAt: booking.createdAt || booking.created_at || new Date().toISOString(),
      updatedAt: booking.updatedAt || booking.updated_at || new Date().toISOString(),
      estimatedValue: booking.estimatedValue || booking.price || booking.cost,
      description: booking.description || booking.cargoDescription,
      price: booking.price || booking.cost || booking.estimatedValue,
      
      client: {
        id: booking.clientId || booking.userId || booking.shipperId,
        name: booking.clientName || booking.shipperName || booking.userName || 'Unknown Client',
        company: booking.clientCompany || booking.companyName,
        phone: booking.clientPhone || booking.phone || booking.contactPhone,
        email: booking.clientEmail || booking.email || booking.contactEmail,
        type: this.normalizeClientType(booking.clientType || booking.userType),
      },
      
      transporter: booking.transporter ? {
        id: booking.transporter.id || booking.transporterId,
        name: booking.transporter.name || booking.transporterName,
        phone: booking.transporter.phone || booking.transporterPhone,
        profilePhoto: booking.transporter.profilePhoto || booking.transporter.photo,
        rating: booking.transporter.rating,
        experience: booking.transporter.experience,
        availability: booking.transporter.availability,
        tripsCompleted: booking.transporter.tripsCompleted,
        status: booking.transporter.status,
      } : undefined,
      
      vehicle: booking.vehicle ? {
        id: booking.vehicle.id || booking.vehicleId,
        make: booking.vehicle.make,
        model: booking.vehicle.model,
        year: booking.vehicle.year,
        type: booking.vehicle.type,
        registration: booking.vehicle.registration,
        color: booking.vehicle.color,
        capacity: booking.vehicle.capacity,
      } : undefined,
      
      isConsolidated: booking.isConsolidated || booking.type === 'consolidated',
      consolidatedBookings: booking.consolidatedBookings || booking.consolidatedRequests,
      consolidationId: booking.consolidationId,
      
      tracking: booking.tracking,
      
      brokerData: booking.brokerData ? {
        brokerId: booking.brokerData.brokerId,
        brokerName: booking.brokerData.brokerName,
        clientId: booking.brokerData.clientId,
        clientName: booking.brokerData.clientName,
        commission: booking.brokerData.commission,
      } : undefined,
      
      businessData: booking.businessData ? {
        businessId: booking.businessData.businessId,
        businessName: booking.businessData.businessName,
        department: booking.businessData.department,
        costCenter: booking.businessData.costCenter,
        approvalRequired: booking.businessData.approvalRequired,
        approvedBy: booking.businessData.approvedBy,
        approvedAt: booking.businessData.approvedAt,
      } : undefined,
    };
  }

  /**
   * Normalize booking type
   */
  private normalizeType(type: any): 'instant' | 'booking' | 'consolidated' {
    if (typeof type === 'string') {
      const normalized = type.toLowerCase();
      if (normalized.includes('instant')) return 'instant';
      if (normalized.includes('consolidated')) return 'consolidated';
      return 'booking';
    }
    return 'booking';
  }

  /**
   * Normalize booking status
   */
  private normalizeStatus(status: any): BookingStatus {
    if (typeof status === 'string') {
      const normalized = status.toLowerCase().replace(/[_\s]/g, '');
      switch (normalized) {
        case 'pending':
        case 'waiting':
        case 'new':
          return 'pending';
        case 'confirmed':
        case 'accepted':
        case 'assigned':
          return 'confirmed';
        case 'pickedup':
        case 'picked_up':
        case 'collected':
          return 'picked_up';
        case 'intransit':
        case 'in_transit':
        case 'ongoing':
        case 'started':
          return 'in_transit';
        case 'delivered':
        case 'completed':
        case 'finished':
          return 'delivered';
        case 'cancelled':
        case 'canceled':
          return 'cancelled';
        case 'disputed':
        case 'dispute':
          return 'disputed';
        default:
          return 'pending';
      }
    }
    return 'pending';
  }

  /**
   * Normalize urgency level
   */
  private normalizeUrgency(urgency: any): 'low' | 'medium' | 'high' {
    if (typeof urgency === 'string') {
      const normalized = urgency.toLowerCase();
      if (normalized.includes('high') || normalized.includes('urgent')) return 'high';
      if (normalized.includes('medium') || normalized.includes('normal')) return 'medium';
      return 'low';
    }
    return 'medium';
  }

  /**
   * Normalize client type
   */
  private normalizeClientType(type: any): 'shipper' | 'business' | 'broker' {
    if (typeof type === 'string') {
      const normalized = type.toLowerCase();
      if (normalized.includes('business') || normalized.includes('corporate')) return 'business';
      if (normalized.includes('broker')) return 'broker';
      return 'shipper';
    }
    return 'shipper';
  }

  /**
   * Normalize location data
   */
  private normalizeLocation(location: any): LocationData {
    if (typeof location === 'string') {
      // If it's just a string, try to parse it or return default
      return {
        latitude: 0,
        longitude: 0,
        address: location,
      };
    }
    
    if (location && typeof location === 'object') {
      return {
        latitude: location.latitude || location.lat || 0,
        longitude: location.longitude || location.lng || location.lon || 0,
        address: location.address || location.name || 'Unknown Location',
        city: location.city,
        region: location.region || location.state,
        country: location.country,
      };
    }
    
    return {
      latitude: 0,
      longitude: 0,
      address: 'Unknown Location',
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lastFetch.clear();
  }

  /**
   * Get cached bookings
   */
  getCachedBookings(userRole: string, filters?: BookingFilters): UnifiedBooking[] | null {
    const cacheKey = `${userRole}_${JSON.stringify(filters || {})}`;
    return this.cache.get(cacheKey) || null;
  }
}

export const unifiedBookingService = UnifiedBookingService.getInstance();
