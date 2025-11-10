/**
 * Dispute Resolution Service
 * Handles dispute creation, retrieval, and management matching admin dashboard
 */

import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';

export type DisputePriority = 'low' | 'medium' | 'high';
export type DisputeStatus = 'pending' | 'resolved' | 'escalated' | 'in_progress' | 'closed';
export type DisputeCategory = 
  | 'package_damaged' 
  | 'late_delivery' 
  | 'wrong_address' 
  | 'missing_items' 
  | 'billing_issue'
  | 'service_quality'
  | 'safety_concern'
  | 'other';

export interface Dispute {
  id: string;
  disputeId: string; // Display ID like DSP001
  bookingId: string;
  booking?: {
    id: string;
    readableId?: string;
    fromLocation?: any;
    toLocation?: any;
    productType?: string;
    weight?: string;
  };
  
  // Parties involved
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    type: 'shipper' | 'broker' | 'business';
  };
  
  transporter: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  
  // Dispute details
  issue: string;
  description: string;
  category: DisputeCategory;
  priority: DisputePriority;
  status: DisputeStatus;
  
  // Evidence and attachments
  attachments?: Array<{
    id: string;
    url: string;
    type: 'image' | 'document' | 'video';
    name: string;
  }>;
  
  // Resolution
  resolution?: {
    resolvedBy: string;
    resolvedAt: string;
    resolutionNotes: string;
    outcome: 'customer_favored' | 'transporter_favored' | 'partial' | 'dismissed';
    refundAmount?: number;
    compensationAmount?: number;
  };
  
  // Escalation
  escalatedAt?: string;
  escalatedBy?: string;
  escalationReason?: string;
  
  // Timeline
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  
  // Admin notes
  adminNotes?: string;
  
  // Response from transporter
  transporterResponse?: {
    message: string;
    respondedAt: string;
  };
}

export interface DisputeStats {
  pending: number;
  resolvedToday: number;
  escalated: number;
  total: number;
}

export interface DisputeFilters {
  status?: DisputeStatus[];
  priority?: DisputePriority[];
  category?: DisputeCategory[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

class DisputeService {
  private async getAuthToken(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
  }

  /**
   * Create a new dispute
   */
  async createDispute(disputeData: {
    bookingId: string;
    issue: string;
    description: string;
    category: DisputeCategory;
    priority?: DisputePriority;
    attachments?: Array<{ url: string; type: string; name: string }>;
  }): Promise<Dispute> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DISPUTES}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...disputeData,
          priority: disputeData.priority || 'medium',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create dispute: ${response.status}`);
      }

      const data = await response.json();
      return data.dispute || data;
    } catch (error) {
      console.error('Error creating dispute:', error);
      throw error;
    }
  }

  /**
   * Get all disputes for the current user
   */
  async getDisputes(filters?: DisputeFilters): Promise<{ disputes: Dispute[]; stats: DisputeStats }> {
    try {
      const token = await this.getAuthToken();
      
      const queryParams = new URLSearchParams();
      if (filters?.status) {
        filters.status.forEach(s => queryParams.append('status', s));
      }
      if (filters?.priority) {
        filters.priority.forEach(p => queryParams.append('priority', p));
      }
      if (filters?.category) {
        filters.category.forEach(c => queryParams.append('category', c));
      }
      if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters?.search) queryParams.append('search', filters.search);

      const response = await fetch(`${API_ENDPOINTS.DISPUTES}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get disputes: ${response.status}`);
      }

      const data = await response.json();
      return {
        disputes: data.disputes || data || [],
        stats: data.stats || {
          pending: 0,
          resolvedToday: 0,
          escalated: 0,
          total: 0,
        },
      };
    } catch (error) {
      console.error('Error getting disputes:', error);
      throw error;
    }
  }

  /**
   * Get a single dispute by ID
   */
  async getDispute(disputeId: string): Promise<Dispute> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/${disputeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get dispute: ${response.status}`);
      }

      const data = await response.json();
      return data.dispute || data;
    } catch (error) {
      console.error('Error getting dispute:', error);
      throw error;
    }
  }

  /**
   * Update dispute status (for transporters responding)
   */
  async updateDispute(disputeId: string, updates: {
    status?: DisputeStatus;
    transporterResponse?: string;
    adminNotes?: string;
  }): Promise<Dispute> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/${disputeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update dispute: ${response.status}`);
      }

      const data = await response.json();
      return data.dispute || data;
    } catch (error) {
      console.error('Error updating dispute:', error);
      throw error;
    }
  }

  /**
   * Resolve a dispute (admin only, but can be called from mobile for viewing)
   */
  async resolveDispute(disputeId: string, resolution: {
    resolutionNotes: string;
    outcome: 'customer_favored' | 'transporter_favored' | 'partial' | 'dismissed';
    refundAmount?: number;
    compensationAmount?: number;
  }): Promise<Dispute> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/${disputeId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resolution),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to resolve dispute: ${response.status}`);
      }

      const data = await response.json();
      return data.dispute || data;
    } catch (error) {
      console.error('Error resolving dispute:', error);
      throw error;
    }
  }

  /**
   * Escalate a dispute
   */
  async escalateDispute(disputeId: string, reason: string): Promise<Dispute> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/${disputeId}/escalate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to escalate dispute: ${response.status}`);
      }

      const data = await response.json();
      return data.dispute || data;
    } catch (error) {
      console.error('Error escalating dispute:', error);
      throw error;
    }
  }

  /**
   * Add attachment to dispute
   */
  async addAttachment(disputeId: string, attachment: {
    url: string;
    type: 'image' | 'document' | 'video';
    name: string;
  }): Promise<Dispute> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/${disputeId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attachment),
      });

      if (!response.ok) {
        throw new Error(`Failed to add attachment: ${response.status}`);
      }

      const data = await response.json();
      return data.dispute || data;
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw error;
    }
  }
}

export const disputeService = new DisputeService();

