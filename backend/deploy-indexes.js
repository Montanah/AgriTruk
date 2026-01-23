const admin = require('./config/firebase');

async function deployIndexes() {
  try {
    await admin.firestore().enableIndexing();
    console.log('✅ Indexes deployed successfully');
    
  } catch (error) {
    console.error('❌ Error deploying indexes:', error);
  }
}

deployIndexes();
