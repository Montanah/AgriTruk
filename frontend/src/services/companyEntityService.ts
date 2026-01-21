// Company Entity Management Service
// Handles the complex relationships between companies, drivers, and vehicles
// Ensures data consistency and provides optimized queries

import { apiRequest } from '../utils/api';
import { API_ENDPOINTS } from '../constants/api';

export interface CompanyEntity {
  companyId: string;
  companyName: string;
  companyEmail: string;
  companyContact: string;
  companyAddress: string;
  companyLogo?: string;
  status: 'pending' | 'approved' | 'rejected';
  subscriptionStatus?: {
    plan: string;
    status: 'active' | 'inactive' | 'expired';
    expiryDate: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VehicleEntity {
  vehicleId: string;
  companyId: string;
  type: string;
  make: string;
  model: string;
  reg: string;
  bodyType: string;
  year: number;
  color: string;
  capacity: number;
  driveType: string;
  refrigeration: boolean;
  humidityControl: boolean;
  specialCargo: boolean;
  features: string[];
  insurance?: string;
  photos: string[];
  assignedDriverId?: string;
  assignedDriver?: DriverEntity;
  status: 'pending' | 'approved' | 'rejected';
  availability: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverEntity {
  driverId: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  idDoc?: string;
  idExpiryDate?: string;
  license?: string;
  driverLicenseExpiryDate?: string;
  status: 'pending' | 'approved' | 'rejected';
  availability: boolean;
  assignedVehicleId?: string;
  assignedVehicle?: VehicleEntity;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyFleetData {
  company: CompanyEntity;
  vehicles: VehicleEntity[];
  drivers: DriverEntity[];
  stats: {
    totalVehicles: number;
    activeVehicles: number;
    totalDrivers: number;
    activeDrivers: number;
    assignedDrivers: number;
    unassignedVehicles: number;
  };
}

class CompanyEntityService {
  private cache: Map<string, CompanyFleetData> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get comprehensive company fleet data with relationships
   * This is the main method that should be used for company management
   */
  async getCompanyFleetData(companyId: string, forceRefresh: boolean = false): Promise<CompanyFleetData> {
    const cacheKey = `fleet_${companyId}`;
    const now = Date.now();

    // Check cache first
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (now < expiry) {
        console.log('📦 Using cached fleet data for company:', companyId);
        return this.cache.get(cacheKey)!;
      }
    }

    console.log('🔄 Fetching fresh fleet data for company:', companyId);

    try {
      // Fetch all data in parallel for better performance
      const [companyData, vehiclesData, driversData] = await Promise.all([
        this.getCompanyProfile(companyId),
        this.getCompanyVehicles(companyId),
        this.getCompanyDrivers(companyId)
      ]);

      // Build relationships
      const vehicles = this.buildVehicleRelationships(vehiclesData, driversData);
      const drivers = this.buildDriverRelationships(driversData, vehicles);

      // Calculate stats
      const stats = this.calculateFleetStats(vehicles, drivers);

      const fleetData: CompanyFleetData = {
        company: companyData,
        vehicles,
        drivers,
        stats
      };

      // Cache the result
      this.cache.set(cacheKey, fleetData);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

      return fleetData;
    } catch (error) {
      console.error('Error fetching company fleet data:', error);
      throw error;
    }
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(companyId: string): Promise<CompanyEntity> {
    try {
      const response = await apiRequest(`/companies/${companyId}`);
      return response;
    } catch (error) {
      console.error('Error fetching company profile:', error);
      throw error;
    }
  }

  /**
   * Get all vehicles for a company
   */
  async getCompanyVehicles(companyId: string): Promise<VehicleEntity[]> {
    try {
      const response = await apiRequest(`/companies/${companyId}/vehicles`);
      return response.vehicles || [];
    } catch (error) {
      console.error('Error fetching company vehicles:', error);
      throw error;
    }
  }

  /**
   * Get all drivers for a company
   */
  async getCompanyDrivers(companyId: string): Promise<DriverEntity[]> {
    try {
      const response = await apiRequest(`/companies/${companyId}/drivers`);
      return response.drivers || [];
    } catch (error) {
      console.error('Error fetching company drivers:', error);
      throw error;
    }
  }

  /**
   * Create a new vehicle for a company
   */
  async createVehicle(companyId: string, vehicleData: Partial<VehicleEntity>): Promise<VehicleEntity> {
    try {
      const response = await apiRequest(`/companies/${companyId}/vehicles`, {
        method: 'POST',
        body: vehicleData
      });

      // Invalidate cache
      this.invalidateCache(companyId);

      return response.vehicle;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  /**
   * Create a new driver for a company
   */
  async createDriver(companyId: string, driverData: Partial<DriverEntity>): Promise<DriverEntity> {
    try {
      const response = await apiRequest(`/companies/${companyId}/drivers`, {
        method: 'POST',
        body: driverData
      });

      // Invalidate cache
      this.invalidateCache(companyId);

      return response.driver;
    } catch (error) {
      console.error('Error creating driver:', error);
      throw error;
    }
  }

  /**
   * Assign a driver to a vehicle
   */
  async assignDriverToVehicle(companyId: string, vehicleId: string, driverId: string): Promise<void> {
    try {
      // Update vehicle
      await apiRequest(`/companies/${companyId}/vehicles/${vehicleId}`, {
        method: 'PATCH',
        body: { assignedDriverId: driverId }
      });

      // Update driver
      await apiRequest(`/companies/${companyId}/drivers/${driverId}`, {
        method: 'PATCH',
        body: { assignedVehicleId: vehicleId }
      });

      // Invalidate cache
      this.invalidateCache(companyId);
    } catch (error) {
      console.error('Error assigning driver to vehicle:', error);
      throw error;
    }
  }

  /**
   * Unassign a driver from a vehicle
   */
  async unassignDriverFromVehicle(companyId: string, vehicleId: string, driverId: string): Promise<void> {
    try {
      // Update vehicle
      await apiRequest(`/companies/${companyId}/vehicles/${vehicleId}`, {
        method: 'PATCH',
        body: { assignedDriverId: null }
      });

      // Update driver
      await apiRequest(`/companies/${companyId}/drivers/${driverId}`, {
        method: 'PATCH',
        body: { assignedVehicleId: null }
      });

      // Invalidate cache
      this.invalidateCache(companyId);
    } catch (error) {
      console.error('Error unassigning driver from vehicle:', error);
      throw error;
    }
  }

  /**
   * Build vehicle relationships with assigned drivers
   */
  private buildVehicleRelationships(vehicles: VehicleEntity[], drivers: DriverEntity[]): VehicleEntity[] {
    return vehicles.map(vehicle => {
      if (vehicle.assignedDriverId) {
        const assignedDriver = drivers.find(driver => driver.driverId === vehicle.assignedDriverId);
        return { ...vehicle, assignedDriver };
      }
      return vehicle;
    });
  }

  /**
   * Build driver relationships with assigned vehicles
   */
  private buildDriverRelationships(drivers: DriverEntity[], vehicles: VehicleEntity[]): DriverEntity[] {
    return drivers.map(driver => {
      if (driver.assignedVehicleId) {
        const assignedVehicle = vehicles.find(vehicle => vehicle.vehicleId === driver.assignedVehicleId);
        return { ...driver, assignedVehicle };
      }
      return driver;
    });
  }

  /**
   * Calculate fleet statistics
   */
  private calculateFleetStats(vehicles: VehicleEntity[], drivers: DriverEntity[]) {
    return {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter(v => v.status === 'approved' && v.active).length,
      totalDrivers: drivers.length,
      activeDrivers: drivers.filter(d => d.status === 'approved' && d.availability).length,
      assignedDrivers: drivers.filter(d => d.assignedVehicleId).length,
      unassignedVehicles: vehicles.filter(v => !v.assignedDriverId).length
    };
  }

  /**
   * Invalidate cache for a company
   */
  private invalidateCache(companyId: string): void {
    const cacheKey = `fleet_${companyId}`;
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
    console.log('🗑️ Cache invalidated for company:', companyId);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('🗑️ All cache cleared');
  }
}

export default new CompanyEntityService();



