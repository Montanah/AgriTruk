#!/usr/bin/env node

const admin = require('./config/firebase');
const db = admin.firestore();

async function fixTrialPlans() {
  try {
    console.log('🔧 Fixing trial subscription plans to have 90-day duration...');
    
    // Get all trial plans (price = 0)
    const snapshot = await db.collection('subscriptionPlans')
      .where('price', '==', 0)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ No trial plans found');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} trial plan(s)`);
    
    // Update each trial plan
    for (const doc of snapshot.docs) {
      const plan = doc.data();
      console.log(`\n📋 Trial Plan: "${plan.name}"`);
      console.log(`   Current duration: ${plan.duration} days`);
      console.log(`   Current trialDays: ${plan.trialDays || 'not set'}`);
      
      // Update to 90 days trial
      const updates = {
        duration: 90,
        trialDays: 90,
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      await db.collection('subscriptionPlans').doc(doc.id).update(updates);
      
      console.log(`   ✅ Updated to: 90 days`);
    }
    
    console.log('\n✅ Trial plans fixed successfully!');
    
    // Also fix existing subscriber endDates for trials
    console.log('\n🔧 Fixing existing trial subscribers with incorrect endDates...');
    
    const subscribersSnapshot = await db.collection('subscribers')
      .where('isActive', '==', true)
      .get();
    
    let updatedCount = 0;
    
    for (const doc of subscribersSnapshot.docs) {
      const subscriber = doc.data();
      
      try {
        // Get the plan
        const planDoc = await db.collection('subscriptionPlans').doc(subscriber.planId).get();
        if (!planDoc.exists) continue;
        
        const plan = planDoc.data();
        
        // Only process trial plans (price = 0)
        if (plan.price !== 0) continue;
        
        // Calculate expected endDate based on startDate + 90 days
        const startDate = subscriber.startDate.toDate ? subscriber.startDate.toDate() : new Date(subscriber.startDate);
        const expectedEndDate = new Date(startDate);
        expectedEndDate.setDate(expectedEndDate.getDate() + 90);
        
        const currentEndDate = subscriber.endDate.toDate ? subscriber.endDate.toDate() : new Date(subscriber.endDate);
        
        // If endDate is not 90 days from start, fix it
        const actualDays = Math.floor((currentEndDate - startDate) / (1000 * 60 * 60 * 24));
        
        if (actualDays !== 90) {
          console.log(`\n   📍 User: ${subscriber.userId}`);
          console.log(`      Start: ${startDate.toISOString().split('T')[0]}`);
          console.log(`      Current End: ${currentEndDate.toISOString().split('T')[0]} (${actualDays} days)`);
          console.log(`      Expected End: ${expectedEndDate.toISOString().split('T')[0]} (90 days)`);
          
          await db.collection('subscribers').doc(doc.id).update({
            endDate: admin.firestore.Timestamp.fromDate(expectedEndDate),
            updatedAt: admin.firestore.Timestamp.now()
          });
          
          console.log(`      ✅ Fixed to 90 days`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error processing subscriber ${doc.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Fixed ${updatedCount} trial subscriber(s)`);
    console.log('\n✅ All trial plans and subscribers have been fixed!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing trial plans:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixTrialPlans().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = fixTrialPlans;
