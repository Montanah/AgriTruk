// Rating service for transporters and users
import { API_ENDPOINTS } from '../constants/api';
import { getAuth } from 'firebase/auth';

export interface Rating {
  id: string;
  transporterId: string;
  raterId: string;
  raterName: string;
  raterRole: 'customer' | 'broker' | 'admin';
  rating: number; // 1-5 stars
  comment?: string;
  bookingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

class RatingService {
  /**
   * Submit a rating for a transporter
   */
  async submitRating(transporterId: string, rating: number, comment?: string, bookingId?: string): Promise<Rating> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.RATINGS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transporterId,
          rating,
          comment,
          bookingId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to submit rating: ${response.status}`);
      }

      const data = await response.json();
      return data.rating;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  }

  /**
   * Get ratings for a specific transporter
   */
  async getTransporterRatings(transporterId: string): Promise<{ ratings: Rating[]; stats: RatingStats }> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return { ratings: [], stats: { averageRating: 0, totalRatings: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } } };

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.RATINGS}/${transporterId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          ratings: data.ratings || [],
          stats: data.stats || { averageRating: 0, totalRatings: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }
        };
      }
      
      return { ratings: [], stats: { averageRating: 0, totalRatings: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } } };
    } catch (error) {
      console.error('Error fetching transporter ratings:', error);
      return { ratings: [], stats: { averageRating: 0, totalRatings: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } } };
    }
  }

  /**
   * Get user's submitted ratings
   */
  async getUserRatings(): Promise<Rating[]> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return [];

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_ENDPOINTS.RATINGS}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.ratings || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching user ratings:', error);
      return [];
    }
  }

  /**
   * Update an existing rating
   */
  async updateRating(ratingId: string, rating: number, comment?: string): Promise<Rating> {
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
        body: JSON.stringify({
          rating,
          comment,
        }),
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
}

export const ratingService = new RatingService();

