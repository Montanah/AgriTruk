// Enhanced rating service supporting all user types (clients, brokers, businesses)
import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';
import { enhancedNotificationService } from './enhancedNotificationService';

export type RaterRole = 'client' | 'broker' | 'business' | 'admin';
export type RatingCategory = 'overall' | 'punctuality' | 'communication' | 'safety' | 'vehicle_condition' | 'professionalism' | 'value_for_money';

export interface EnhancedRating {
  id: string;
  transporterId: string;
  transporterName: string;
  raterId: string;
  raterName: string;
  raterRole: RaterRole;
  raterType: 'individual' | 'business' | 'broker';
  bookingId?: string;
  tripId?: string;
  
  // Overall rating (1-5 stars)
  overallRating: number;
  
  // Category-specific ratings (1-5 stars each)
  categoryRatings: {
    punctuality: number;
    communication: number;
    safety: number;
    vehicle_condition: number;
    professionalism: number;
    value_for_money: number;
  };
  
  // Additional feedback
  comment?: string;
  wouldRecommend: boolean;
  highlights?: string[]; // What went well
  improvements?: string[]; // What could be better
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  isVerified: boolean; // Whether the rater actually used the service
  isAnonymous: boolean;
  
  // Response from transporter (optional)
  transporterResponse?: {
    comment: string;
    respondedAt: string;
  };
}

export interface RatingStats {
  transporterId: string;
  transporterName: string;
  
  // Overall statistics
  overallAverage: number;
  totalRatings: number;
  verifiedRatings: number;
  
  // Category averages
  categoryAverages: {
    punctuality: number;
    communication: number;
    safety: number;
    vehicle_condition: number;
    professionalism: number;
    value_for_money: number;
  };
  
  // Rating distribution
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  
  // Recommendation rate
  recommendationRate: number;
  
  // Recent trends (last 30 days)
  recentTrend: 'improving' | 'declining' | 'stable';
  
  // Role-based breakdown
  ratingsByRole: {
    client: { count: number; average: number };
    broker: { count: number; average: number };
    business: { count: number; average: number };
  };
  
  // Last updated
  lastUpdated: string;
}

export interface RatingTemplate {
  role: RaterRole;
  categories: RatingCategory[];
  requiredCategories: RatingCategory[];
  optionalCategories: RatingCategory[];
  maxCommentLength: number;
  allowAnonymous: boolean;
  allowHighlights: boolean;
  allowImprovements: boolean;
  requireRecommendation: boolean;
}

export interface RatingSubmission {
  transporterId: string;
  bookingId?: string;
  tripId?: string;
  overallRating: number;
  categoryRatings: Partial<Record<RatingCategory, number>>;
  comment?: string;
  wouldRecommend: boolean;
  highlights?: string[];
  improvements?: string[];
  isAnonymous?: boolean;
}

// Rating templates for different user types
export const RATING_TEMPLATES: Record<RaterRole, RatingTemplate> = {
  client: {
    role: 'client',
    categories: ['overall', 'punctuality', 'communication', 'safety', 'vehicle_condition', 'professionalism', 'value_for_money'],
    requiredCategories: ['overall', 'punctuality', 'communication', 'safety'],
    optionalCategories: ['vehicle_condition', 'professionalism', 'value_for_money'],
    maxCommentLength: 500,
    allowAnonymous: true,
    allowHighlights: true,
    allowImprovements: true,
    requireRecommendation: true,
  },
  broker: {
    role: 'broker',
    categories: ['overall', 'punctuality', 'communication', 'safety', 'vehicle_condition', 'professionalism', 'value_for_money'],
    requiredCategories: ['overall', 'punctuality', 'communication', 'professionalism'],
    optionalCategories: ['safety', 'vehicle_condition', 'value_for_money'],
    maxCommentLength: 1000,
    allowAnonymous: false,
    allowHighlights: true,
    allowImprovements: true,
    requireRecommendation: true,
  },
  business: {
    role: 'business',
    categories: ['overall', 'punctuality', 'communication', 'safety', 'vehicle_condition', 'professionalism', 'value_for_money'],
    requiredCategories: ['overall', 'punctuality', 'communication', 'professionalism', 'value_for_money'],
    optionalCategories: ['safety', 'vehicle_condition'],
    maxCommentLength: 1000,
    allowAnonymous: false,
    allowHighlights: true,
    allowImprovements: true,
    requireRecommendation: true,
  },
  admin: {
    role: 'admin',
    categories: ['overall', 'punctuality', 'communication', 'safety', 'vehicle_condition', 'professionalism'],
    requiredCategories: ['overall'],
    optionalCategories: ['punctuality', 'communication', 'safety', 'vehicle_condition', 'professionalism'],
    maxCommentLength: 2000,
    allowAnonymous: false,
    allowHighlights: true,
    allowImprovements: true,
    requireRecommendation: false,
  },
};

class EnhancedRatingService {
  private templates = RATING_TEMPLATES;

  /**
   * Submit a rating for a transporter
   */
  async submitRating(submission: RatingSubmission): Promise<EnhancedRating> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      // Get user role and type
      const userRole = await this.getUserRole(user.uid);
      const userType = await this.getUserType(user.uid);
      
      const response = await fetch(`${API_ENDPOINTS.RATINGS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...submission,
          raterRole: userRole,
          raterType: userType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to submit rating: ${response.status}`);
      }

      const data = await response.json();
      const rating = data.rating;

      // Send notification to transporter about new rating
      await this.notifyTransporterAboutRating(rating);

      return rating;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  }

  /**
   * Get ratings for a specific transporter
   */
  async getTransporterRatings(
    transporterId: string, 
    options: {
      limit?: number;
      offset?: number;
      category?: RatingCategory;
      minRating?: number;
      maxRating?: number;
      role?: RaterRole;
      verifiedOnly?: boolean;
    } = {}
  ): Promise<{ ratings: EnhancedRating[]; stats: RatingStats; total: number }> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.category) queryParams.append('category', options.category);
      if (options.minRating) queryParams.append('minRating', options.minRating.toString());
      if (options.maxRating) queryParams.append('maxRating', options.maxRating.toString());
      if (options.role) queryParams.append('role', options.role);
      if (options.verifiedOnly) queryParams.append('verifiedOnly', 'true');

      const response = await fetch(`${API_ENDPOINTS.RATINGS}/transporter/${transporterId}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get ratings: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting transporter ratings:', error);
      throw error;
    }
  }

  /**
   * Get rating statistics for a transporter
   */
  async getTransporterStats(transporterId: string): Promise<RatingStats> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.RATINGS}/transporter/${transporterId}/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get rating stats: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting rating stats:', error);
      throw error;
    }
  }

  /**
   * Get ratings given by a specific user
   */
  async getUserRatings(options: {
    limit?: number;
    offset?: number;
    transporterId?: string;
  } = {}): Promise<{ ratings: EnhancedRating[]; total: number }> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.transporterId) queryParams.append('transporterId', options.transporterId);

      const response = await fetch(`${API_ENDPOINTS.RATINGS}/user?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get user ratings: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user ratings:', error);
      throw error;
    }
  }

  /**
   * Update an existing rating
   */
  async updateRating(ratingId: string, updates: Partial<RatingSubmission>): Promise<EnhancedRating> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.RATINGS}/${ratingId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update rating: ${response.status}`);
      }

      const data = await response.json();
      return data.rating;
    } catch (error) {
      console.error('Error updating rating:', error);
      throw error;
    }
  }

  /**
   * Delete a rating
   */
  async deleteRating(ratingId: string): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.RATINGS}/${ratingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete rating: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting rating:', error);
      throw error;
    }
  }

  /**
   * Respond to a rating as a transporter
   */
  async respondToRating(ratingId: string, response: string): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const apiResponse = await fetch(`${API_ENDPOINTS.RATINGS}/${ratingId}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to respond to rating: ${apiResponse.status}`);
      }
    } catch (error) {
      console.error('Error responding to rating:', error);
      throw error;
    }
  }

  /**
   * Get rating template for a specific role
   */
  getRatingTemplate(role: RaterRole): RatingTemplate {
    return this.templates[role];
  }

  /**
   * Get user role from backend
   */
  private async getUserRole(userId: string): Promise<RaterRole> {
    // This would typically come from user profile or auth context
    // For now, return a default based on some logic
    return 'client'; // This should be determined from user profile
  }

  /**
   * Get user type from backend
   */
  private async getUserType(userId: string): Promise<'individual' | 'business' | 'broker'> {
    // This would typically come from user profile
    // For now, return a default
    return 'individual'; // This should be determined from user profile
  }

  /**
   * Notify transporter about new rating
   */
  private async notifyTransporterAboutRating(rating: EnhancedRating): Promise<void> {
    try {
      await enhancedNotificationService.sendNotification(
        'rating_received',
        rating.transporterId,
        {
          raterName: rating.raterName,
          raterRole: rating.raterRole,
          overallRating: rating.overallRating,
          ratingId: rating.id,
          transporterName: rating.transporterName,
        }
      );
    } catch (error) {
      console.error('Error sending rating notification:', error);
      // Don't fail the rating submission if notification fails
    }
  }

  /**
   * Get top-rated transporters
   */
  async getTopRatedTransporters(options: {
    limit?: number;
    minRatings?: number;
    category?: RatingCategory;
    role?: RaterRole;
  } = {}): Promise<Array<{ transporterId: string; transporterName: string; stats: RatingStats }>> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.minRatings) queryParams.append('minRatings', options.minRatings.toString());
      if (options.category) queryParams.append('category', options.category);
      if (options.role) queryParams.append('role', options.role);

      const response = await fetch(`${API_ENDPOINTS.RATINGS}/top-rated?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get top-rated transporters: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting top-rated transporters:', error);
      throw error;
    }
  }

  /**
   * Report inappropriate rating
   */
  async reportRating(ratingId: string, reason: string, description?: string): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.RATINGS}/${ratingId}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, description }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to report rating: ${response.status}`);
      }
    } catch (error) {
      console.error('Error reporting rating:', error);
      throw error;
    }
  }
}

export const enhancedRatingService = new EnhancedRatingService();

