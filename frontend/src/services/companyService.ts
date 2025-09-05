import { API_ENDPOINTS } from '../constants/api';

export interface Company {
  id: string;
  name: string;
  registration: string;
  contact: string;
  logo?: string;
  status: 'pending' | 'approved' | 'rejected';
  transporterId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  companyId: string;
  make: string;
  model: string;
  year: number;
  registration: string;
  capacity: number;
  type: string;
  status: 'available' | 'assigned' | 'maintenance';
  assignedDriverId?: string;
  documents?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: 'pending' | 'approved' | 'rejected';
  assignedVehicleId?: string;
  documents?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyResponse {
  success: boolean;
  message: string;
  data?: Company | Company[];
}

export interface VehicleResponse {
  success: boolean;
  message: string;
  data?: Vehicle | Vehicle[];
}

export interface DriverResponse {
  success: boolean;
  message: string;
  data?: Driver | Driver[];
}

class CompanyService {
  private async getAuthToken(): Promise<string> {
    const { getAuth } = await import('firebase/auth');
    const { auth } = await import('../firebaseConfig');
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  /**
   * Create a new company
   */
  async createCompany(
    name: string,
    registration: string,
    contact: string,
    logo?: File
  ): Promise<CompanyResponse> {
    try {
      const token = await this.getAuthToken();

      const formData = new FormData();
      formData.append('name', name);
      formData.append('registration', registration);
      formData.append('contact', contact);
      if (logo) {
        formData.append('logo', logo);
      }

      const response = await fetch(API_ENDPOINTS.COMPANIES, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create company');
      }

      return { success: true, message: 'Company created successfully', data };
    } catch (error) {
      console.error('Error creating company:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get company by ID
   */
  async getCompany(companyId: string): Promise<CompanyResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get company');
      }

      return { success: true, message: 'Company retrieved successfully', data };
    } catch (error) {
      console.error('Error getting company:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Update company
   */
  async updateCompany(
    companyId: string,
    updates: Partial<Company>
  ): Promise<CompanyResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update company');
      }

      return { success: true, message: 'Company updated successfully', data };
    } catch (error) {
      console.error('Error updating company:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get companies by transporter
   */
  async getCompaniesByTransporter(transporterId: string): Promise<CompanyResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${transporterId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get companies');
      }

      return { success: true, message: 'Companies retrieved successfully', data };
    } catch (error) {
      console.error('Error getting companies:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Create a new vehicle for a company
   */
  async createVehicle(
    companyId: string,
    vehicleData: Partial<Vehicle>
  ): Promise<VehicleResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyId}/vehicles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create vehicle');
      }

      return { success: true, message: 'Vehicle created successfully', data };
    } catch (error) {
      console.error('Error creating vehicle:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all vehicles for a company
   */
  async getCompanyVehicles(companyId: string): Promise<VehicleResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyId}/vehicles`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get vehicles');
      }

      return { success: true, message: 'Vehicles retrieved successfully', data };
    } catch (error) {
      console.error('Error getting vehicles:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Create a driver for a company
   */
  async createDriver(
    companyId: string,
    driverData: Partial<Driver>
  ): Promise<DriverResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyId}/drivers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(driverData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create driver');
      }

      return { success: true, message: 'Driver created successfully', data };
    } catch (error) {
      console.error('Error creating driver:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all drivers for a company
   */
  async getCompanyDrivers(companyId: string): Promise<DriverResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyId}/drivers`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get drivers');
      }

      return { success: true, message: 'Drivers retrieved successfully', data };
    } catch (error) {
      console.error('Error getting drivers:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Update vehicle assignment to driver
   */
  async updateVehicleAssignment(
    companyId: string,
    vehicleId: string,
    driverId?: string
  ): Promise<VehicleResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/${companyId}/vehicleStatus/${vehicleId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignedDriverId: driverId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update vehicle assignment');
      }

      return { success: true, message: 'Vehicle assignment updated successfully', data };
    } catch (error) {
      console.error('Error updating vehicle assignment:', error);
      return { success: false, message: error.message };
    }
  }
}

export default new CompanyService();
