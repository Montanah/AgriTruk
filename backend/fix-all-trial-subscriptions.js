#!/usr/bin/env node

const admin = require('./config/firebase');
const db = admin.firestore();

async function fixAllTrialSubscriptions() {
  try {
    console.log('🚀 COMPREHENSIVE TRIAL SUBSCRIPTION FIX');
    console.log('=========================================\n');
    
    // STEP 1: Fix Transporter Trial Plans
    console.log('📋 STEP 1: Fixing Transporter Trial Plans...');
    await fixTransporterTrialPlans();
    
    // STEP 2: Fix Broker Trial Plans
    console.log('\n📋 STEP 2: Fixing Broker Trial Plans...');
    await fixBrokerTrialPlans();
    
    // STEP 3: Fix Existing Transporter Subscriptions
    console.log('\n👥 STEP 3: Fixing Existing Transporter Subscriptions...');
    await fixTransporterSubscriptions();
    
    // STEP 4: Fix Existing Broker Subscriptions
    console.log('\n👥 STEP 4: Fixing Existing Broker Subscriptions...');
    await fixBrokerSubscriptions();
    
    console.log('\n✅ ALL TRIAL SUBSCRIPTIONS FIXED SUCCESSFULLY!');
    console.log('=========================================\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

async function fixTransporterTrialPlans() {
  try {
    const snapshot = await db.collection('subscriptionPlans')
      .where('price', '==', 0)
      .get();
    
    if (snapshot.empty) {
      console.log('   ⚠️  No transporter trial plans found');
      return;
    }
    
    console.log(`   ✅ Found ${snapshot.size} transporter trial plan(s)`);
    
    for (const doc of snapshot.docs) {
      const plan = doc.data();
      console.log(`\n   📋 Plan: "${plan.name}"`);
      console.log(`      Current duration: ${plan.duration} days`);
      console.log(`      Current trialDays: ${plan.trialDays || 'not set'}`);
      
      const updates = {
        duration: 90,
        trialDays: 90,
        billingCycle: 'trial',
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      await db.collection('subscriptionPlans').doc(doc.id).update(updates);
      console.log(`      ✅ Updated to: 90 days`);
    }
    
    console.log(`\n   ✅ Fixed ${snapshot.size} transporter trial plan(s)`);
    
  } catch (error) {
    console.error('   ❌ Error fixing transporter trial plans:', error);
    throw error;
  }
}

async function fixBrokerTrialPlans() {
  try {
    const snapshot = await db.collection('recruiterPlans')
      .where('price', '==', 0)
      .get();
    
    if (snapshot.empty) {
      console.log('   ⚠️  No broker trial plans found');
      return;
    }
    
    console.log(`   ✅ Found ${snapshot.size} broker trial plan(s)`);
    
    for (const doc of snapshot.docs) {
      const plan = doc.data();
      console.log(`\n   📋 Plan: "${plan.name}"`);
      console.log(`      Current duration: ${plan.duration} days`);
      console.log(`      Current trialDays: ${plan.trialDays || 'not set'}`);
      
      const updates = {
        duration: 90,
        trialDays: 90,
        billingCycle: 'trial',
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      await db.collection('recruiterPlans').doc(doc.id).update(updates);
      console.log(`      ✅ Updated to: 90 days`);
    }
    
    console.log(`\n   ✅ Fixed ${snapshot.size} broker trial plan(s)`);
    
  } catch (error) {
    console.error('   ❌ Error fixing broker trial plans:', error);
    throw error;
  }
}

async function fixTransporterSubscriptions() {
  try {
    const subscribersSnapshot = await db.collection('subscribers')
      .where('isActive', '==', true)
      .get();
    
    if (subscribersSnapshot.empty) {
      console.log('   ⚠️  No active transporter subscriptions found');
      return;
    }
    
    console.log(`   ✅ Found ${subscribersSnapshot.size} active transporter subscription(s)`);
    
    let updatedCount = 0;
    
    for (const doc of subscribersSnapshot.docs) {
      const subscriber = doc.data();
      
      try {
        // Get the plan
        const planDoc = await db.collection('subscriptionPlans').doc(subscriber.planId).get();
        if (!planDoc.exists) {
          console.log(`   ⚠️  Plan not found for subscriber ${doc.id}`);
          continue;
        }
        
        const plan = planDoc.data();
        
        // Only process trial plans (price = 0)
        if (plan.price !== 0) continue;
        
        // Calculate expected endDate based on startDate + 90 days
        const startDate = subscriber.startDate.toDate ? subscriber.startDate.toDate() : new Date(subscriber.startDate);
        const expectedEndDate = new Date(startDate);
        expectedEndDate.setDate(expectedEndDate.getDate() + 90);
        
        const currentEndDate = subscriber.endDate.toDate ? subscriber.endDate.toDate() : new Date(subscriber.endDate);
        
        // Calculate actual days
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
        console.error(`   ❌ Error processing subscriber ${doc.id}:`, error.message);
      }
    }
    
    console.log(`\n   ✅ Fixed ${updatedCount} transporter trial subscription(s)`);
    
  } catch (error) {
    console.error('   ❌ Error fixing transporter subscriptions:', error);
    throw error;
  }
}

async function fixBrokerSubscriptions() {
  try {
    const subscribersSnapshot = await db.collection('recruiter_subscribers')
      .where('isActive', '==', true)
      .get();
    
    if (subscribersSnapshot.empty) {
      console.log('   ⚠️  No active broker subscriptions found');
      return;
    }
    
    console.log(`   ✅ Found ${subscribersSnapshot.size} active broker subscription(s)`);
    
    let updatedCount = 0;
    
    for (const doc of subscribersSnapshot.docs) {
      const subscriber = doc.data();
      
      try {
        // Get the plan
        const planDoc = await db.collection('recruiterPlans').doc(subscriber.planId).get();
        if (!planDoc.exists) {
          console.log(`   ⚠️  Plan not found for subscriber ${doc.id}`);
          continue;
        }
        
        const plan = planDoc.data();
        
        // Only process trial plans (price = 0)
        if (plan.price !== 0) continue;
        
        // Calculate expected endDate based on startDate + 90 days
        const startDate = subscriber.startDate.toDate ? subscriber.startDate.toDate() : new Date(subscriber.startDate);
        const expectedEndDate = new Date(startDate);
        expectedEndDate.setDate(expectedEndDate.getDate() + 90);
        
        const currentEndDate = subscriber.endDate.toDate ? subscriber.endDate.toDate() : new Date(subscriber.endDate);
        
        // Calculate actual days
        const actualDays = Math.floor((currentEndDate - startDate) / (1000 * 60 * 60 * 24));
        
        if (actualDays !== 90) {
          console.log(`\n   📍 User: ${subscriber.userId}`);
          console.log(`      Start: ${startDate.toISOString().split('T')[0]}`);
          console.log(`      Current End: ${currentEndDate.toISOString().split('T')[0]} (${actualDays} days)`);
          console.log(`      Expected End: ${expectedEndDate.toISOString().split('T')[0]} (90 days)`);
          
          await db.collection('recruiter_subscribers').doc(doc.id).update({
            endDate: admin.firestore.Timestamp.fromDate(expectedEndDate),
            updatedAt: admin.firestore.Timestamp.now()
          });
          
          console.log(`      ✅ Fixed to 90 days`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing subscriber ${doc.id}:`, error.message);
      }
    }
    
    console.log(`\n   ✅ Fixed ${updatedCount} broker trial subscription(s)`);
    
  } catch (error) {
    console.error('   ❌ Error fixing broker subscriptions:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixAllTrialSubscriptions().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = fixAllTrialSubscriptions;
