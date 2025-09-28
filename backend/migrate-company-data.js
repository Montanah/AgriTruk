const admin = require('./config/firebase');
const db = admin.firestore();

async function migrateCompanyData() {
  try {
    console.log('🔄 Starting company data migration...');
    
    const userId = '77aA8yBjstWmMjYDZMTHLDf3JbL2';
    
    // Get the company
    const companyQuery = await db.collection('companies')
      .where('transporterId', '==', userId)
      .limit(1)
      .get();
    
    if (companyQuery.empty) {
      console.log('❌ No company found for user:', userId);
      return;
    }
    
    const companyDoc = companyQuery.docs[0];
    const companyData = companyDoc.data();
    const companyId = companyDoc.id;
    
    console.log('✅ Found company:', companyId);
    console.log('Company name:', companyData.companyName);
    
    // Check if company has the required fields
    const requiredFields = ['companyName', 'companyRegistration', 'companyContact', 'companyEmail', 'transporterId', 'status'];
    const missingFields = requiredFields.filter(field => !companyData[field]);
    
    if (missingFields.length > 0) {
      console.log('⚠️  Missing required fields:', missingFields);
    } else {
      console.log('✅ All required fields present');
    }
    
    // Check if we need to add any default values
    const updates = {};
    
    if (!companyData.createdAt) {
      updates.createdAt = new Date();
      console.log('➕ Adding createdAt field');
    }
    
    if (!companyData.updatedAt) {
      updates.updatedAt = new Date();
      console.log('➕ Adding updatedAt field');
    }
    
    if (!companyData.rating) {
      updates.rating = 0;
      console.log('➕ Adding default rating');
    }
    
    // Apply updates if needed
    if (Object.keys(updates).length > 0) {
      await companyDoc.ref.update(updates);
      console.log('✅ Company data updated');
    } else {
      console.log('✅ Company data is already properly structured');
    }
    
    // Check vehicles and drivers
    const vehiclesQuery = await db.collection('vehicles')
      .where('companyId', '==', companyId)
      .get();
    
    const driversQuery = await db.collection('drivers')
      .where('companyId', '==', companyId)
      .get();
    
    console.log('📊 Current fleet data:');
    console.log('- Vehicles:', vehiclesQuery.size);
    console.log('- Drivers:', driversQuery.size);
    
    if (vehiclesQuery.size === 0 && driversQuery.size === 0) {
      console.log('ℹ️  No fleet data yet - this is normal for a new company');
      console.log('   The company can start adding vehicles and drivers through the app');
    }
    
    console.log('✅ Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  migrateCompanyData();
}

module.exports = migrateCompanyData;

