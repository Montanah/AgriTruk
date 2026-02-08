const cron = require('node-cron');
const admin = require('firebase-admin');
const Notification = require('../models/Notification'); // Adjust path as needed

class CronService {
  constructor() {
    this.jobs = [];
  }

  init() {
    this.scheduleRecurrenceReminders();
    this.scheduleBookingCleanup();
    console.log('Cron jobs initialized');
  }

  // Daily reminder check at 8 AM
  scheduleRecurrenceReminders() {
    const job = cron.schedule('0 8 * * *', async () => {
      try {
        console.log('Running daily recurrence reminder check...');
        await this.checkUpcomingRecurringBookings();
      } catch (error) {
        console.error('Error in recurrence reminder cron job:', error);
      }
    });

    this.jobs.push(job);
  }

  // Optional: Clean up old completed bookings weekly
  scheduleBookingCleanup() {
    const job = cron.schedule('0 0 * * 0', async () => { // Weekly on Sunday at midnight
      try {
        console.log('Running weekly booking cleanup...');
        await this.cleanupOldBookings();
      } catch (error) {
        console.error('Error in booking cleanup cron job:', error);
      }
    });

    this.jobs.push(job);
  }

  async checkUpcomingRecurringBookings() {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));
    
    try {
      // Find recurring instance bookings happening in the next 2 days
      const upcomingBookings = await admin.firestore()
        .collection('agriBookings')
        .where('pickUpDate', '>=', admin.firestore.Timestamp.fromDate(now))
        .where('pickUpDate', '<=', admin.firestore.Timestamp.fromDate(twoDaysFromNow))
        .where('isRecurrenceInstance', '==', true)
        .where('status', 'in', ['pending', 'confirmed']) // Only active bookings
        .get();
      
      let sentCount = 0;
      
      for (const doc of upcomingBookings.docs) {
        const booking = doc.data();
        
        // Check if we already sent a reminder for this booking
        const alreadyNotified = await this.hasNotificationBeenSent(booking.bookingId, 'recurrence_reminder');
        
        if (!alreadyNotified) {
          await Notification.create({
            type: "Recurring Booking Reminder",
            message: `Your recurring booking is coming up on ${booking.pickUpDate.toDate().toLocaleDateString()}`,
            userId: booking.userId,
            userType: "user",
            bookingId: booking.bookingId,
            metadata: {
              notificationType: 'recurrence_reminder',
              originalDate: booking.pickUpDate
            }
          });
          
          sentCount++;
          console.log(`Sent reminder for booking ${booking.bookingId}`);
        }
      }
      
      console.log(`Sent ${sentCount} recurring booking reminders`);
      
    } catch (error) {
      console.error('Error checking upcoming bookings:', error);
    }
  }

  async hasNotificationBeenSent(bookingId, notificationType) {
    try {
      const existingNotification = await admin.firestore()
        .collection('notifications') // Adjust to your notifications collection
        .where('bookingId', '==', bookingId)
        .where('metadata.notificationType', '==', notificationType)
        .limit(1)
        .get();
      
      return !existingNotification.empty;
    } catch (error) {
      console.error('Error checking existing notifications:', error);
      return false;
    }
  }

  async cleanupOldBookings() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldBookings = await admin.firestore()
        .collection('agriBookings')
        .where('status', 'in', ['completed', 'cancelled'])
        .where('updatedAt', '<=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();
      
      // Instead of deleting, you might want to archive them
      const batch = admin.firestore().batch();
      
      oldBookings.docs.forEach(doc => {
        const archiveRef = admin.firestore().collection('archivedBookings').doc(doc.id);
        batch.set(archiveRef, doc.data());
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Archived ${oldBookings.size} old bookings`);
      
    } catch (error) {
      console.error('Error cleaning up old bookings:', error);
    }
  }

  stopAllJobs() {
    this.jobs.forEach(job => job.stop());
    console.log('All cron jobs stopped');
  }
}

module.exports = new CronService();