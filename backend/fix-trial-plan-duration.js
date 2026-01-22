const admin = require('./config/firebase');
const db = admin.firestore();

async function fixTrialPlanDuration() {
  try {
    console.log('🔧 Fixing trial plan duration from 3 to 90 days...');
    
    // Get the trial plan (billingCycle === 'trial')
    const trialPlanQuery = await db.collection('subscriptionPlans')
      .where('billingCycle', '==', 'trial')
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (trialPlanQuery.empty) {
      console.log('❌ No active trial plan found');
      return;
    }
    
    const trialPlanDoc = trialPlanQuery.docs[0];
    const trialPlanId = trialPlanDoc.id;
    const trialPlanData = trialPlanDoc.data();
    
    console.log('✅ Found trial plan:', trialPlanId);
    console.log('Current plan data:', {
      name: trialPlanData.name,
      duration: trialPlanData.duration,
      price: trialPlanData.price,
      billingCycle: trialPlanData.billingCycle
    });
    
    // Check if duration is currently 3
    if (trialPlanData.duration === 3 || trialPlanData.duration === '3') {
      console.log('⚠️ Trial plan duration is 3 (should be 90 days)');
      
      // Update to 90 days
      await db.collection('subscriptionPlans').doc(trialPlanId).update({
        duration: 90,
        updatedAt: admin.firestore.Timestamp.now()
      });
      
      console.log('✅ Successfully updated trial plan duration to 90 days');
    } else if (trialPlanData.duration === 90) {
      console.log('✅ Trial plan duration is already correct (90 days)');
    } else {
      console.log(`⚠️ Trial plan duration is ${trialPlanData.duration} days`);
      console.log('Consider updating to 90 days if this is incorrect');
    }
    
  } catch (error) {
    console.error('❌ Error fixing trial plan duration:', error);
    process.exit(1);
  }
}

fixTrialPlanDuration().then(() => {
  console.log('✅ Trial plan duration fix complete');
  process.exit(0);
});
