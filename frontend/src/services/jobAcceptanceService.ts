import { API_ENDPOINTS } from '../constants/api';
import { chatService } from './chatService';
import { enhancedNotificationService } from './enhancedNotificationService';
import { transporterDetailsService, TransporterDetails } from './transporterDetailsService';

export interface JobAcceptanceData {
  jobId: string;
  transporterId: string;
  clientId: string;
  jobType: 'booking' | 'instant' | 'consolidated';
  ownerType: 'shipper' | 'business' | 'broker';
  transporterDetails: TransporterDetails;
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
  cargoDetails: {
    type: string;
    weight: number;
    volume?: number;
    description: string;
  };
  pricing: {
    basePrice: number;
    totalPrice: number;
    currency: string;
  };
}

class JobAcceptanceService {
  /**
   * Accept a job and handle all related notifications and chat creation
   */
  async acceptJob(jobData: JobAcceptanceData): Promise<{
    success: boolean;
    chatRoomId?: string;
    error?: string;
  }> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();

      // Step 1: Accept the job via API
      const acceptResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/${jobData.jobId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transporterId: jobData.transporterId,
          transporterDetails: jobData.transporterDetails,
        }),
      });

      if (!acceptResponse.ok) {
        const errorData = await acceptResponse.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Failed to accept job: ${errorData.message || 'Unknown error'}`);
      }

      // Step 2: Create chat room for communication
      let chatRoomId: string | undefined;
      try {
        const chatRoom = await chatService.getOrCreateChatRoom(
          jobData.jobId,
          jobData.transporterId,
          jobData.clientId
        );
        chatRoomId = chatRoom.id;
        console.log('Chat room created successfully:', chatRoomId);
      } catch (chatError) {
        console.warn('Chat room creation failed:', chatError);
        // Don't fail the job acceptance if chat creation fails
      }

      // Step 3: Send notifications to the job owner
      await this.sendJobAcceptanceNotifications(jobData, chatRoomId);

      // Step 4: Add job to transporter's management
      await this.addJobToTransporterManagement(jobData);

      return {
        success: true,
        chatRoomId,
      };
    } catch (error) {
      console.error('Error accepting job:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send notifications to job owner about transporter assignment
   */
  private async sendJobAcceptanceNotifications(
    jobData: JobAcceptanceData, 
    chatRoomId?: string
  ): Promise<void> {
    try {
      const transporter = jobData.transporterDetails;
      const isCompanyDriver = transporter.isCompanyDriver;
      
      // Prepare notification data
      const notificationData = {
        jobId: jobData.jobId,
        transporterName: transporter.name,
        transporterPhone: transporter.phone,
        transporterEmail: transporter.email,
        transporterRating: transporter.rating,
        vehicleDetails: transporter.vehicle ? {
          make: transporter.vehicle.make,
          model: transporter.vehicle.model,
          registration: transporter.vehicle.registration,
          capacity: transporter.vehicle.capacity,
          driveType: transporter.vehicle.driveType,
          color: transporter.vehicle.color,
          year: transporter.vehicle.year,
        } : null,
        companyDetails: isCompanyDriver && transporter.company ? {
          name: transporter.company.name,
          phone: transporter.company.phone,
          email: transporter.company.email,
        } : null,
        pickupLocation: jobData.pickupLocation.address,
        deliveryLocation: jobData.deliveryLocation.address,
        cargoType: jobData.cargoDetails.type,
        weight: jobData.cargoDetails.weight,
        estimatedPrice: jobData.pricing.totalPrice,
        distance: transporter.distance,
        estimatedArrival: transporter.estimatedArrival,
        chatRoomId,
      };

      // Send notification based on owner type
      const notificationType = this.getNotificationType(jobData.ownerType, jobData.jobType);
      
      await enhancedNotificationService.sendNotification(
        notificationType,
        jobData.clientId,
        notificationData
      );

      console.log('Job acceptance notification sent successfully');
    } catch (error) {
      console.error('Error sending job acceptance notifications:', error);
      // Don't throw error - notification failure shouldn't break job acceptance
    }
  }

  /**
   * Add job to transporter's management system
   */
  private async addJobToTransporterManagement(jobData: JobAcceptanceData): Promise<void> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();

      const response = await fetch(`${API_ENDPOINTS.TRANSPORTERS}/${jobData.transporterId}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobData.jobId,
          jobType: jobData.jobType,
          clientId: jobData.clientId,
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
          pickupLocation: jobData.pickupLocation,
          deliveryLocation: jobData.deliveryLocation,
          cargoDetails: jobData.cargoDetails,
          pricing: jobData.pricing,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to add job to transporter management');
      } else {
        console.log('Job added to transporter management successfully');
      }
    } catch (error) {
      console.error('Error adding job to transporter management:', error);
      // Don't throw error - this shouldn't break job acceptance
    }
  }

  /**
   * Get appropriate notification type based on owner type and job type
   */
  private getNotificationType(ownerType: string, jobType: string): string {
    if (ownerType === 'broker') {
      return jobType === 'consolidated' ? 'consolidated_booking_accepted' : 'booking_accepted';
    } else if (ownerType === 'business') {
      return jobType === 'consolidated' ? 'consolidated_request_accepted' : 'instant_request_accepted';
    } else {
      return jobType === 'booking' ? 'booking_accepted' : 'instant_request_accepted';
    }
  }

  /**
   * Find transporters for instant requests
   */
  async findTransporterForInstantRequest(request: {
    pickupLocation: { latitude: number; longitude: number; address: string };
    deliveryLocation: { latitude: number; longitude: number; address: string };
    cargoType: string;
    weight: number;
    volume?: number;
    specialRequirements?: string[];
    maxDistance?: number;
    maxPrice?: number;
  }): Promise<TransporterDetails[]> {
    try {
      return await transporterDetailsService.findTransporterForJob({
        pickupLocation: request.pickupLocation,
        deliveryLocation: request.deliveryLocation,
        cargoType: request.cargoType,
        weight: request.weight,
        volume: request.volume,
        specialRequirements: request.specialRequirements,
        maxDistance: request.maxDistance || 50, // Default 50km radius
        maxPrice: request.maxPrice,
      });
    } catch (error) {
      console.error('Error finding transporters for instant request:', error);
      throw error;
    }
  }

  /**
   * Select transporter for instant request
   */
  async selectTransporterForInstantRequest(
    requestId: string,
    transporterId: string,
    clientId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();

      // Get transporter details
      const transporterDetails = await transporterDetailsService.getTransporterDetails(transporterId);

      // Accept the instant request
      const response = await fetch(`${API_ENDPOINTS.REQUESTS}/${requestId}/assign-transporter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transporterId,
          transporterDetails,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Failed to assign transporter: ${errorData.message || 'Unknown error'}`);
      }

      // Create chat room
      try {
        await chatService.getOrCreateChatRoom(requestId, transporterId, clientId);
      } catch (chatError) {
        console.warn('Chat room creation failed:', chatError);
      }

      // Send notifications
      try {
        await enhancedNotificationService.sendNotification(
          'instant_request_assigned',
          transporterId,
          {
            requestId,
            clientId,
            transporterName: transporterDetails.name,
          }
        );
      } catch (notificationError) {
        console.warn('Notification sending failed:', notificationError);
      }

      return { success: true };
    } catch (error) {
      console.error('Error selecting transporter for instant request:', error);
      return { success: false, error: error.message };
    }
  }
}

export const jobAcceptanceService = new JobAcceptanceService();
