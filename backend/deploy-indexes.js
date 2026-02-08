const admin = require('./config/firebase');

async function deployIndexes() {
  try {
    console.log('🚀 Deploying Firestore indexes...');
    
    // The indexes will be automatically created when the queries are first run
    // But we can also create them manually using the Firebase CLI
    console.log('📋 Indexes to be created:');
    console.log('1. Collection: vehicles, Fields: companyId (ASC), createdAt (DESC)');
    console.log('2. Collection: drivers, Fields: companyId (ASC), createdAt (DESC)');
    
    console.log('✅ Index configuration ready!');
    console.log('💡 To deploy indexes, run: firebase deploy --only firestore:indexes');
    console.log('🔗 Or create them manually in Firebase Console:');
    console.log('   https://console.firebase.google.com/v1/r/project/agritruk-d543b/firestore/indexes');
    
  } catch (error) {
    console.error('❌ Error deploying indexes:', error);
  }
}

deployIndexes();
