import { API_ENDPOINTS } from '../constants/api';
import { apiRequest } from '../utils/api';

export interface CompanyRegistrationStatus {
  registrationRequired: boolean;
  registrationProvided: boolean;
  completedTrips: number;
  tripsThreshold: number;
  registrationNumber?: string;
  companyId?: string;
  message?: string;
}

class CompanyRegistrationService {
  /**
   * Check if company registration is required based on completed trips
   * Registration becomes mandatory after 5 completed trips
   */
  async checkRegistrationRequirement(companyId?: string): Promise<CompanyRegistrationStatus> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      
      // If companyId is provided, use it; otherwise fetch from user
      let targetCompanyId = companyId;
      if (!targetCompanyId) {
        // Fetch company ID from user's company profile
        const companyResponse = await fetch(`${API_ENDPOINTS.COMPANIES}/transporter/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          if (companyData && companyData.length > 0) {
            targetCompanyId = companyData[0].companyId || companyData[0].id;
          }
        }
      }

      if (!targetCompanyId) {
        // No company found - return default status
        return {
          registrationRequired: false,
          registrationProvided: false,
          completedTrips: 0,
          tripsThreshold: 5,
          message: 'Company profile not found',
        };
      }

      // Check registration status from backend
      const response = await fetch(`${API_ENDPOINTS.COMPANIES}/${targetCompanyId}/registration-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          registrationRequired: data.registrationRequired || false,
          registrationProvided: data.registrationProvided || false,
          completedTrips: data.completedTrips || 0,
          tripsThreshold: data.tripsThreshold || 5,
          registrationNumber: data.registrationNumber,
          companyId: targetCompanyId,
          message: data.message,
        };
      } else {
        // Fallback: assume registration not required if endpoint doesn't exist yet
        console.warn('Registration status endpoint not available, using fallback');
        return {
          registrationRequired: false,
          registrationProvided: false,
          completedTrips: 0,
          tripsThreshold: 5,
          companyId: targetCompanyId,
        };
      }
    } catch (error) {
      console.error('Error checking registration requirement:', error);
      // Return safe default - don't block users if service fails
      return {
        registrationRequired: false,
        registrationProvided: false,
        completedTrips: 0,
        tripsThreshold: 5,
        message: 'Unable to check registration status',
      };
    }
  }

  /**
   * Check if services should be blocked for a driver
   * Services are blocked if registration is required but not provided
   */
  async shouldBlockServices(companyId?: string): Promise<boolean> {
    const status = await this.checkRegistrationRequirement(companyId);
    return status.registrationRequired && !status.registrationProvided;
  }

  /**
   * Get registration requirement message for display
   */
  getRequirementMessage(status: CompanyRegistrationStatus): string {
    if (!status.registrationRequired) {
      return '';
    }

    if (status.registrationProvided) {
      return 'Registration number verified. Services are active.';
    }

    const tripsRemaining = Math.max(0, status.tripsThreshold - status.completedTrips);
    
    if (tripsRemaining > 0) {
      return `Registration required after ${tripsRemaining} more completed trip${tripsRemaining > 1 ? 's' : ''}.`;
    }

    return 'Registration number is required to continue using services. Please contact your company administrator to update the registration information.';
  }
}

const companyRegistrationService = new CompanyRegistrationService();
export default companyRegistrationService;
