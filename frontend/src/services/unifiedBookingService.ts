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
    photo?: string;
    rating?: number;
    experience?: string;
    availability?: string;
    tripsCompleted?: number;
    status?: string;
    companyName?: string;
    company?: {
      id: string;
      name: string;
    };
    assignedVehicle?: any;
    vehicle?: any;
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
    photo?: string;
    photos?: string[];
    companyId?: string;
    companyName?: string;
  };
  
  // Driver information (when assigned - separate from transporter for company drivers)
  assignedDriver?: {
    id: string;
    driverId?: string; // Firestore document ID for the driver (separate from id which might be userId)
    name: string;
    phone: string;
    photo?: string;
    profilePhoto?: string;
    profileImage?: string;
    licenseNumber?: string;
    companyName?: string;
    company?: {
      id: string;
      name: string;
    };
    assignedVehicle?: any;
    assignedVehicleId?: string;
  };
  
  // Company information (for company drivers)
  company?: {
    id: string;
    name: string;
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
          // Prefer new backend endpoint that scopes by broker ownership and client attribution
          endpoint = `${API_ENDPOINTS.BOOKINGS}/broker/scoped`;
          break;
        case 'business':
          // Businesses manage their own bookings as regular users; fetch by current userId
          {
            const auth = getAuth();
            const me = auth.currentUser;
            endpoint = `${API_ENDPOINTS.BOOKINGS}/shipper/${me?.uid}`;
          }
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
      
      let response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Fallbacks for brokers if dedicated endpoint is missing or empty
      if (userRole === 'broker') {
        let shouldFallback = !response.ok;
        if (!shouldFallback) {
          try {
            const probe = await response.clone().json();
            const arr = probe.bookings || probe.requests || probe.data || [];
            if (!Array.isArray(arr) || arr.length === 0) shouldFallback = true;
          } catch {
            shouldFallback = true;
          }
        }
        if (shouldFallback) {
          // Try to discover canonical brokerId for current broker
          let brokerIdParam = '';
          try {
            const meRes = await fetch(`${API_ENDPOINTS.BROKERS}/me`, {
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (meRes.ok) {
              const me = await meRes.json();
              const bid = me?.data?.id || me?.broker?.id || me?.id || me?.data?.brokerId || me?.brokerId;
              if (bid) brokerIdParam = `brokerId=${encodeURIComponent(bid)}`;
            } else {
              // fallback via clients to infer brokerId
              const clientsRes = await fetch(`${API_ENDPOINTS.BROKERS}/clients`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
              });
              if (clientsRes.ok) {
                const cjson = await clientsRes.json();
                const first = (cjson.data || cjson.clients || [])[0];
                const bid = first?.brokerId;
                if (bid) brokerIdParam = `brokerId=${encodeURIComponent(bid)}`;
              }
            }
          } catch {}

          const fallbackUrls = [
            `${API_ENDPOINTS.BOOKINGS}/user/${getAuth().currentUser?.uid || ''}`,
            `${API_ENDPOINTS.REQUESTS}${brokerIdParam ? `?${brokerIdParam}` : ''}`,
            `${API_ENDPOINTS.BOOKINGS}?scope=broker${brokerIdParam ? `&${brokerIdParam}` : ''}`,
            `${API_ENDPOINTS.BOOKINGS}${brokerIdParam ? `?${brokerIdParam}` : ''}`,
          ];
          for (const fb of fallbackUrls) {
            const fbRes = await fetch(fb, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (fbRes.ok) {
              response = fbRes;
              break;
            }
          }
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let bookings = this.normalizeBookings(data.bookings || data.requests || data.data || []);
      
      // Enrichment: attach client and vehicle details when missing
      if (userRole === 'broker' || userRole === 'business' || userRole === 'shipper') {
        try {
          const token = await this.getAuthToken();
          // Map of clientId -> client object
          let clientsIndex: Record<string, any> | null = null;
          if (userRole === 'broker') {
            const clientsRes = await fetch(`${API_ENDPOINTS.BROKERS}/clients`, {
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (clientsRes.ok) {
              const clientsData = await clientsRes.json();
              const clientsArr: any[] = clientsData.data || clientsData.clients || [];
              clientsIndex = {};
              clientsArr.forEach((c: any) => { clientsIndex![c.id || c.userId] = c; });
            }
          }

          bookings = await Promise.all(bookings.map(async (b) => {
            const enriched = { ...b } as UnifiedBooking;
            
            // Debug: Log what we have before enrichment
            if (b.type === 'instant' || (b as any).bookingMode === 'instant' || ['accepted', 'confirmed', 'assigned'].includes((b.status || '').toLowerCase())) {
              console.log('🔍 [enrichment] Before enrichment - Booking:', {
                id: enriched.id,
                status: enriched.status,
                transporterId: (enriched as any)._raw?.transporterId,
                assignedDriverId: (enriched as any)._raw?.assignedDriverId,
                driverId: (enriched as any)._raw?.driverId,
                vehicleId: (enriched as any)._raw?.vehicleId || (enriched as any)._raw?.selectedVehicleId,
                hasVehicle: !!enriched.vehicle,
                hasDriver: !!enriched.assignedDriver,
                hasCompany: !!enriched.company,
              });
            }
            
            // Client enrichment
            if ((enriched.client?.name === 'Client' || !enriched.client?.name) && clientsIndex && enriched.client?.id) {
              const c = clientsIndex[enriched.client.id];
              if (c) {
                enriched.client = {
                  id: c.id || enriched.client.id,
                  name: c.name || enriched.client.name,
                  company: c.company || c.corporate || enriched.client.company,
                  phone: c.phone || enriched.client.phone,
                  email: c.email || enriched.client.email,
                  type: enriched.client.type,
                };
              }
            }

            // Enhanced vehicle enrichment - check multiple sources
            // First check if we already have vehicle from assignedDriver
            if (!enriched.vehicle && enriched.assignedDriver?.assignedVehicleId) {
              try {
                const vehRes = await fetch(`${API_ENDPOINTS.VEHICLES}/${enriched.assignedDriver.assignedVehicleId}`, {
                  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                if (vehRes.ok) {
                  const vehData = await vehRes.json();
                  const v = vehData.vehicle || vehData.data || vehData;
                  if (v && (v.id || v.vehicleId)) {
                    enriched.vehicle = {
                      id: v.id || v.vehicleId,
                      make: v.make || v.vehicleMake,
                      model: v.model || v.vehicleModel,
                      year: String(v.year || v.vehicleYear || ''),
                      type: v.bodyType || v.type || v.vehicleType,
                      registration: v.vehicleRegistration || v.registration || v.reg,
                      color: v.color || v.vehicleColor,
                      capacity: String(v.capacity || v.vehicleCapacity || ''),
                      photo: v.photo || v.vehiclePhoto || (v.photos && v.photos[0]) || (v.vehicleImagesUrl && v.vehicleImagesUrl[0]),
                      photos: v.photos || v.vehicleImagesUrl || [],
                      companyId: v.companyId,
                      companyName: v.companyName,
                    };
                  }
                }
              } catch {}
            }
            
            if (!enriched.vehicle) {
              const rawBooking = (enriched as any)._raw || {};
              const vehicleId = rawBooking.vehicleId || rawBooking.selectedVehicleId;
              const driverId = enriched.assignedDriver?.id || enriched.transporter?.id || rawBooking.assignedDriverId || rawBooking.driverId;
              
              try {
                // First try: fetch by vehicleId (for instant requests where user selected a vehicle)
                if (vehicleId) {
                  const vehRes = await fetch(`${API_ENDPOINTS.VEHICLES}/${vehicleId}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                  });
                  if (vehRes.ok) {
                    const vehData = await vehRes.json();
                    const v = vehData.vehicle || vehData.data || vehData;
                    if (v && (v.id || v.vehicleId)) {
                      enriched.vehicle = {
                        id: v.id || v.vehicleId,
                        make: v.make || v.vehicleMake,
                        model: v.model || v.vehicleModel,
                        year: String(v.year || v.vehicleYear || ''),
                        type: v.bodyType || v.type || v.vehicleType,
                        registration: v.vehicleRegistration || v.registration || v.reg,
                        color: v.color || v.vehicleColor,
                        capacity: String(v.capacity || v.vehicleCapacity || ''),
                        photo: v.photo || v.vehiclePhoto || (v.photos && v.photos[0]) || (v.vehicleImagesUrl && v.vehicleImagesUrl[0]),
                        photos: v.photos || v.vehicleImagesUrl || [],
                        companyId: v.companyId,
                        companyName: v.companyName,
                      };
                      
                      // Also enrich driver if vehicle has assignedDriverId
                      if (v.assignedDriverId && !enriched.assignedDriver) {
                        try {
                          const driverRes = await fetch(`${API_ENDPOINTS.DRIVERS}/${v.assignedDriverId}`, {
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                          });
                          if (driverRes.ok) {
                            const driverData = await driverRes.json();
                            const d = driverData.driver || driverData.data || driverData;
                            if (d) {
                              enriched.assignedDriver = {
                                id: d.id || d.driverId,
                                name: d.name || d.driverName || (d.firstName && d.lastName ? `${d?.firstName} ${d?.lastName}` : 'Driver'),
                                phone: d.phone,
                                photo: d.photo || d.profilePhoto || d.profileImage,
                                licenseNumber: d.licenseNumber || d.driverLicense,
                                companyName: d.companyName || d.company?.name,
                                company: d.company || (d.companyId ? { id: d.companyId, name: d.companyName } : undefined),
                                assignedVehicle: d.assignedVehicle || d.vehicle,
                                assignedVehicleId: d.assignedVehicleId || d.assignedVehicle?.id || d.vehicle?.id,
                              };
                              
                              // Enrich company if driver has companyId
                              if (d.companyId && !enriched.company) {
                                try {
                                  const companyRes = await fetch(`${API_ENDPOINTS.COMPANIES}/${d.companyId}`, {
                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                                  });
                                  if (companyRes.ok) {
                                    const companyData = await companyRes.json();
                                    const c = companyData.company || companyData.data || companyData;
                                    if (c) {
                                      enriched.company = {
                                        id: c.id || c.companyId,
                                        name: c.name || c.companyName,
                                      };
                                    }
                                  }
                                } catch {}
                              }
                            }
                          }
                        } catch {}
                      }
                    }
                  }
                }
                
                // Second try: fetch by assignedDriverId (if vehicle not found by vehicleId)
                if (!enriched.vehicle && driverId) {
                  const vehRes = await fetch(`${API_ENDPOINTS.VEHICLES}?assignedDriverId=${encodeURIComponent(driverId)}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                  });
                  if (vehRes.ok) {
                    const vehData = await vehRes.json();
                    const vehicles: any[] = vehData.data || vehData.vehicles || [];
                    if (vehicles.length > 0) {
                      const v = vehicles[0];
                      enriched.vehicle = {
                        id: v.id || v.vehicleId,
                        make: v.make || v.vehicleMake,
                        model: v.model || v.vehicleModel,
                        year: String(v.year || v.vehicleYear || ''),
                        type: v.bodyType || v.type || v.vehicleType,
                        registration: v.vehicleRegistration || v.registration || v.reg,
                        color: v.color || v.vehicleColor,
                        capacity: String(v.capacity || v.vehicleCapacity || ''),
                        photo: v.photo || v.vehiclePhoto || (v.photos && v.photos[0]) || (v.vehicleImagesUrl && v.vehicleImagesUrl[0]),
                        photos: v.photos || v.vehicleImagesUrl || [],
                        companyId: v.companyId,
                        companyName: v.companyName,
                      };
                    }
                  }
                }
              } catch (err) {
                console.warn('Vehicle enrichment failed:', err);
              }
            }
            
            // Enrich driver if missing - transporterId is usually the driver's userId
            if (!enriched.assignedDriver) {
              const rawBooking = (enriched as any)._raw || {};
              const transporterId = rawBooking.transporterId || enriched.transporter?.id;
              const driverId = rawBooking.assignedDriverId || rawBooking.driverId;
              
              // First try: Look up driver by userId (transporterId) - this is the most common case
              if (transporterId) {
                try {
                  console.log(`🔍 [enrichment] Looking up driver by userId (transporterId): ${transporterId}`);
                  
                  // Try multiple endpoints to find the driver
                  let driverData: any = null;
                  
                  // Method 1: Try /api/drivers/check/{userId}
                  try {
                    const checkRes = await fetch(`${API_ENDPOINTS.DRIVERS}/check/${transporterId}`, {
                      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                    });
                    if (checkRes.ok) {
                      const checkData = await checkRes.json();
                      if (checkData.success && checkData.isDriver && checkData.driver) {
                        driverData = checkData.driver;
                        console.log(`✅ [enrichment] Found driver via /check endpoint`);
                      }
                    }
                  } catch (err) {
                    console.warn('Driver check endpoint failed:', err);
                  }
                  
                  // Method 2: Try /api/companies/driver/{userId} (fallback)
                  if (!driverData) {
                    try {
                      const companyRes = await fetch(`${API_ENDPOINTS.COMPANIES}/driver/${transporterId}`, {
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                      });
                      if (companyRes.ok) {
                        const companyData = await companyRes.json();
                        driverData = companyData.driver || companyData.data || companyData;
                        if (driverData) {
                          console.log(`✅ [enrichment] Found driver via /companies/driver endpoint`);
                        }
                      }
                    } catch (err) {
                      console.warn('Company driver endpoint failed:', err);
                    }
                  }
                  
                  // If we found the driver but don't have full details, fetch by driverId
                  if (driverData) {
                    const foundDriverId = driverData.id || driverData.driverId;
                    const hasVehicleId = driverData.assignedVehicleId || driverData.assignedVehicleDetails;
                    const hasCompanyId = driverData.companyId;
                    
                    // Always fetch full driver details to ensure we have assignedVehicleId and companyId
                    if (foundDriverId && (!hasVehicleId || !hasCompanyId)) {
                      try {
                        console.log(`🔍 [enrichment] Fetching full driver details by driverId: ${foundDriverId}`);
                        const fullDriverRes = await fetch(`${API_ENDPOINTS.DRIVERS}/${foundDriverId}`, {
                          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                        });
                        if (fullDriverRes.ok) {
                          const fullDriverData = await fullDriverRes.json();
                          const fullDriver = fullDriverData.driver || fullDriverData.data || fullDriverData;
                          if (fullDriver) {
                            // Merge full driver data, prioritizing full driver data
                            driverData = { ...driverData, ...fullDriver };
                            console.log(`✅ [enrichment] Enriched driver with full details:`, {
                              assignedVehicleId: driverData.assignedVehicleId || driverData.assignedVehicleDetails,
                              companyId: driverData.companyId,
                            });
                          }
                        }
                      } catch (err) {
                        console.warn('Full driver fetch failed:', err);
                      }
                    }
                  }
                  
                  if (driverData) {
                    const d = driverData;
                    console.log(`✅ [enrichment] Driver data:`, {
                      driverId: d.id || d.driverId,
                      name: d.name || d.driverName || (d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : 'Driver'),
                      assignedVehicleId: d.assignedVehicleId,
                      companyId: d.companyId,
                    });
                    
                    enriched.assignedDriver = {
                      id: d.id || d.driverId,
                      driverId: d.driverId || d.id, // Also store driverId separately for easier access
                      name: d.name || d.driverName || (d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : 'Driver'),
                      phone: d.phone,
                      photo: d.photo || d.profilePhoto || d.profileImage,
                      licenseNumber: d.licenseNumber || d.driverLicense,
                      companyName: d.companyName || d.company?.name,
                      company: d.company || (d.companyId ? { id: d.companyId, name: d.companyName } : undefined),
                      assignedVehicle: d.assignedVehicle || d.vehicle,
                      assignedVehicleId: d.assignedVehicleId || d.assignedVehicleDetails || d.assignedVehicle?.id || d.vehicle?.id,
                    };
                    
                    // Enrich company from driver
                    if (d.companyId && !enriched.company) {
                      try {
                        console.log(`🔍 [enrichment] Fetching company by companyId: ${d.companyId}`);
                        const companyRes = await fetch(`${API_ENDPOINTS.COMPANIES}/${d.companyId}`, {
                          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                        });
                        if (companyRes.ok) {
                          const companyData = await companyRes.json();
                          const c = companyData.company || companyData.data || companyData;
                          if (c) {
                            console.log(`✅ [enrichment] Found company:`, {
                              id: c.id || c.companyId,
                              name: c.name || c.companyName,
                            });
                            enriched.company = {
                              id: c.id || c.companyId,
                              name: c.name || c.companyName,
                            };
                          }
                        }
                      } catch (err) {
                        console.warn('Company enrichment failed:', err);
                      }
                    }
                    
                    // Enrich vehicle from driver's assignedVehicleId or assignedVehicleDetails
                    const vehicleId = d.assignedVehicleId || d.assignedVehicleDetails;
                    if (vehicleId && !enriched.vehicle) {
                      try {
                        console.log(`🔍 [enrichment] Fetching vehicle by assignedVehicleId: ${vehicleId}`);
                        const vehRes = await fetch(`${API_ENDPOINTS.VEHICLES}/${vehicleId}`, {
                          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                        });
                        if (vehRes.ok) {
                          const vehData = await vehRes.json();
                          const v = vehData.vehicle || vehData.data || vehData;
                          if (v && (v.id || v.vehicleId)) {
                            console.log(`✅ [enrichment] Found vehicle:`, {
                              id: v.id || v.vehicleId,
                              registration: v.vehicleRegistration || v.registration,
                              make: v.make || v.vehicleMake,
                              capacity: v.capacity || v.vehicleCapacity,
                            });
                            enriched.vehicle = {
                              id: v.id || v.vehicleId,
                              make: v.make || v.vehicleMake,
                              model: v.model || v.vehicleModel,
                              year: String(v.year || v.vehicleYear || ''),
                              type: v.bodyType || v.type || v.vehicleType,
                              registration: v.vehicleRegistration || v.registration || v.reg,
                              color: v.color || v.vehicleColor,
                              capacity: String(v.capacity || v.vehicleCapacity || ''),
                              photo: v.photo || v.vehiclePhoto || (v.photos && v.photos[0]) || (v.vehicleImagesUrl && v.vehicleImagesUrl[0]),
                              photos: v.photos || v.vehicleImagesUrl || [],
                              companyId: v.companyId,
                              companyName: v.companyName,
                            };
                          } else {
                            console.warn(`⚠️ [enrichment] Vehicle data invalid for ID: ${vehicleId}`);
                          }
                        } else {
                          console.warn(`⚠️ [enrichment] Vehicle fetch failed with status: ${vehRes.status} for ID: ${vehicleId}`);
                        }
                      } catch (err) {
                        console.warn('Vehicle enrichment from driver failed:', err);
                      }
                    } else if (!vehicleId) {
                      console.warn(`⚠️ [enrichment] Driver has no assignedVehicleId or assignedVehicleDetails`);
                    }
                  }
                } catch (err) {
                  console.warn('Driver enrichment by userId failed:', err);
                }
              }
              
              // Second try: Look up driver by driverId (if userId lookup failed)
              if (!enriched.assignedDriver && driverId) {
                try {
                  const driverRes = await fetch(`${API_ENDPOINTS.DRIVERS}/${driverId}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                  });
                  if (driverRes.ok) {
                    const driverData = await driverRes.json();
                    const d = driverData.driver || driverData.data || driverData;
                    if (d) {
                      enriched.assignedDriver = {
                        id: d.id || d.driverId,
                        name: d.name || d.driverName || (d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : 'Driver'),
                        phone: d.phone,
                        photo: d.photo || d.profilePhoto || d.profileImage,
                        licenseNumber: d.licenseNumber || d.driverLicense,
                        companyName: d.companyName || d.company?.name,
                        company: d.company || (d.companyId ? { id: d.companyId, name: d.companyName } : undefined),
                        assignedVehicle: d.assignedVehicle || d.vehicle,
                        assignedVehicleId: d.assignedVehicleId || d.assignedVehicle?.id || d.vehicle?.id,
                      };
                      
                      // Enrich company from driver
                      if (d.companyId && !enriched.company) {
                        try {
                          console.log(`🔍 [enrichment] Fetching company by companyId: ${d.companyId}`);
                          const companyRes = await fetch(`${API_ENDPOINTS.COMPANIES}/${d.companyId}`, {
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                          });
                          if (companyRes.ok) {
                            const companyData = await companyRes.json();
                            const c = companyData.company || companyData.data || companyData;
                            if (c) {
                              console.log(`✅ [enrichment] Found company:`, {
                                id: c.id || c.companyId,
                                name: c.name || c.companyName,
                              });
                              enriched.company = {
                                id: c.id || c.companyId,
                                name: c.name || c.companyName,
                              };
                            }
                          }
                        } catch (err) {
                          console.warn('Company enrichment failed:', err);
                        }
                      }
                      
                      // Enrich vehicle from driver's assignedVehicleId or assignedVehicleDetails
                      const vehicleId2 = d.assignedVehicleId || d.assignedVehicleDetails;
                      if (vehicleId2 && !enriched.vehicle) {
                        try {
                          console.log(`🔍 [enrichment] Fetching vehicle by assignedVehicleId: ${vehicleId2}`);
                          const vehRes = await fetch(`${API_ENDPOINTS.VEHICLES}/${vehicleId2}`, {
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                          });
                          if (vehRes.ok) {
                            const vehData = await vehRes.json();
                            const v = vehData.vehicle || vehData.data || vehData;
                            if (v && (v.id || v.vehicleId)) {
                              console.log(`✅ [enrichment] Found vehicle:`, {
                                id: v.id || v.vehicleId,
                                registration: v.vehicleRegistration || v.registration,
                                make: v.make || v.vehicleMake,
                                capacity: v.capacity || v.vehicleCapacity,
                              });
                              enriched.vehicle = {
                                id: v.id || v.vehicleId,
                                make: v.make || v.vehicleMake,
                                model: v.model || v.vehicleModel,
                                year: String(v.year || v.vehicleYear || ''),
                                type: v.bodyType || v.type || v.vehicleType,
                                registration: v.vehicleRegistration || v.registration || v.reg,
                                color: v.color || v.vehicleColor,
                                capacity: String(v.capacity || v.vehicleCapacity || ''),
                                photo: v.photo || v.vehiclePhoto || (v.photos && v.photos[0]) || (v.vehicleImagesUrl && v.vehicleImagesUrl[0]),
                                photos: v.photos || v.vehicleImagesUrl || [],
                                companyId: v.companyId,
                                companyName: v.companyName,
                              };
                            } else {
                              console.warn(`⚠️ [enrichment] Vehicle data invalid for ID: ${vehicleId2}`);
                            }
                          } else {
                            console.warn(`⚠️ [enrichment] Vehicle fetch failed with status: ${vehRes.status} for ID: ${vehicleId2}`);
                          }
                        } catch (err) {
                          console.warn('Vehicle enrichment from driver failed:', err);
                        }
                      } else if (!vehicleId2) {
                        console.warn(`⚠️ [enrichment] Driver has no assignedVehicleId or assignedVehicleDetails`);
                      }
                    }
                  }
                } catch (err) {
                  console.warn('Driver enrichment by driverId failed:', err);
                }
              }
            }

            // If vehicle is still missing but we have assignedDriver with assignedVehicle, use it
            if (!enriched.vehicle && enriched.assignedDriver?.assignedVehicle) {
              enriched.vehicle = enriched.assignedDriver.assignedVehicle;
            }
            
            // If vehicle is still missing but we have transporter with assignedVehicle, use it
            if (!enriched.vehicle && enriched.transporter?.assignedVehicle) {
              enriched.vehicle = enriched.transporter.assignedVehicle;
            }

            // Debug: Log what we have after enrichment
            if (b.type === 'instant' || (b as any).bookingMode === 'instant' || ['accepted', 'confirmed', 'assigned'].includes((b.status || '').toLowerCase())) {
              console.log('✅ [enrichment] After enrichment - Booking:', {
                id: enriched.id,
                status: enriched.status,
                hasVehicle: !!enriched.vehicle,
                hasDriver: !!enriched.assignedDriver,
                hasCompany: !!enriched.company,
                vehicle: enriched.vehicle ? {
                  id: enriched.vehicle.id,
                  registration: enriched.vehicle.registration,
                  capacity: enriched.vehicle.capacity,
                  make: enriched.vehicle.make,
                  hasPhoto: !!enriched.vehicle.photo,
                } : null,
                assignedDriver: enriched.assignedDriver ? {
                  id: enriched.assignedDriver.id,
                  name: enriched.assignedDriver.name,
                  companyName: enriched.assignedDriver.companyName,
                } : null,
                company: enriched.company,
              });
            }
            
            return enriched;
          }));

          // If we have a client index for this broker, restrict bookings to broker's clients
          // Also include any booking explicitly tagged with this brokerId in brokerData
          if (clientsIndex) {
            const brokerUid = getAuth().currentUser?.uid;
            // try to get canonical brokerId via clients list
            const anyClient = Object.values(clientsIndex)[0] as any;
            const brokerIdFromClients = anyClient?.brokerId;
            bookings = bookings.filter(b => {
              const isClientOwned = !!(b.client && clientsIndex![b.client.id]);
              const bId = (b as any).brokerData?.brokerId;
              const isBrokerTagged = !!(bId && (bId === brokerUid || (brokerIdFromClients && bId === brokerIdFromClients)));
              return isClientOwned || isBrokerTagged;
            });
          }
        } catch {}
      }
      
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
        bookingData.isConsolidated ? 'consolidated' : (bookingData.type === 'instant' ? 'instant' : 'booking'),
        1 // sequenceNumber - backend will assign proper sequence
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
        'consolidated',
        1 // sequenceNumber - backend will assign proper sequence
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
   * Enhanced to properly extract vehicle, driver, and company data from various backend structures
   * 
   * For instant requests: Users select vehicles, so vehicleId/selectedVehicleId should be populated
   * The backend should return vehicle details, or we fetch them via vehicleId
   * 
   * For accepted bookings: Vehicle is assigned to driver, driver is assigned to company
   * Structure: company -> vehicle (with companyId) -> driver (assigned to vehicle) -> booking
   */
  private normalizeBooking(booking: any): UnifiedBooking {
    // Debug: Log raw booking data to understand structure
    if (booking.type === 'instant' || booking.bookingMode === 'instant') {
      console.log('🔍 [normalizeBooking] Instant request booking data:', {
        id: booking.id || booking.bookingId,
        vehicleId: booking.vehicleId || booking.selectedVehicleId,
        assignedDriverId: booking.assignedDriverId || booking.driverId,
        vehicle: booking.vehicle,
        assignedDriver: booking.assignedDriver,
        driver: booking.driver,
        transporter: booking.transporter,
        companyId: booking.companyId,
        company: booking.company,
      });
    }
    
    // Extract driver/transporter data from multiple possible paths
    const driver = booking.assignedDriver || booking.driver || booking.transporter?.assignedDriver || booking.transporter?.driver;
    const transporter = booking.transporter || {
      id: booking.transporterId || booking.driverId || driver?.id || driver?.driverId,
      name: booking.transporterName || booking.driverName || driver?.name || (driver?.firstName && driver?.lastName ? `${driver?.firstName} ${driver?.lastName}` : driver?.driverName),
      phone: booking.transporterPhone || booking.driverPhone || driver?.phone,
      profilePhoto: booking.transporterPhoto || booking.driverPhoto || driver?.photo || driver?.profilePhoto || driver?.profileImage,
      rating: booking.transporterRating || booking.driverRating || driver?.rating,
      status: booking.transporterStatus || booking.driverStatus || driver?.status,
      // Company information from driver or transporter
      companyName: driver?.companyName || driver?.company?.name || booking.transporter?.companyName || booking.transporter?.company?.name || booking.companyName,
      company: driver?.company || booking.transporter?.company || (driver?.companyId || booking.companyId ? { id: driver?.companyId || booking.companyId, name: driver?.companyName || booking.companyName } : undefined),
      // Vehicle from driver's assigned vehicle
      assignedVehicle: driver?.assignedVehicle || driver?.vehicle || booking.transporter?.assignedVehicle || booking.transporter?.vehicle,
    };

    // Extract vehicle data from multiple possible paths
    // Priority: booking.vehicle > driver.assignedVehicle > transporter.assignedVehicle > booking.vehicleId lookup
    const assignedVehicle = 
      booking.vehicle || 
      driver?.assignedVehicle || 
      driver?.vehicle ||
      transporter?.assignedVehicle || 
      transporter?.vehicle ||
      booking.assignedVehicle ||
      // For instant requests, vehicle might be selected but not yet assigned
      (booking.vehicleId || booking.selectedVehicleId ? {
        id: booking.vehicleId || booking.selectedVehicleId,
        make: booking.vehicleMake,
        model: booking.vehicleModel,
        year: booking.vehicleYear,
        type: booking.vehicleType,
        registration: booking.vehicleRegistration,
        color: booking.vehicleColor,
        capacity: booking.vehicleCapacity,
        photos: booking.vehiclePhotos || booking.vehicleImagesUrl,
      } : undefined);

    // Build normalized booking with all extracted data
    const normalized: any = {
      id: booking.id || booking.bookingId || booking._id,
      // Preserve raw fields used by display ID logic
      bookingId: booking.bookingId || getDisplayBookingId(booking) || booking.id,
      // @ts-ignore - allow dynamic fields for display functions
      readableId: booking.readableId,
      // @ts-ignore
      bookingType: booking.bookingType || booking.type,
      // @ts-ignore
      bookingMode: booking.bookingMode || booking.mode,
      type: this.normalizeType(booking.type),
      status: this.normalizeStatus(booking.status),
      fromLocation: this.normalizeLocation(booking.fromLocation || booking.pickupLocation),
      toLocation: this.normalizeLocation(booking.toLocation || booking.deliveryLocation),
      productType: booking.productType || booking.cargoDetails || booking.cargoType || 'General Cargo',
      weight: (booking.weightKg != null ? `${booking.weightKg}kg` : (booking.weight || booking.cargoWeight ? `${booking.weight || booking.cargoWeight}` : 'N/A')),
      urgency: this.normalizeUrgency(booking.urgency),
      createdAt: booking.createdAt || booking.created_at || booking.created_at_iso || new Date().toISOString(),
      updatedAt: booking.updatedAt || booking.updated_at || new Date().toISOString(),
      estimatedValue: booking.estimatedValue || booking.price || booking.cost,
      description: booking.description || booking.cargoDescription,
      price: booking.price || booking.cost || booking.estimatedValue,
      
      client: {
        id: booking.clientId || booking.userId || booking.shipperId || booking.brokerData?.clientId,
        name: booking.clientName || booking.shipperName || booking.userName || booking.brokerData?.clientName || 'Client',
        company: booking.clientCompany || booking.companyName,
        phone: booking.clientPhone || booking.phone || booking.contactPhone,
        email: booking.clientEmail || booking.email || booking.contactEmail,
        type: this.normalizeClientType(booking.clientType || booking.userType),
      },
      
      // Transporter with company and driver info
      transporter: (transporter && (transporter.id || transporter.name)) ? {
        id: transporter.id,
        name: transporter.name,
        phone: transporter.phone,
        profilePhoto: transporter.profilePhoto,
        rating: transporter.rating,
        experience: transporter.experience,
        availability: transporter.availability,
        tripsCompleted: transporter.tripsCompleted,
        status: transporter.status,
        // Include company info in transporter
        companyName: transporter.companyName,
        company: transporter.company,
        // Include assigned vehicle in transporter
        assignedVehicle: transporter.assignedVehicle,
        vehicle: transporter.assignedVehicle,
      } : undefined,
      
      // Driver information (separate from transporter for company drivers)
      assignedDriver: driver ? {
        id: driver.id || driver.driverId,
        name: driver.name || driver.driverName || (driver?.firstName && driver?.lastName ? `${driver.firstName} ${driver.lastName}` : 'Driver'),
        phone: driver.phone,
        photo: driver.photo || driver.profilePhoto || driver.profileImage,
        licenseNumber: driver.licenseNumber || driver.driverLicense,
        companyName: driver.companyName || driver.company?.name,
        company: driver.company || (driver.companyId ? { id: driver.companyId, name: driver.companyName } : undefined),
        assignedVehicle: driver.assignedVehicle || driver.vehicle,
        assignedVehicleId: driver.assignedVehicleId || driver.assignedVehicleDetails || driver.assignedVehicle?.id || driver.vehicle?.id,
      } : undefined,
      
      // Vehicle with all details including photos
      vehicle: assignedVehicle ? {
        id: assignedVehicle.id || assignedVehicle.vehicleId || booking.vehicleId || booking.selectedVehicleId,
        make: assignedVehicle.make || assignedVehicle.vehicleMake || booking.vehicleMake,
        model: assignedVehicle.model || assignedVehicle.vehicleModel || booking.vehicleModel,
        year: assignedVehicle.year || assignedVehicle.vehicleYear || booking.vehicleYear,
        type: assignedVehicle.type || assignedVehicle.bodyType || assignedVehicle.vehicleType || booking.vehicleType,
        registration: assignedVehicle.registration || assignedVehicle.vehicleRegistration || assignedVehicle.reg || booking.vehicleRegistration,
        color: assignedVehicle.color || assignedVehicle.vehicleColor || booking.vehicleColor,
        capacity: assignedVehicle.capacity || assignedVehicle.vehicleCapacity || booking.vehicleCapacity,
        // Photos - check multiple possible paths
        photo: assignedVehicle.photo || assignedVehicle.vehiclePhoto || (assignedVehicle.photos && assignedVehicle.photos[0]) || (assignedVehicle.vehicleImagesUrl && assignedVehicle.vehicleImagesUrl[0]) || booking.vehiclePhotos?.[0] || booking.vehicleImagesUrl?.[0],
        photos: assignedVehicle.photos || assignedVehicle.vehicleImagesUrl || booking.vehiclePhotos || booking.vehicleImagesUrl || [],
        // Company info from vehicle
        companyId: assignedVehicle.companyId || driver?.companyId || transporter?.company?.id,
        companyName: assignedVehicle.companyName || driver?.companyName || driver?.company?.name || transporter?.companyName || transporter?.company?.name,
      } : undefined,
      
      // Company information (for company drivers)
      company: transporter?.company || driver?.company || (transporter?.companyId || driver?.companyId ? {
        id: transporter?.companyId || driver?.companyId,
        name: transporter?.companyName || driver?.companyName,
      } : undefined),
      
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
      
      // Preserve raw booking data for debugging and additional field access
      // @ts-ignore
      _raw: booking,
    };

    return normalized;
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
