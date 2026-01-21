import { API_ENDPOINTS } from '../constants/api';

export interface TransporterDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  rating: number;
  totalJobs: number;
  isCompanyDriver: boolean;
  company?: {
    id: string;
    name: string;
    logo?: string;
    phone: string;
    email: string;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    registration: string;
    capacity: number;
    driveType: string;
    bodyType: string;
    photos: string[];
    year: number;
    color: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  distance?: number; // in km
  estimatedArrival?: number; // in minutes
}

export interface FindTransporterRequest {
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  cargoType: string;
  weight: number;
  volume?: number;
  specialRequirements?: string[];
  preferredVehicleTypes?: string[];
  maxDistance?: number; // in km
  maxPrice?: number;
}

class TransporterDetailsService {
  private baseUrl = API_ENDPOINTS.TRANSPORTERS;

  /**
   * Get detailed transporter information including vehicle and company details
   */
  async getTransporterDetails(transporterId: string): Promise<TransporterDetails> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();

      // First try to get individual transporter details
      try {
        const response = await fetch(`${this.baseUrl}/${transporterId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          return result.data;
        }
      } catch (individualError) {
        console.log('Individual transporter not found, trying company lookup...');
      }

      // If individual transporter not found, try to get company details
      try {
        const companyResponse = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${transporterId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (companyResponse.ok) {
          const companyResult = await companyResponse.json();
          const companies = companyResult.data || companyResult;
          
          // Get the first company (there should only be one for a transporter)
          const company = Array.isArray(companies) ? companies[0] : companies;
          
          if (company) {
            // Convert company data to transporter details format
            return {
              id: transporterId,
              name: company.name || 'Company Transporter',
              email: company.email || '',
              phone: company.phone || '',
              companyName: company.name,
              companyId: company.id,
              vehicles: company.vehicles || [],
              rating: company.rating || 0,
              totalJobs: company.totalJobs || 0,
              isCompanyTransporter: true
            };
          }
        }
      } catch (companyError) {
        console.log('Company transporter not found either');
      }

      throw new Error('Transporter not found in individual or company collections');
    } catch (error) {
      console.error('Error fetching transporter details:', error);
      throw error;
    }
  }

  /**
   * Find appropriate transporters for a job
   */
  async findTransporterForJob(request: FindTransporterRequest): Promise<TransporterDetails[]> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();

      const response = await fetch(`${this.baseUrl}/available/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to find transporters: ${response.statusText}`);
      }

      const result = await response.json();
      return result.transporters || [];
    } catch (error) {
      console.error('Error finding transporters:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Estimate arrival time based on distance and traffic conditions
   */
  estimateArrivalTime(distance: number, isUrban: boolean = true): number {
    // Average speeds: Urban: 30 km/h, Rural: 60 km/h
    const averageSpeed = isUrban ? 30 : 60;
    const timeInHours = distance / averageSpeed;
    return Math.round(timeInHours * 60); // Convert to minutes
  }

  /**
   * Format distance for display
   */
  formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance}km`;
  }

  /**
   * Format estimated arrival time
   */
  formatArrivalTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

export const transporterDetailsService = new TransporterDetailsService();
