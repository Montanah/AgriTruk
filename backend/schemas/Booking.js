const bookingExportSchema = {
  // Essential identifiers
  bookingId: true,
  requestId: true,
  
  // Booking details
  bookingType: true,
  bookingMode: true,
  status: true,
  
  // Location information
  fromLocation: true,
  toLocation: true,
  
  // Cargo details
  productType: true,
  weightKg: true,
  specialCargo: true,
  
  // Financial information
  cost: true,
  fuelSurcharge: true,
  waitTimeFee: true,
  
  // Timestamps (formatted)
  pickUpDate: true,
  acceptedAt: true,
  createdAt: true,
  updatedAt: true,
  
  // Additional useful info
  urgencyLevel: true,
  perishable: true,
  needsRefrigeration: true,
  insured: true,
  additionalNotes: true
};

// Utility function to format Firestore timestamps
const formatFirestoreTimestamp = (timestamp) => {
  if (!timestamp || !timestamp._seconds) return 'N/A';
  
  const date = new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
  return date.toLocaleString(); // Format based on locale
};

// Enhanced filter function with timestamp formatting
const filterAndFormatBookings = (bookings, schema) => {
  return bookings.map(item => {
    const filteredItem = {};
    
    Object.keys(schema).forEach(key => {
      if (schema[key] && item[key] !== undefined) {
        // Format timestamps
        if (key.includes('At') || key.includes('Date')) {
          filteredItem[key] = formatFirestoreTimestamp(item[key]);
        } else {
          filteredItem[key] = item[key];
        }
      }
    });
    
    return filteredItem;
  });
};

module.exports = { bookingExportSchema, filterAndFormatBookings, formatFirestoreTimestamp };