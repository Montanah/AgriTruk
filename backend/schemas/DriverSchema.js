const DriverSchema = {
  driverId: "string",
  companyId: "string | null",
  firstName: "string | null",
  lastName: "string | null",
  email: "string | null",
  phone: "string | null",
  profileImage: "string | null",
  idDocumentUrl: "string | null",
  idExpiryDate: "timestamp | null",
  idApproved: "boolean",
  driverLicense: "string | null",
  driverLicenseUrl: "string | null",
  driverLicenseExpiryDate: "timestamp | null",
  driverLicenseApproved: "boolean",
  status: "pending | approved | recruited | active | inactive | suspended",
  assignedVehicleId: "string | null",
  assignedVehicleDetails: {
    capacityKg: "number | null",
    refrigerated: "boolean",
    humidityControl: "boolean",
    inUse: "boolean"
  } | null,
  currentRoute: [
    {
      location: {
        latitude: "number",
        longitude: "number"
      },
      timestamp: "timestamp",
      stopType: "pickup | dropoff | waypoint"
    }
  ] | null,
  lastKnownLocation: {
    latitude: "number",
    longitude: "number"
  } | null,
  acceptedLoads: [
    {
      bookingId: "string",
      status: "accepted | inTransit | delivered",
      acceptedAt: "timestamp",
      pickUpDate: "timestamp"
    }
  ] | null,
  currentLoadStatus: "idle | inTransit | delivered | null",
  availability: "boolean",
  rejectionReason: "string | null",
  userId: "string | null",
  role: "string",
  isDefaultPassword: "boolean",
  createdAt: "timestamp",
  updatedAt: "timestamp",
  lastActiveAt: "timestamp | null"
};

module.exports = DriverSchema;