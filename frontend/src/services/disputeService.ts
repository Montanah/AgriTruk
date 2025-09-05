import { API_ENDPOINTS } from '../constants/api';

export interface Dispute {
  id: string;
  bookingId: string;
  openedBy: string;
  openedByType: 'user' | 'broker' | 'transporter';
  disputeType: 'payment' | 'service' | 'damage' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeResponse {
  success: boolean;
  message: string;
  data?: Dispute | Dispute[];
}

class DisputeService {
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
   * Create a new dispute
   */
  async createDispute(
    bookingId: string,
    disputeType: 'payment' | 'service' | 'damage' | 'other',
    description: string
  ): Promise<DisputeResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.DISPUTES, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          disputeType,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create dispute');
      }

      return { success: true, message: 'Dispute created successfully', data };
    } catch (error) {
      console.error('Error creating dispute:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get dispute by ID
   */
  async getDispute(disputeId: string): Promise<DisputeResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/${disputeId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get dispute');
      }

      return { success: true, message: 'Dispute retrieved successfully', data };
    } catch (error) {
      console.error('Error getting dispute:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Update dispute
   */
  async updateDispute(
    disputeId: string,
    updates: Partial<Dispute>
  ): Promise<DisputeResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/${disputeId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update dispute');
      }

      return { success: true, message: 'Dispute updated successfully', data };
    } catch (error) {
      console.error('Error updating dispute:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get disputes by booking ID
   */
  async getDisputesByBooking(bookingId: string): Promise<DisputeResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/booking/${bookingId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get disputes');
      }

      return { success: true, message: 'Disputes retrieved successfully', data };
    } catch (error) {
      console.error('Error getting disputes by booking:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get disputes by opened by user
   */
  async getDisputesByOpenedBy(openedBy: string): Promise<DisputeResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/openedBy/${openedBy}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get disputes');
      }

      return { success: true, message: 'Disputes retrieved successfully', data };
    } catch (error) {
      console.error('Error getting disputes by opened by:', error);
      return { success: false, message: error.message };
    }
  }
}

export default new DisputeService();
