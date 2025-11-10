/**
 * Dispute Resolution Service
 * Handles dispute creation, retrieval, and management matching admin dashboard
 */

import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';

export type DisputePriority = 'low' | 'medium' | 'high';
export type DisputeStatus = 'open' | 'resolved' | 'in_progress' | 'closed'; // Backend uses 'open' not 'pending'

// Backend Dispute structure matching the existing model
export interface Dispute {
  disputeId: string; // Firestore document ID
  bookingId: string;
  openedBy: string | any; // User ID or populated user object
  transporterId: string | null;
  userId: string | null;
  transporterType?: 'transporter' | 'driver';
  
  // Dispute details (backend uses 'reason' not 'issue'/'description')
  reason: string;
  status: DisputeStatus; // 'open' is default, not 'pending'
  priority: DisputePriority;
  
  // Evidence (backend uses 'evidence' not 'attachments')
  evidence?: string[]; // Array of URLs or references
  
  // Comments array
  comments?: string[];
  
  // Resolution (backend uses string, not object)
  resolution?: string | null;
  amountRefunded?: number;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  
  // Timeline
  openedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Populated fields (from controller)
  transporter?: any; // Populated transporter object
  customer?: any; // Populated user object (from openedBy)
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
   * Backend expects: bookingId, transporterId, reason, status, priority, comments, evidence
   */
  async createDispute(disputeData: {
    bookingId: string;
    transporterId: string;
    reason: string; // Backend uses 'reason' not 'issue'/'description'
    priority?: DisputePriority;
    status?: DisputeStatus;
    comments?: string[];
    evidence?: string[]; // Backend uses 'evidence' not 'attachments'
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
          bookingId: disputeData.bookingId,
          transporterId: disputeData.transporterId,
          reason: disputeData.reason,
          priority: disputeData.priority || 'medium',
          status: disputeData.status || 'open',
          comments: disputeData.comments || [],
          evidence: disputeData.evidence || [],
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
   * Backend has: /api/disputes/openedBy/:openedBy
   */
  async getDisputes(filters?: DisputeFilters): Promise<{ disputes: Dispute[]; stats: DisputeStats }> {
    try {
      const token = await this.getAuthToken();
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Backend endpoint: /api/disputes/openedBy/:openedBy
      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/openedBy/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get disputes: ${response.status}`);
      }

      let disputes: Dispute[] = await response.json();
      
      // Apply client-side filters if needed
      if (filters?.status && filters.status.length > 0) {
        disputes = disputes.filter(d => filters.status!.includes(d.status));
      }
      if (filters?.priority && filters.priority.length > 0) {
        disputes = disputes.filter(d => filters.priority!.includes(d.priority));
      }
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        disputes = disputes.filter(d => 
          d.reason?.toLowerCase().includes(searchLower) ||
          d.disputeId?.toLowerCase().includes(searchLower) ||
          d.bookingId?.toLowerCase().includes(searchLower)
        );
      }
      
      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const stats: DisputeStats = {
        pending: disputes.filter(d => d.status === 'open').length,
        resolvedToday: disputes.filter(d => {
          if (d.status !== 'resolved' || !d.resolvedAt) return false;
          const resolvedDate = new Date(d.resolvedAt);
          return resolvedDate >= today;
        }).length,
        escalated: 0, // Backend doesn't have 'escalated' status
        total: disputes.length,
      };
      
      return { disputes, stats };
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
   * Resolve a dispute (admin only)
   * Backend expects: resolution, amountRefunded, comments
   * Uses PUT /api/disputes/:disputeId with status 'resolved'
   */
  async resolveDispute(disputeId: string, resolutionData: {
    resolution: string;
    amountRefunded?: number;
    comments?: string;
  }): Promise<Dispute> {
    try {
      const token = await this.getAuthToken();
      
      // Backend resolve endpoint: PUT /api/disputes/:disputeId/resolve
      // But based on controller, it seems to use a separate resolve method
      // Let's use updateDispute with status 'resolved'
      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/${disputeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'resolved',
          resolution: resolutionData.resolution,
          amountRefunded: resolutionData.amountRefunded || 0,
          comments: resolutionData.comments ? [resolutionData.comments] : undefined,
        }),
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
   * Get disputes by booking ID
   * Backend endpoint: /api/disputes/booking/:bookingId
   */
  async getDisputesByBookingId(bookingId: string): Promise<Dispute[]> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${API_ENDPOINTS.DISPUTES}/booking/${bookingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get disputes: ${response.status}`);
      }

      const disputes = await response.json();
      return Array.isArray(disputes) ? disputes : [];
    } catch (error) {
      console.error('Error getting disputes by booking ID:', error);
      throw error;
    }
  }
}

export const disputeService = new DisputeService();

