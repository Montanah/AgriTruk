const JobSeekerSchema = {
  // Basic Info
  jobSeekerId: "string",
  userId: "string",
  firstName: "string",
  lastName: "string",
  email: "string",
  phone: "string",
  dateOfBirth: "timestamp",
  gender: "string",
  age: "number",
  address: {
    street: "string",
    city: "string",
    county: "string",
    country: "string"
  },
  religion: "string | null",
  profilePhoto: "string | null",

  // Company Associations
  employmentStatus: "employed | independent | inactive",
  employedSince: "timestamp | null",

  // Verification Documents
  documents: {
    idDoc: {
      number: "string",
      url: "string",
      uploadedAt: "timestamp",
      status: "pending | approved | rejected",
      verifiedBy: "adminId",
      verifiedAt: "timestamp",
      expiryDate: "timestamp"
    },
    drivingLicense: {
      number: "string",
      url: "string",
      uploadedAt: "timestamp",
      status: "pending | approved | rejected",
      verifiedBy: "adminId",
      verifiedAt: "timestamp",
      expiryDate: "timestamp",
      vehicleClasses: ["B", "C", "D"] // Vehicle classes authorized
    },
    goodConductCert: {
      number: "string",
      url: "string",
      uploadedAt: "timestamp",
      status: "pending | approved | rejected",
      verifiedBy: "adminId",
      verifiedAt: "timestamp",
      expiryDate: "timestamp",
      isClean: true,
      isRenewed: false
    },
    psvBadge: {
      number: "string",
      url: "string",
      uploadedAt: "timestamp",
      status: "pending | approved | rejected",
      verifiedBy: "adminId",
      verifiedAt: "timestamp",
      expiryDate: "timestamp"
    },
    nightTravelLicense: {
      number: "string",
      url: "string",
      uploadedAt: "timestamp",
      status: "pending | approved | rejected",
      verifiedBy: "adminId",
      verifiedAt: "timestamp",
      expiryDate: "timestamp"
    },
    rslLicense: {
      number: "string",
      url: "string",
      uploadedAt: "timestamp",
      status: "pending | approved | rejected",
      verifiedBy: "adminId",
      verifiedAt: "timestamp",
      expiryDate: "timestamp"
    },
    backgroundCheck: {
      url: "string",
      uploadedAt: "timestamp",
      status: "pending | approved | rejected",
      verifiedBy: "adminId",
      verifiedAt: "timestamp",
      expiryDate: "timestamp"
    },
    goodsServiceLicense: {
      number: "string",
      url: "string",
      uploadedAt: "timestamp",
      status: "pending | approved | rejected",
      verifiedBy: "adminId",
      verifiedAt: "timestamp",
      expiryDate: "timestamp"
    }
  },

  // Experience & Qualifications
  experience: {
    experienceYears: 0,
    startDate: "timestamp",
    vehicleClassesExperience: ["B", "C", "D"], // Classes they've driven
    experienceDescription: "string | null",
    specializations: ["local", "regional", "cross-border", "hazmat"]
  },

  // SACCO/Fleet Details (Gold requirement)
  saccoDetails: {
    name: "string | null",
    membershipNumber: "string | null",
    verificationStatus: "pending | verified | not-applicable"
  },

  // Cross-border Verification (Platinum requirement)
  crossBorderVerification: {
    eacVerified: false,
    countries: ["KE", "UG", "TZ", "RW", "BI", "SS"],
    verifiedAt: "timestamp | null"
  },

  // Training
  training: {
    basicSafetyCompleted: false,
    basicSafetyDate: "timestamp | null",
    advancedTrainingEligible: false,
    advancedTrainingCompleted: false,
    advancedTrainingDate: "timestamp | null",
    certificates: []
  },

  // Performance Metrics
  performance: {
    platformRating: 0,
    totalRatings: 0,
    completedTrips: 0,
    onTimeDeliveryRate: 0,
    incidentReports: 0,
    lastIncidentDate: "timestamp | null"
  },

  // Tier Eligibility (Auto-calculated)
  tierEligibility: {
    silverEligible: false,
    goldEligible: false,
    platinumEligible: false,
    eligibilityCheckedAt: "timestamp",
    blockingReasons: []
  },

  // Metadata
  createdAt: "timestamp",
  updatedAt: "timestamp",
  status: "pending_approval | approved | rejected",
  approvedAt: "timestamp",
  approvedBy: "adminId",
  rejectedAt: "timestamp",
  rejectedBy: "adminId",
  rejectionReason: "string | null"
};

module.exports = JobSeekerSchema;