const admin = require("../config/firebase");
const db = admin.firestore();
const JobSeekerSchema = require('../schemas/JobSeekerSchema');
const { uploadImage } = require('../utils/upload');


function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  const ageDifMs = Date.now() - birthDate.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function initializeDocuments(providedDocs, timestamp) {
  const defaultDoc = {
    number: null,
    url: "",
    uploadedAt: null,
    status: "pending",
    verifiedBy: null,
    verifiedAt: null,
    expiryDate: null
  };

  return {
    idDoc: {
      ...defaultDoc,
      url: providedDocs.idDoc || "",
      uploadedAt: providedDocs.idDoc ? timestamp : null,
    },
    drivingLicense: {
      ...defaultDoc,
      vehicleClasses: [],
      url: providedDocs.drivingLicense || "",
      uploadedAt: providedDocs.drivingLicense ? timestamp : null,
    },
    goodConductCert: {
      ...defaultDoc,
      url: providedDocs.goodConductCert || "",
      uploadedAt: providedDocs.goodConductCert ? timestamp : null,
      isClean: true,
      isRenewed: false,
      number: null 
    },
    goodsServiceLicense: {
      ...defaultDoc,
      url: providedDocs.gslLicence || "",
      uploadedAt: providedDocs.gslLicence ? timestamp : null,
    },
    psvBadge: { ...defaultDoc },
    nightTravelLicense: { ...defaultDoc },
    rslLicense: { ...defaultDoc },
    backgroundCheck: { ...defaultDoc, number: null } 
  };
}

const JobSeeker = {
  // Validate data against schema
  validateData(data) {
    const requiredFields = ['userId', 'dateOfBirth', 'gender'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return true;
  },

  // Create a new job seeker
  async create(data) {
    try {
      this.validateData(data);

      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      const userRef = db.collection('users').doc(data.userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        throw new Error('User not found');
      }
      const userData = userSnap.data();

      const age = calculateAge(data.dateOfBirth);

      const jobSeekerData = {
        jobSeekerId: db.collection('job_seekers').doc().id,
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        userId: data.userId,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        age,
        address: data.address || { street: '', city: '', county: '', country: '' },
        religion: data.religion || '',
        profilePhoto: data.profilePhoto || null,
        documents: initializeDocuments(data.documents || {}, timestamp),
        experience: data.experience || {
          experienceYears: 0,
          startDate: null,
          vehicleClassesExperience: [],
          experienceDescription: null,
          specializations: []
        },
        employmentStatus: 'inactive',
        employedSince: null,
        saccoDetails: {
          name: null,
          membershipNumber: null,
          verificationStatus: 'not-applicable'
        },
        crossBorderVerification: {
          eacVerified: false,
          countries: [],
          verifiedAt: null
        },
        training: {
          basicSafetyCompleted: false,
          basicSafetyDate: null,
          advancedTrainingEligible: false,
          advancedTrainingCompleted: false,
          advancedTrainingDate: null,
          certificates: []
        },
        performance: {
          platformRating: 0,
          totalRatings: 0,
          completedTrips: 0,
          onTimeDeliveryRate: 0,
          incidentReports: 0,
          lastIncidentDate: null
        },
        tierEligibility: {
          silverEligible: false,
          goldEligible: false,
          platinumEligible: false,
          eligibilityCheckedAt: timestamp,
          blockingReasons: []
        },
        status: 'pending_approval',
        approvedAt: null,
        approvedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const docRef = await db.collection('job_seekers').doc(jobSeekerData.jobSeekerId).set(jobSeekerData);
      return { id: docRef.id, ...jobSeekerData };
    } catch (error) {
      throw new Error(`Error creating job seeker: ${error.message}`);
    }
  },

  // Update a job seeker
  async update(id, data) {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const updateData = {
      ...data,
      updatedAt: timestamp
    };

    await db.collection('job_seekers').doc(id).update(updateData);
    return this.get(id);
  },

  // Delete a job seeker
  async delete(id) {
    await db.collection('job_seekers').doc(id).delete();
    return { id, message: "Job seeker deleted successfully" };
  },

  // Get a job seeker by ID
  async get(id) {
    const doc = await db.collection('job_seekers').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // Get job seeker by user ID
  async getByUserId(userId) {
    const snapshot = await db.collection('job_seekers')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  // Get all job seekers with optional filters
  async getAll(filters = {}) {
    let query = db.collection('job_seekers');
    
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    // Add other filters as needed (e.g., experience, vehicleClass from PDF for company browse, but that's separate)

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Get job seeker by email
  async getByEmail(email) {
    const snapshot = await db.collection('job_seekers')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  // Upload documents (multiple)
  async uploadDocuments(id, files) {
    const uploadedFiles = {};
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const updateData = { updatedAt: timestamp };
    
    const validDocumentTypes = ['profilePhoto', 'driverLicense', 'goodConductCert', 'goodsServiceLicence', 'idDoc'];

    for (const field in files) {
      if (!validDocumentTypes.includes(field)) {
        console.log(`Ignoring unexpected field: ${field}`);
        continue;
      }
      const file = files[field][0]; // assuming multer array
      const filePath = `job_seekers/${id}/documents/${field}_${Date.now()}.${file.originalname.split('.').pop()}`;
      const tempPath = `/tmp/${filePath}`; // Temporary file path for Cloudinary
      await fs.promises.writeFile(tempPath, file.buffer); // Write buffer to temp file

      const url = await uploadImage(tempPath);
      fs.promises.unlink(tempPath); // Clean up temp file

      if (url) {
        uploadedFiles[field] = url;
        updateData[`documents.${field}.url`] = url;
        updateData[`documents.${field}.uploadedAt`] = timestamp;
        updateData[`documents.${field}.status`] = 'pending';
      }
    }

    await db.collection('job_seekers').doc(id).update(updateData);
    return uploadedFiles;
  },

  // Get document signed URLs
  async getDocumentUrls(id) {
    const jobSeeker = await this.get(id);
    if (!jobSeeker) throw new Error('Job seeker not found');

    const documents = jobSeeker.documents;
    const signedDocuments = {};

    for (const type in documents) {
      const doc = documents[type];
      if (doc.url) {
        signedDocuments[type] = doc.url; // Using Cloudinary URL directly as it's already secure
      }
    }

    return signedDocuments;
  },

  // Update document status
  async updateDocumentStatus(jobSeekerId, documentType, status, verifiedBy = null) {
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid document status');
    }

    const updateData = {
      [`documents.${documentType}.status`]: status,
      [`documents.${documentType}.verifiedAt`]: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (verifiedBy) {
      updateData[`documents.${documentType}.verifiedBy`] = verifiedBy;
    }

    await db.collection('job_seekers').doc(jobSeekerId).update(updateData);
    return this.get(jobSeekerId);
  },

  // Update application status (approve/reject)
  async updateApplicationStatus(jobSeekerId, status, adminNotes, adminId) {
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (status === 'approved') {
      updateData.approvedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.approvedBy = adminId;
    } else {
      updateData.rejectedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.rejectedBy = adminId;
      updateData.rejectionReason = adminNotes;
    }

    await db.collection('job_seekers').doc(jobSeekerId).update(updateData);
    return this.get(jobSeekerId);
  },

  // Get status
  async getStatus(jobSeekerId) {
    const jobSeeker = await this.get(jobSeekerId);
    if (!jobSeeker) throw new Error('Job seeker not found');
    return {
      status: jobSeeker.status,
      message: jobSeeker.rejectionReason || ''
    };
  },

  // Update tier
  async updateTier(jobSeekerId, newTier) {
    const validTiers = ['silver', 'gold', 'platinum'];
    if (!validTiers.includes(newTier)) {
      throw new Error('Invalid tier');
    }

    const jobSeeker = await this.get(jobSeekerId);
    if (!jobSeeker) {
      throw new Error('Job seeker not found');
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Update current tier and add to history (assuming tierHistory exists in extended schema)
    const tierHistory = jobSeeker.tierHistory || [];
    tierHistory.push({
      tier: newTier,
      achievedAt: timestamp,
      downgradedAt: null
    });

    const updateData = {
      currentTier: newTier,
      tierHistory,
      updatedAt: timestamp
    };

    await db.collection('job_seekers').doc(jobSeekerId).update(updateData);
    return this.get(jobSeekerId);
  },

  async getApprovedJobSeekers() {
    const snapshot = await db.collection('job_seekers').where('status', '==', 'approved').get();
    const jobSeekers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return jobSeekers;
  },

  async getJobSeekerById(jobSeekerId) {
    try {
      console.log('Fetching job seeker with ID:', jobSeekerId);
      const jobSeekerSnap = await db.collection('job_seekers').doc(jobSeekerId).get();
      console.log(jobSeekerSnap);
      if (!jobSeekerSnap.exists()) {
        return null;
      }

      const data = jobSeekerSnap.data();
      return {
        jobSeekerId: jobSeekerSnap.id,
        userId: data.userId || '',
        firstName: data.firstName || '',
        dateOfBirth: data.dateOfBirth || null, // Firestore Timestamp
        gender: data.gender || '',
        age: data.age || 0,
        address: {
          street: data.address?.street || '',
          city: data.address?.city || '',
          county: data.address?.county || '',
          country: data.address?.country || ''
        },
        religion: data.religion || null,
        profilePhoto: data.profilePhoto || null,
        experience: {
          experienceYears: data.experience?.experienceYears || 0,
          startDate: data.experience?.startDate || null, // Firestore Timestamp
          vehicleClassesExperience: data.experience?.vehicleClassesExperience || [],
          experienceDescription: data.experience?.experienceDescription || null,
          specializations: data.experience?.specializations || []
        }
      };
    } catch (error) {
      console.error(`Error fetching job seeker ${jobSeekerId}:`, error);
      throw new Error('Failed to fetch job seeker details');
    }
  },
  
  async getPreview()
  {
    try {
      const querySnapshot = await db.collection('job_seekers').where('status', '==', 'approved').get();
      
      const jobSeekers = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        jobSeekers.push({
          jobSeekerId: doc.id,
          userId: data.userId || '',
          firstName: data.firstName || '',
          dateOfBirth: data.dateOfBirth || null,
          gender: data.gender || '',
          age: data.age || 0,
          address: {
            street: data.address?.street || '',
            city: data.address?.city || '',
            county: data.address?.county || '',
            country: data.address?.country || '',
          },
          religion: data.religion || null,
          profilePhoto: data.profilePhoto || null,
          experience: {
            experienceYears: data.experience?.experienceYears || 0,
            startDate: data.experience?.startDate || null,
            vehicleClassesExperience: data.experience?.vehicleClassesExperience || [],
            experienceDescription: data.experience?.experienceDescription || null,
            specializations: data.experience?.specializations || [],
          },
        });
      });
      return jobSeekers;
    } catch (error) {
      console.error('Error fetching approved job seekers:', error);
      throw new Error('Failed to fetch approved job seekers');
    }
  },

  // Get schema for reference
  getSchema() {
    return JobSeekerSchema;
  }
};

module.exports = JobSeeker;