const admin = require('./config/firebase');
const db = admin.firestore();

async function fixTrialDuration() {
  try {
    const userId = '77aA8yBjstWmMjYDZMTHLDf3JbL2';
    
    // Get the subscriber
    const subscriberQuery = await db.collection('subscribers')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (subscriberQuery.empty) {
      console.log('❌ No active subscriber found for this user');
      return;
    }
    
    const subscriberDoc = subscriberQuery.docs[0];
    const subscriberData = subscriberDoc.data();
    const subscriberId = subscriberDoc.id;
    
    console.log('✅ Found subscriber:', subscriberId);
    console.log('Current end date:', subscriberData.endDate.toDate());
    
    // Get the plan to check if it's a trial
    const SubscriptionPlans = require('./models/SubscriptionsPlans');
    const plan = await SubscriptionPlans.getSubscriptionPlan(subscriberData.planId);
    
    if (!plan || plan.price !== 0) {
      console.log('❌ This is not a trial subscription (price is not 0)');
      return;
    }
    
    console.log('✅ This is a trial subscription');
    console.log('Plan duration:', plan.duration, 'days');
    
    // Calculate the correct end date (30 days from start date)
    const startDate = subscriberData.startDate.toDate();
    const correctEndDate = new Date(startDate);
    correctEndDate.setDate(correctEndDate.getDate() + plan.duration);
    
    console.log('📅 Start date:', startDate);
    console.log('📅 Correct end date should be:', correctEndDate);
    console.log('📅 Current end date:', subscriberData.endDate.toDate());
    
    // Update the subscriber with the correct end date
    await db.collection('subscribers').doc(subscriberId).update({
      endDate: admin.firestore.Timestamp.fromDate(correctEndDate),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    console.log('✅ Trial duration fixed!');
    console.log('New end date:', correctEndDate);
    
    // Calculate days remaining
    const endDateMillis = correctEndDate.getTime();
    const currentTime = Date.now();
    const daysRemaining = Math.ceil((endDateMillis - currentTime) / (1000 * 60 * 60 * 24));
    
    console.log('📊 Days remaining:', daysRemaining);
    
  } catch (error) {
    console.error('❌ Error fixing trial duration:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  fixTrialDuration();
}

module.exports = fixTrialDuration;
