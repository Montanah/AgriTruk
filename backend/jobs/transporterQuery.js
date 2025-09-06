const admin = require("../config/firebase");
const db = admin.firestore();

/**
 * Query transporters based on expiry conditions
 * @param {string} expiryField - Field name (insuranceExpiryDate, driverLicenseExpiryDate, idExpiryDate)
 * @param {"expired"|"grace"|"expiring"} type - Which query to run
 * @param {number} days - Grace or expiring window in days
 */
async function queryTransporters(expiryField, type, days = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start, end;

  if (type === "expired") {
    end = admin.firestore.Timestamp.fromDate(today);
    return db.collection("transporters")
      .where(expiryField, "<", end)
      .get();
  }

//   if (type === "grace") {
//     end = admin.firestore.Timestamp.fromDate(today);
//     start = new Date(today);
//     start.setDate(start.getDate() - days);
//     start = admin.firestore.Timestamp.fromDate(start);

//     return db.collection("transporters")
//       .where(expiryField, ">=", start)
//       .where(expiryField, "<", end)
//       .get();
//   }

//   if (type === "expiring") {
//     start = admin.firestore.Timestamp.fromDate(today);
//     end = new Date(today);
//     end.setDate(end.getDate() + days);
//     end = admin.firestore.Timestamp.fromDate(end);

//     return db.collection("transporters")
//       .where(expiryField, ">=", start)
//       .where(expiryField, "<=", end)
//       .get();
//   }
// In your queryTransporters function
if (type === "expiring") {
    // Make sure 'days' is a Date object, not a number
    const targetDate = days instanceof Date ? days : new Date(days);
    
    if (isNaN(targetDate.getTime())) {
        throw new Error(`Invalid date: ${days}`);
    }
    
    const targetTimestamp = admin.firestore.Timestamp.fromDate(targetDate);
    
    return db.collection("transporters")
        .where(expiryField, "==", targetTimestamp)
        .get();
}

if (type === "grace") {
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);
    
    // 'days' should be a number here
    startDate.setDate(startDate.getDate() - days);
    
    const start = admin.firestore.Timestamp.fromDate(startDate);
    const end = admin.firestore.Timestamp.fromDate(endDate);

    return db.collection("transporters")
        .where(expiryField, ">=", start)
        .where(expiryField, "<", end)
        .get();
}

  return [];
}

function toTimestamp(value) {
  if (!value) return null;

  // Already Firestore Timestamp
  if (value instanceof admin.firestore.Timestamp) {
    return value;
  }

  // JS Date
  if (value instanceof Date) {
    return admin.firestore.Timestamp.fromDate(value);
  }

  // ISO string (or millis number)
  if (typeof value === "string" || typeof value === "number") {
    return admin.firestore.Timestamp.fromDate(new Date(value));
  }

  throw new Error(`Unsupported type for toTimestamp: ${typeof value}`);
}



/**
 * Process expiry checks for all transporter documents
 */
async function processExpiryNotifications() {
  const expiryFields = {
    insurance: "insuranceExpiryDate",
    driverLicense: "driverLicenseExpiryDate",
    id: "idExpiryDate",
  };

  const graceWindows = [1, 7, 14]; // days
  const expiringWindow = 30; // notify upcoming expiry within 30 days

  let results = {
    expiring_documents: [],
    expired_documents: [],
    grace_period_documents: [],
  };

  for (const [typeName, expiryField] of Object.entries(expiryFields)) {
    console.log(`🔍 Checking ${typeName} expiry field`);

    // Expired
    const expiredSnap = await queryTransporters(expiryField, "expired");
    expiredSnap.forEach(doc => {
      results.expired_documents.push({ id: doc.id, type: typeName, ...doc.data() });
    });

    // Grace periods
    for (const days of graceWindows) {
      const graceSnap = await queryTransporters(expiryField, "grace", days);
      graceSnap.forEach(doc => {
        results.grace_period_documents.push({ id: doc.id, type: typeName, graceDays: days, ...doc.data() });
      });
    }

    // Expiring soon
    const expiringSnap = await queryTransporters(expiryField, "expiring", expiringWindow);
    expiringSnap.forEach(doc => {
      results.expiring_documents.push({ id: doc.id, type: typeName, ...doc.data() });
    });
  }

  console.log("📊 Expiry results:", {
    expiring: results.expiring_documents.length,
    expired: results.expired_documents.length,
    grace: results.grace_period_documents.length,
  });

  return results;
}

module.exports = { queryTransporters, processExpiryNotifications };
