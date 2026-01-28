// Company Driver Service
// Handles authentication and profile management for company drivers

import { apiRequest } from '../utils/api';
import { API_ENDPOINTS } from '../constants/api';

export interface CompanyDriver {
  driverId: string;
  companyId: string;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage?: string;
  driverLicense?: string;
  driverLicenseExpiryDate?: string;
  idNumber?: string;
  idExpiryDate?: string;
  status: 'pending' | 'approved' | 'rejected';
  assignedVehicleId?: string;
  assignedVehicle?: {
    vehicleId: string;
    registration: string;
    make: string;
    model: string;
    type: string;
  };
  isDefaultPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyInfo {
  companyId: string;
  companyName: string;
  companyRegistration: string;
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
}

class CompanyDriverService {
  private currentDriver: CompanyDriver | null = null;
  private companyInfo: CompanyInfo | null = null;

  // Get current driver profile
  async getCurrentDriver(): Promise<CompanyDriver | null> {
    try {
      const response = await apiRequest('/drivers/profile');
      this.currentDriver = response.driver;
      return this.currentDriver;
    } catch (error) {
      console.error('Error fetching driver profile:', error);
      return null;
    }
  }

  // Get company information
  async getCompanyInfo(): Promise<CompanyInfo | null> {
    try {
      const response = await apiRequest('/companies/profile');
      this.companyInfo = response.company;
      return this.companyInfo;
    } catch (error) {
      console.error('Error fetching company info:', error);
      return null;
    }
  }

  // Update driver profile (limited fields)
  async updateProfile(updates: Partial<CompanyDriver>): Promise<CompanyDriver> {
    try {
      const allowedFields = [
        'firstName',
        'lastName',
        'phone',
        'profileImage',
        'driverLicense',
        'driverLicenseExpiryDate',
        'idNumber',
        'idExpiryDate'
      ];

      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {} as any);

      const response = await apiRequest('/drivers/profile', {
        method: 'PUT',
        body: JSON.stringify(filteredUpdates)
      });

      this.currentDriver = { ...this.currentDriver, ...response.driver };
      return this.currentDriver!;
    } catch (error) {
      console.error('Error updating driver profile:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiRequest('/drivers/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Get assigned vehicle details
  async getAssignedVehicle(): Promise<any> {
    try {
      if (!this.currentDriver?.assignedVehicleId) {
        return null;
      }

      const response = await apiRequest(`/vehicles/${this.currentDriver.assignedVehicleId}`);
      return response.vehicle;
    } catch (error) {
      console.error('Error fetching assigned vehicle:', error);
      return null;
    }
  }

  // Get driver's jobs/bookings
  async getDriverJobs(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (options.status) queryParams.append('status', options.status);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());

      const response = await apiRequest(`/drivers/jobs?${queryParams.toString()}`);
      return response.jobs || [];
    } catch (error) {
      console.error('Error fetching driver jobs:', error);
      return [];
    }
  }

  // Update job status
  async updateJobStatus(jobId: string, status: string, notes?: string): Promise<void> {
    try {
      await apiRequest(`/drivers/jobs/${jobId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          notes
        })
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  }

  // Get company subscription details
  async getCompanySubscription(): Promise<any> {
    try {
      const response = await apiRequest('/companies/subscription');
      return response.subscription;
    } catch (error) {
      console.error('Error fetching company subscription:', error);
      return null;
    }
  }

  // Check if driver has permission for specific action
  hasPermission(action: string): boolean {
    if (!this.currentDriver) return false;

    // Company drivers have limited permissions
    const allowedActions = [
      'view_profile',
      'update_profile',
      'view_jobs',
      'update_job_status',
      'view_vehicle',
      'change_password'
    ];

    return allowedActions.includes(action);
  }

  // Get driver's current status
  getDriverStatus(): string {
    return this.currentDriver?.status || 'unknown';
  }

  // Check if driver is approved and active
  isActive(): boolean {
    return this.currentDriver?.status === 'approved';
  }

  // Get company name
  getCompanyName(): string {
    return this.companyInfo?.companyName || 'Unknown Company';
  }

  // Clear cached data
  clearCache(): void {
    this.currentDriver = null;
    this.companyInfo = null;
  }
}

export default new CompanyDriverService();
