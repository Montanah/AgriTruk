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
  id?: string; // For compatibility with FlatList keyExtractor
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
  booking?: any; // Populated booking object with readableId
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
      
      const requestBody = {
        bookingId: disputeData.bookingId,
        transporterId: disputeData.transporterId,
        reason: disputeData.reason,
        priority: disputeData.priority || 'medium',
        status: disputeData.status || 'open',
        comments: disputeData.comments || [],
        evidence: disputeData.evidence || [],
      };

      console.log('📤 [DisputeService] Creating dispute request:', {
        bookingId: requestBody.bookingId,
        transporterId: requestBody.transporterId,
        reason: requestBody.reason.substring(0, 50) + '...',
        priority: requestBody.priority,
      });

      const response = await fetch(`${API_ENDPOINTS.DISPUTES}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [DisputeService] Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(errorData.message || `Failed to create dispute: ${response.status}`);
      }

      const data: any = await response.json();
      const dispute = data.dispute || data;
      // Ensure dispute has both id and disputeId for compatibility
      return {
        ...dispute,
        id: dispute.disputeId || dispute.id || `dispute_${dispute.bookingId}`,
        disputeId: dispute.disputeId || dispute.id,
      };
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
      // Note: If 403, try alternative endpoint or return empty array
      const endpoint = `${API_ENDPOINTS.DISPUTES}/openedBy/${userId}`;
      console.log('📡 [DisputeService] Fetching disputes from:', endpoint);
      console.log('📡 [DisputeService] User ID:', userId);
      
      let response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 [DisputeService] Response status:', response.status, response.statusText);

      // If 403, try the main disputes endpoint (might need different role)
      if (response.status === 403) {
        console.warn('⚠️ [DisputeService] Got 403, trying alternative endpoint...');
        const altEndpoint = `${API_ENDPOINTS.DISPUTES}`;
        response = await fetch(altEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('📡 [DisputeService] Alternative endpoint response:', response.status);
      }

      if (!response.ok) {
        // If still 403, user might not have permission - return empty array instead of throwing
        if (response.status === 403) {
          console.warn('⚠️ [DisputeService] Access denied to disputes endpoint - user may not have permission');
          return { disputes: [], stats: { pending: 0, resolvedToday: 0, escalated: 0, total: 0 } };
        }
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ [DisputeService] Error response:', errorText);
        throw new Error(`Failed to get disputes: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('📦 [DisputeService] Raw response data:', {
        type: Array.isArray(responseData) ? 'array' : typeof responseData,
        length: Array.isArray(responseData) ? responseData.length : Object.keys(responseData || {}).length,
        data: responseData,
      });
      
      // Handle different response formats
      // Backend might return array directly or wrapped in { data: [...] } or { disputes: [...] }
      let allDisputes: Dispute[] = [];
      if (Array.isArray(responseData)) {
        allDisputes = responseData;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        allDisputes = responseData.data;
      } else if (responseData?.disputes && Array.isArray(responseData.disputes)) {
        allDisputes = responseData.disputes;
      } else {
        console.warn('⚠️ [DisputeService] Unexpected response format:', responseData);
        allDisputes = [];
      }
      
      console.log('✅ [DisputeService] Parsed disputes:', allDisputes.length);
      console.log('📦 [DisputeService] Sample dispute booking data:', allDisputes[0]?.booking ? {
        hasBooking: true,
        readableId: allDisputes[0].booking.readableId,
        bookingId: allDisputes[0].booking.id || allDisputes[0].booking.bookingId,
      } : {
        hasBooking: false,
        bookingId: allDisputes[0]?.bookingId,
      });
      
      // Fetch booking details for disputes that don't have booking object with readableId
      // This ensures we always have the readableId from the database
      const disputesWithBookings = await Promise.all(
        allDisputes.map(async (d: any) => {
          // If booking is already populated with readableId, use it
          if (d.booking?.readableId) {
            console.log(`✅ [DisputeService] Dispute ${d.disputeId} already has readableId: ${d.booking.readableId}`);
            return d;
          }
          
          // If no booking object or no readableId, fetch booking details
          if (d.bookingId && !d.booking?.readableId) {
            try {
              const token = await this.getAuthToken();
              const bookingResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/${d.bookingId}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (bookingResponse.ok) {
                const bookingData = await bookingResponse.json();
                const booking = bookingData.booking || bookingData;
                // Attach booking with readableId to dispute
                d.booking = booking;
                console.log(`✅ [DisputeService] Fetched booking for dispute ${d.disputeId}:`, {
                  bookingId: booking.id || booking.bookingId,
                  readableId: booking.readableId,
                });
              }
            } catch (error) {
              console.warn(`⚠️ [DisputeService] Could not fetch booking ${d.bookingId}:`, error);
              // Continue without booking - will use bookingId as fallback
            }
          }
          
          return d;
        })
      );
      
      // Ensure disputes have proper IDs and normalize dates
      allDisputes = disputesWithBookings.map((d: any) => {
        // Normalize date fields - handle Firestore Timestamps
        const normalizeDate = (dateValue: any): string | null => {
          if (!dateValue) return null;
          
          // If it's already a string, return as is
          if (typeof dateValue === 'string') {
            return dateValue;
          }
          
          // If it's a Firestore Timestamp object
          if (typeof dateValue === 'object' && dateValue !== null) {
            if ('toDate' in dateValue && typeof dateValue.toDate === 'function') {
              return dateValue.toDate().toISOString();
            } else if ('seconds' in dateValue) {
              // Firestore Timestamp with seconds/nanoseconds
              const milliseconds = dateValue.seconds * 1000 + (dateValue.nanoseconds || 0) / 1000000;
              return new Date(milliseconds).toISOString();
            } else if ('_seconds' in dateValue) {
              // Alternative format
              return new Date(dateValue._seconds * 1000).toISOString();
            }
          }
          
          // If it's a number (timestamp)
          if (typeof dateValue === 'number') {
            const milliseconds = dateValue > 1000000000000 ? dateValue : dateValue * 1000;
            return new Date(milliseconds).toISOString();
          }
          
          // Try to convert to string
          return String(dateValue);
        };
        
        return {
          ...d,
          id: d.disputeId || d.id || `dispute_${Date.now()}`,
          disputeId: d.disputeId || d.id,
          // Preserve booking object if populated by backend
          booking: d.booking || null,
          // Normalize all date fields
          createdAt: normalizeDate(d.createdAt) || d.createdAt,
          updatedAt: normalizeDate(d.updatedAt) || d.updatedAt,
          openedAt: normalizeDate(d.openedAt) || d.openedAt,
          resolvedAt: normalizeDate(d.resolvedAt) || d.resolvedAt,
        };
      });
      
      // Calculate stats on ALL disputes BEFORE filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const stats: DisputeStats = {
        // Count 'open' or 'pending' status as pending
        pending: allDisputes.filter(d => 
          d.status === 'open' || d.status === 'pending' || d.status === 'in_progress'
        ).length,
        resolvedToday: allDisputes.filter(d => {
          if (d.status !== 'resolved' || !d.resolvedAt) return false;
          const resolvedDate = new Date(d.resolvedAt);
          return resolvedDate >= today;
        }).length,
        escalated: allDisputes.filter(d => d.status === 'escalated' || d.priority === 'high').length,
        total: allDisputes.length,
      };
      
      // Apply client-side filters AFTER calculating stats
      let disputes = [...allDisputes]; // Work with a copy
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

      const data: any = await response.json();
      let dispute = data.dispute || data;
      
      // Fetch booking details if booking doesn't have readableId
      // This ensures we always have the readableId from the database
      if (dispute.bookingId && !dispute.booking?.readableId) {
        try {
          const bookingResponse = await fetch(`${API_ENDPOINTS.BOOKINGS}/${dispute.bookingId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (bookingResponse.ok) {
            const bookingData = await bookingResponse.json();
            const booking = bookingData.booking || bookingData;
            // Attach booking with readableId to dispute
            dispute.booking = booking;
            console.log(`✅ [DisputeService] Fetched booking for dispute ${disputeId}:`, {
              bookingId: booking.id || booking.bookingId,
              readableId: booking.readableId,
            });
          }
        } catch (error) {
          console.warn(`⚠️ [DisputeService] Could not fetch booking ${dispute.bookingId}:`, error);
          // Continue without booking - will use bookingId as fallback
        }
      } else if (dispute.booking?.readableId) {
        console.log(`✅ [DisputeService] Dispute ${disputeId} already has readableId: ${dispute.booking.readableId}`);
      }
      
      // Normalize date fields - handle Firestore Timestamps
      const normalizeDate = (dateValue: any): string | null => {
        if (!dateValue) return null;
        
        // If it's already a string, return as is
        if (typeof dateValue === 'string') {
          return dateValue;
        }
        
        // If it's a Firestore Timestamp object
        if (typeof dateValue === 'object' && dateValue !== null) {
          if ('toDate' in dateValue && typeof dateValue.toDate === 'function') {
            return dateValue.toDate().toISOString();
          } else if ('seconds' in dateValue) {
            // Firestore Timestamp with seconds/nanoseconds
            const milliseconds = dateValue.seconds * 1000 + (dateValue.nanoseconds || 0) / 1000000;
            return new Date(milliseconds).toISOString();
          } else if ('_seconds' in dateValue) {
            // Alternative format
            return new Date(dateValue._seconds * 1000).toISOString();
          }
        }
        
        // If it's a number (timestamp)
        if (typeof dateValue === 'number') {
          const milliseconds = dateValue > 1000000000000 ? dateValue : dateValue * 1000;
          return new Date(milliseconds).toISOString();
        }
        
        // Try to convert to string
        return String(dateValue);
      };
      
      // Ensure dispute has both id and disputeId for compatibility, and normalize dates
      return {
        ...dispute,
        id: dispute.disputeId || dispute.id || `dispute_${dispute.bookingId}`,
        disputeId: dispute.disputeId || dispute.id,
        // Preserve booking object if populated by backend or fetched (contains readableId)
        booking: dispute.booking || null,
        // Normalize all date fields
        createdAt: normalizeDate(dispute.createdAt) || dispute.createdAt,
        updatedAt: normalizeDate(dispute.updatedAt) || dispute.updatedAt,
        openedAt: normalizeDate(dispute.openedAt) || dispute.openedAt,
        resolvedAt: normalizeDate(dispute.resolvedAt) || dispute.resolvedAt,
      };
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

