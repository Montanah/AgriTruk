import { API_ENDPOINTS } from '../constants/api';

export interface Rating {
  id: string;
  bookingId: string;
  transporterId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingResponse {
  success: boolean;
  message: string;
  data?: Rating;
}

export interface TransporterRatingsResponse {
  success: boolean;
  message: string;
  data?: {
    ratings: Rating[];
    averageRating: number;
    totalRatings: number;
  };
}

class RatingService {
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
   * Submit a rating for a transporter
   */
  async submitRating(
    bookingId: string,
    transporterId: string,
    rating: number,
    comment?: string
  ): Promise<RatingResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.RATINGS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          transporterId,
          rating,
          comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit rating');
      }

      return { success: true, message: 'Rating submitted successfully', data };
    } catch (error) {
      console.error('Error submitting rating:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all ratings and average for a transporter
   */
  async getTransporterRatings(transporterId: string): Promise<TransporterRatingsResponse> {
    try {
      const response = await fetch(`${API_ENDPOINTS.RATINGS}/${transporterId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get transporter ratings');
      }

      return { success: true, message: 'Ratings retrieved successfully', data };
    } catch (error) {
      console.error('Error getting transporter ratings:', error);
      return { success: false, message: error.message };
    }
  }
}

export default new RatingService();
