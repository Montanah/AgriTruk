/**
 * Booking Sync Service
 * Handles syncing locally stored bookings when backend is available
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../utils/api';

export interface LocalBooking {
  id: string;
  storedAt: string;
  status: 'pending_local';
  needsSync: boolean;
  [key: string]: any;
}

class BookingSyncService {
  private isSyncing = false;

  /**
   * Sync all pending local bookings to the backend
   */
  async syncPendingBookings(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      // Sync already in progress, skipping
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      // Starting booking sync
      
      const existingBookings = await AsyncStorage.getItem('pending_bookings');
      if (!existingBookings) {
        // No pending bookings to sync
        return { success: 0, failed: 0 };
      }

      const bookings: LocalBooking[] = JSON.parse(existingBookings);
      const pendingBookings = bookings.filter(booking => booking.needsSync);

      // Found pending bookings to sync

      for (const booking of pendingBookings) {
        try {
          // Syncing booking
          
          // Remove local-specific fields before sending to backend
          const { id, storedAt, status, needsSync, ...bookingData } = booking;
          
          await apiRequest('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
          });

          // Mark as synced
          booking.needsSync = false;
          booking.status = 'synced';
          booking.syncedAt = new Date().toISOString();
          
          successCount++;
          // Successfully synced booking
        } catch (error) {
          failedCount++;
          console.error(`❌ Failed to sync booking ${booking.id}:`, error);
        }
      }

      // Update local storage with synced bookings
      await AsyncStorage.setItem('pending_bookings', JSON.stringify(bookings));

      // Sync completed
      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error('❌ Booking sync failed:', error);
      return { success: 0, failed: 0 };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get all pending bookings
   */
  async getPendingBookings(): Promise<LocalBooking[]> {
    try {
      const existingBookings = await AsyncStorage.getItem('pending_bookings');
      if (!existingBookings) return [];
      
      const bookings: LocalBooking[] = JSON.parse(existingBookings);
      return bookings.filter(booking => booking.needsSync);
    } catch (error) {
      console.error('❌ Failed to get pending bookings:', error);
      return [];
    }
  }

  /**
   * Clear all synced bookings
   */
  async clearSyncedBookings(): Promise<void> {
    try {
      const existingBookings = await AsyncStorage.getItem('pending_bookings');
      if (!existingBookings) return;
      
      const bookings: LocalBooking[] = JSON.parse(existingBookings);
      const pendingBookings = bookings.filter(booking => booking.needsSync);
      
      await AsyncStorage.setItem('pending_bookings', JSON.stringify(pendingBookings));
      // Cleared synced bookings from local storage
    } catch (error) {
      console.error('❌ Failed to clear synced bookings:', error);
    }
  }

  /**
   * Check if there are pending bookings
   */
  async hasPendingBookings(): Promise<boolean> {
    const pending = await this.getPendingBookings();
    return pending.length > 0;
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    total: number;
    pending: number;
    synced: number;
  }> {
    try {
      const existingBookings = await AsyncStorage.getItem('pending_bookings');
      if (!existingBookings) return { total: 0, pending: 0, synced: 0 };
      
      const bookings: LocalBooking[] = JSON.parse(existingBookings);
      const pending = bookings.filter(booking => booking.needsSync);
      const synced = bookings.filter(booking => !booking.needsSync);
      
      return {
        total: bookings.length,
        pending: pending.length,
        synced: synced.length
      };
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      return { total: 0, pending: 0, synced: 0 };
    }
  }
}

export default new BookingSyncService();
