const JobSeeker = require('../models/JobSeeker');
const User = require('../models/User');
const { uploadImage } = require('../utils/upload');
const fs = require('fs');
const Action = require('../models/Action');
const sendEmail = require("../utils/sendEmail");
const SMSService = require('../utils/sendSms');
const smsService = new SMSService(process.env.MOBILESASA_API_TOKEN);
const formatPhoneNumber = require("../utils/formatPhone");
const admin = require("../config/firebase");
const { getRejectTemplate } = require("../utils/sendMailTemplate");
const { formatTimestamps } = require('../utils/formatData');
const { logActivity, logAdminActivity } = require('../utils/activityLogger');
const Notification = require('../models/Notification');
const Company = require('../models/Company');

const jobSeekerController = {
  // POST /api/job-seekers - Submit job seeker application (Step 1)
  async submitApplication(req, res) {
    try {
      const uid = req.user.uid;

      // Check if job seeker exists
      const seeker = await JobSeeker.getByUserId(uid);
      if (seeker) {
        return res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: "Job seeker already exists" }
        });
      }

      const jobSeekerData = req.body;
      const user = await User.get(uid);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" }
        });
      }

      const userId = uid;
      const name = user.name;
      const email = user.email;
      const phone = user.phone;

      let address = jobSeekerData.address ? JSON.parse(jobSeekerData.address) : undefined;
      let experience = jobSeekerData.experience ? JSON.parse(jobSeekerData.experience) : undefined;

      const files = req.files || [];
      let profilePhoto = null;
      let idDocUrl = null;
      let drivingLicenseUrl = null;
      let goodConductCertUrl = null;
      let gslUrl = null;

      if (files.length > 0) {
        const uploadTasks = files.map(async file => {
          const fieldName = file.fieldname;

          console.log(`Processing file: ${fieldName}, path: ${file.path}`);

          const uploadedUrl = await uploadImage(file.path);
          fs.unlinkSync(file.path); // clean temp file

          switch (fieldName) {
            case 'profilePhoto':
              profilePhoto = uploadedUrl;
              break;
            case 'idDoc':
              idDocUrl = uploadedUrl;
              break;
            case 'drivingLicense':
              drivingLicenseUrl = uploadedUrl;
              break;
            case 'goodConductCert':
              goodConductCertUrl = uploadedUrl;
              break;
            case 'gsl':
              gslUrl = uploadedUrl;
              break;
            default:
              console.log(`Ignoring unexpected field: ${fieldName}`);
          }
        });

        await Promise.all(uploadTasks);
      }
      // ✅ Inject uploaded document URLs as flat strings
      const documents = {
        idDoc: idDocUrl,
        drivingLicense: drivingLicenseUrl,
        goodConductCert: goodConductCertUrl,
        gslLicence: gslUrl
      };

      console.log("Job Seeker data:", documents.drivingLicense);
      const jobSeeker = await JobSeeker.create({
        userId,
        name,
        email,
        phone,
        ...jobSeekerData,
        address,
        experience,
        profilePhoto,
        documents
      });

      await logActivity(uid, "Job Seeker Application", "Submitted");

      await Action.create({
        type: 'jobSeekerApplication',
        entityId: jobSeeker.id,
        priority: 'high',
        metadata: {
          name: jobSeeker.name
        },
        message: `A new job seeker has been created. Job Seeker ID: ${jobSeeker.id}`,
      });

      res.status(201).json({
        success: true,
        application: jobSeeker,
        nextStep: "experience_details"
      });

    } catch (error) {
      console.error("Error creating job seeker:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message
        }
      });
    }
  },

  // PUT /api/job-seekers/{jobSeekerId} - Complete application (Step 2: Experience)
  async completeApplication(req, res) {
    try {
      const userId = req.user.uid;
      const experience = req.body;

      const jobseeker = await JobSeeker.getByUserId(userId);
      if (!jobseeker) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job seeker not found" } });
      }
      const jobSeekerId = jobseeker.id;

      const updatedJobSeeker = await JobSeeker.update(jobSeekerId, { experience });
      if (!updatedJobSeeker) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job seeker not found" } });
      }
      
      await logActivity(userId, "Job Seeker Application", "Completed");

      res.status(200).json({
        success: true,
        application: updatedJobSeeker,
        status: "pending_approval"
      });
    } catch (error) {
      console.error("Error completing application:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message
        }
      });
    }
  },

  // GET /api/job-seekers/{jobSeekerId} - Get job seeker application by ID
  async getApplicationById(req, res) {
    try {
      const { jobSeekerId } = req.params;
      const jobSeeker = await JobSeeker.get(jobSeekerId);
      if (!jobSeeker) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job seeker not found" } });
      }
      res.status(200).json({
        success: true,
        application: jobSeeker
      });
    } catch (error) {
      console.error("Error fetching job seeker:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error"
        }
      });
    }
  },

  // GET /api/job-seekers/user/{userId} - Get job seeker application by user ID
  async getApplicationByUserId(req, res) {
    try {
      const { userId } = req.params;
      const jobSeeker = await JobSeeker.getByUserId(userId);
      if (!jobSeeker) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job seeker not found" } });
      }
      res.status(200).json({
        success: true,
        application: jobSeeker
      });
    } catch (error) {
      console.error("Error fetching job seeker by user ID:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error"
        }
      });
    }
  },

  // PATCH /api/job-seekers/{jobSeekerId}/upload - Upload documents (multipart/form-data)
  // async uploadDocuments(req, res) {
  //   try {
  //     const userId = req.user.uid;
  //     const jobseeker = await JobSeeker.getByUserId(userId);
  //     if (!jobseeker) {
  //       return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job seeker not found" } });
  //     }
  //     const jobSeekerId  = jobseeker.id;
  //     if (!req.files || Object.keys(req.files).length === 0) {
  //       return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "No files uploaded" } });
  //     }
  //     const uploadedFiles = await JobSeeker.uploadDocuments(jobSeekerId, req.files);
  //     res.status(200).json({
  //       success: true,
  //       uploadedFiles
  //     });
  //   } catch (error) {
  //     console.error("Error uploading documents:", error);
  //     res.status(400).json({
  //       success: false,
  //       error: {
  //         code: "BAD_REQUEST",
  //         message: error.message
  //       }
  //     });
  //   }
  // },
  async uploadDocuments(req, res) {
    try {
      const userId = req.user.uid;

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      // Fetch job seeker
      const jobSeeker = await JobSeeker.getByUserId(userId);
      if (!jobSeeker) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job seeker not found" } });
      }

      const jobSeekerId = jobSeeker.id;
      let updateData = {};

      // Track if sensitive docs changed
      let sensitiveDocsChanged = false;
      let changedFields = [];

      const uploadTasks = Object.values(req.files).map(async file => {
        const fieldName = file.fieldname;
        const publicId = await uploadImage(file.path);

        if (publicId) {
          switch (fieldName) {
            case 'profilePhoto':
              updateData.profilePhoto = publicId;  // Replace profile photo
              break;
            case 'drivingLicense':
              updateData.documents = updateData.documents || {};
              updateData.documents.drivingLicense = { url: publicId, approved: false };
              sensitiveDocsChanged = true;
              changedFields.push('Driver License');
              break;
            case 'goodConductCert':
              updateData.documents = updateData.documents || {};
              updateData.documents.goodConductCert = { url: publicId, approved: false };
              sensitiveDocsChanged = true;
              changedFields.push('Good Conduct Certificate');
              break;
            case 'goodsServiceLicense':
              updateData.documents = updateData.documents || {};
              updateData.documents.goodsServiceLicense = { url: publicId, approved: false };
              sensitiveDocsChanged = true;
              changedFields.push('Goods Service License');
              break;
            case 'idDoc':
              updateData.documents = updateData.documents || {};
              updateData.documents.idDoc = { url: publicId, approved: false };
              sensitiveDocsChanged = true;
              changedFields.push('ID Document');
              break;
            default:
              console.log(`Ignoring unexpected field: ${fieldName}`);
          }
        }

        fs.unlinkSync(file.path);
      });

      await Promise.all(uploadTasks);

      // If any sensitive doc changed, set status to renewal
      if (sensitiveDocsChanged) {
        updateData.status = 'renewal';

        await Action.create({
          type: 'job_seeker_review',
          entityId: { id: jobSeekerId, email: jobSeeker.email },
          priority: 'high',
          metadata: {
            changedFields,
          },
          message: `Job Seeker ${jobSeeker.name} updated sensitive documents: ${changedFields.join(', ')}`
        });
      }

      // Update job seeker root fields
      // updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await JobSeeker.update(jobSeekerId, updateData);

      await logActivity(userId, "Job Seeker Documents", "Updated");

      await Action.create({
        type: 'job_seeker_review',
        entityId: { id: jobSeekerId, email: jobSeeker.email },
        priority: 'high',
        metadata: {
          changedFields,
        },
        message: `Job Seeker ${jobSeeker.name} updated documents: ${changedFields.join(', ')}`
      })

      return res.status(200).json({
        success: true,
        message: 'Documents updated successfully',
        updateData,
      });
    } catch (error) {
      console.error('Error uploading documents:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  },

  // GET /api/job-seekers/{jobSeekerId}/documents - Get signed URLs for documents
  async getDocuments(req, res) {
    try {
      const { jobSeekerId } = req.params;
      const documents = await JobSeeker.getDocumentUrls(jobSeekerId);
      res.status(200).json({
        success: true,
        documents
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error"
        }
      });
    }
  },

  // PATCH /api/job-seekers/{jobSeekerId}/status - Admin approve/reject
  async updateApplicationStatus(req, res) {
    try {
      const { jobSeekerId } = req.params;
      const { status, adminNotes } = req.body;
      const adminId = req.user.id; // Assuming auth middleware provides req.user
      const updatedJobSeeker = await JobSeeker.updateApplicationStatus(jobSeekerId, status, adminNotes, adminId);
      res.status(200).json({
        success: true,
        application: updatedJobSeeker
      });
    } catch (error) {
      console.error("Error updating status:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message
        }
      });
    }
  },

  // GET /api/job-seekers/{jobSeekerId}/status - Get job seeker status
  async getApplicationStatus(req, res) {
    try {
      const { jobSeekerId } = req.params;
      const statusInfo = await JobSeeker.getStatus(jobSeekerId);
      res.status(200).json({
        success: true,
        status: statusInfo.status,
        message: statusInfo.message
      });
    } catch (error) {
      console.error("Error fetching status:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error"
        }
      });
    }
  },

  // GET /api/job-seekers - Get all (for admin)
  async getAllJobSeekers(req, res) {
    try {
      const filters = req.query; // status, etc.
      const jobSeekers = await JobSeeker.getAll(filters);
      res.status(200).json({
        success: true,
        jobSeekers: formatTimestamps(jobSeekers),
        count: jobSeekers.length
      });
    } catch (error) {
      console.error("Error fetching all job seekers:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error"
        }
      });
    }
  },

  // Additional endpoints from provided code
  async updateJobSeeker(req, res) {
    try {
      const userId = req.user.uid;
      const jobseeker = await JobSeeker.getByUserId(userId);
      if (!jobseeker) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job seeker not found" } });
      }

      const id = jobseeker.id;
      const updateData = req.body;

      const updatedJobSeeker = await JobSeeker.update(id, updateData);
      if (!updatedJobSeeker) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job seeker not found" } });
      }

      await logActivity(userId, "Job Seeker", "Updated");

      await Action.create({
        type: 'job_seeker_review',
        entityId: { id: id, email: jobseeker.email },
        priority: 'high',
        metadata: {
          changedFields: Object.keys(updateData),
        },
        message: `Job Seeker ${jobseeker.name} updated: ${Object.keys(updateData).join(', ')}`
      });

      res.status(200).json({
        success: true,
        application: updatedJobSeeker
      });
    } catch (error) {
      console.error("Error updating job seeker:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message
        }
      });
    }
  },

  async deleteJobSeeker(req, res) {
    try {
      const { id } = req.params;
      const result = await JobSeeker.delete(id);

      await logAdminActivity(req.user.id, "Job Seeker", "Deleted");

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error("Error deleting job seeker:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error"
        }
      });
    }
  },

  async updateDocumentStatus(req, res) {
    try {
      const { id, documentType } = req.params;
      const { status, verifiedBy } = req.body;
      const updatedJobSeeker = await JobSeeker.updateDocumentStatus(id, documentType, status, verifiedBy);
      res.status(200).json({
        success: true,
        application: updatedJobSeeker
      });
    } catch (error) {
      console.error("Error updating document status:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message
        }
      });
    }
  },

  async updateTier(req, res) {
    try {
      const { id } = req.params;
      const { tier } = req.body;
      const updatedJobSeeker = await JobSeeker.updateTier(id, tier);
      res.status(200).json({
        success: true,
        application: updatedJobSeeker
      });
    } catch (error) {
      console.error("Error updating tier:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message
        }
      });
    }
  },

  async getJobSeekerByEmail(req, res) {
    try {
      const { email } = req.params;
      const jobSeeker = await JobSeeker.getByEmail(email);
      if (!jobSeeker) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job seeker not found" } });
      }
      res.status(200).json({
        success: true,
        application: jobSeeker
      });
    } catch (error) {
      console.error("Error fetching job seeker by email:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error"
        }
      });
    }
  },

  async getSchema(req, res) {
    try {
      const schema = JobSeeker.getSchema();
      res.status(200).json({
        success: true,
        schema
      });
    } catch (error) {
      console.error("Error fetching schema:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error"
        }
      });
    }
  },

  async reviewJobSeeker(req, res) {
    try {
      const jobSeekerId = req.params.jobSeekerId;
      const { action, reason, expiryDate } = req.body; // expiryDate can be specific to each document type

      // 1. Check if job seeker exists
      const jobSeeker = await JobSeeker.get(jobSeekerId);
      if (!jobSeeker) {
        return res.status(404).json({ message: 'Job seeker not found' });
      }

      // 2. Check if already approved/rejected
      const isFullyApproved = ['idDoc', 'drivingLicense', 'goodConductCert', 'goodsServiceLicense'].every(
        doc => jobSeeker.documents[doc]?.status === 'approved'
      );
      if (isFullyApproved && ['approve-idDoc', 'approve-drivingLicense', 'approve-goodConductCert', 'approve-goodsServiceLicense'].includes(action)) {
        return res.status(400).json({ message: 'Job seeker already fully approved' });
      }
      if (jobSeeker.status === 'rejected' && action === 'reject') {
        return res.status(400).json({ message: 'Job seeker already rejected' });
      }

      let updates = {};

      // Handle individual document approvals
      const documentActions = {
        'approve-idDoc': 'idDoc',
        'approve-drivingLicense': 'drivingLicense',
        'approve-goodConductCert': 'goodConductCert',
        'approve-goodsServiceLicense': 'goodsServiceLicense'
      };

      const docType = documentActions[action];
      if (docType) {
        if (!expiryDate) {
          return res.status(400).json({ message: `${docType} expiryDate is required` });
        }
        updates = {
          documents: {
            ...jobSeeker.documents,
            [docType]: {
              ...jobSeeker.documents[docType],
              status: 'approved',
              verifiedBy: req.user.uid,
              verifiedAt: admin.firestore.Timestamp.now(),
              expiryDate: admin.firestore.Timestamp.fromDate(new Date(expiryDate)),
            },
          },
          updatedAt: admin.firestore.Timestamp.now(),
        };
        await JobSeeker.update(jobSeekerId, updates);

        // Check if all critical documents are approved
        const allApproved = ['idDoc', 'drivingLicense', 'goodConductCert', 'goodsServiceLicense'].every(
          doc => updates.documents[doc]?.status === 'approved'
        );
        if (allApproved) {
          updates = {
            ...updates,
            status: 'approved',
            approvedAt: admin.firestore.Timestamp.now(),
            approvedBy: req.user.uid,
            updatedAt: admin.firestore.Timestamp.now(),
          };
          await JobSeeker.update(jobSeekerId, updates);

          await sendEmail({
            to: jobSeeker.email,
            subject: 'Job Seeker Approved',
            html: getRejectTemplate("Job Seeker Approved", `<br> <br> Your job seeker account has been approved. <br> <br> Thank you for using our services. <br> <br> Best regards, <br> ${process.env.APP_NAME}`, jobSeeker),
            text: 'Your job seeker account has been approved. Welcome to our platform!'
          });

          const formattedPhone = formatPhoneNumber(jobSeeker.phone);
          const smsMessage = 'Your job seeker documents have been approved. Welcome aboard!';
          await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

          await logAdminActivity(
            req.user.uid,
            'approve_job_seeker',
            req,
            { type: 'job_seeker', id: jobSeekerId }
          );
        }
        return res.status(200).json({ message: `${docType} approved`, updates });
      }

      // Handle rejection
      if (action === 'reject') {
        updates = {
          status: 'rejected',
          rejectionReason: reason || 'Unqualified',
          updatedAt: admin.firestore.Timestamp.now(),
        };

        await JobSeeker.update(jobSeekerId, updates);

        await sendEmail({
          to: jobSeeker.email,
          subject: 'Job Seeker Rejected',
          html: getRejectTemplate('Job Seeker Rejected', `Your job seeker account has been rejected. Reason: ${reason || 'Unqualified'}`, jobSeeker),
          text: `Your job seeker account has been rejected. Reason: ${reason || 'Unqualified'}`
        });

        const formattedPhone = formatPhoneNumber(jobSeeker.phone);
        const smsMessage = `Your job seeker documents have been rejected. Reason: ${reason || 'Unqualified'}.`;
        await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

        await logAdminActivity(
          req.user.uid,
          'reject_job_seeker',
          req,
          { type: 'job_seeker', id: jobSeekerId }
        );

        return res.status(200).json({ message: 'Job seeker rejected', updates });
      }

      return res.status(400).json({ message: 'Invalid action, must be approve-idDoc, approve-drivingLicense, approve-goodConductCert, approve-goodsServiceLicense, or reject' });
    } catch (error) {
      console.error('Review job seeker error:', error);
      res.status(500).json({ message: 'Failed to review job seeker' });
    }
  },

  async getApprovedJobSeekers(req, res) {
    try {
      const jobSeekers = await JobSeeker.getApprovedJobSeekers();
      
      res.status(200).json({ 
        success: true,
        jobSeekers: formatTimestamps(jobSeekers) 
      });
    } catch (error) {
      console.error('Error fetching approved job seekers:', error);
      res.status(500).json({ message: 'Failed to fetch approved job seekers' });
    }
  },

  
async browseJobSeekers (req, res) {
  try {
    const companyId = req.params.companyId;
    
    const companyDoc = await Company.get(companyId);
    if (!companyDoc) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Verify the user owns the company
    const userId = req.user.uid;
    
    if (companyDoc.transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to view job seekers for this company' });
    }

    // Fetch approved job seekers
    const jobSeekersSnapshot = await JobSeeker.getApprovedJobSeekers();

    await logActivity(
      userId,
      'view_job_seekers',
      req,
      { type: 'company', id: companyId }
    );

    res.status(200).json({ success: true, jobSeekers: formatTimestamps(jobSeekersSnapshot) });
  } catch (error) {
    console.error('Error fetching approved job seekers:', error);
    res.status(500).json({ message: 'Failed to fetch approved job seekers' });
  }
},

async getJobSeekerDocuments (req, res) {
  try {
    const companyId = req.params.companyId;
    const jobSeekerId = req.params.jobSeekerId;
    const companyDoc = await Company.get(companyId);
    if (!companyDoc) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Verify the user owns the company
    const userId = req.user.uid;
    
    if (companyDoc.transporterId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to view job seeker documents for this company' });
    }

    // Fetch job seeker and verify status
    const jobSeekerDoc = await JobSeeker.get(jobSeekerId);
    if (!jobSeekerDoc) {
      return res.status(404).json({ message: 'Job seeker not found' });
    }

    if (jobSeekerDoc.status !== 'approved') {
      return res.status(403).json({ message: 'Only approved job seekers\' documents are accessible' });
    }

    // Fetch documents (assuming documents are a nested object in job_seeker)
    const documents = jobSeekerDoc.documents || {};
    const formattedDocuments = {
      idDoc: documents.idDoc ? {
        url: documents.idDoc.url,
        status: documents.idDoc.status,
        expiryDate: documents.idDoc.expiryDate ? documents.idDoc.expiryDate.toDate().toISOString() : null,
      } : null,
      drivingLicense: documents.drivingLicense ? {
        url: documents.drivingLicense.url,
        status: documents.drivingLicense.status,
        expiryDate: documents.drivingLicense.expiryDate ? documents.drivingLicense.expiryDate.toDate().toISOString() : null,
        vehicleClasses: documents.drivingLicense.vehicleClasses,
      } : null,
      goodConductCert: documents.goodConductCert ? {
        url: documents.goodConductCert.url,
        status: documents.goodConductCert.status,
        expiryDate: documents.goodConductCert.expiryDate ? documents.goodConductCert.expiryDate.toDate().toISOString() : null,
        isClean: documents.goodConductCert.isClean,
        isRenewed: documents.goodConductCert.isRenewed,
      } : null,
      psvBadge: documents.psvBadge ? {
        url: documents.psvBadge.url,
        status: documents.psvBadge.status,
        expiryDate: documents.psvBadge.expiryDate ? documents.psvBadge.expiryDate.toDate().toISOString() : null,
      } : null,
      nightTravelLicense: documents.nightTravelLicense ? {
        url: documents.nightTravelLicense.url,
        status: documents.nightTravelLicense.status,
        expiryDate: documents.nightTravelLicense.expiryDate ? documents.nightTravelLicense.expiryDate.toDate().toISOString() : null,
      } : null,
      rslLicense: documents.rslLicense ? {
        url: documents.rslLicense.url,
        status: documents.rslLicense.status,
        expiryDate: documents.rslLicense.expiryDate ? documents.rslLicense.expiryDate.toDate().toISOString() : null,
      } : null,
      backgroundCheck: documents.backgroundCheck ? {
        url: documents.backgroundCheck.url,
        status: documents.backgroundCheck.status,
        expiryDate: documents.backgroundCheck.expiryDate ? documents.backgroundCheck.expiryDate.toDate().toISOString() : null,
      } : null,
      goodsServiceLicense: documents.goodsServiceLicense ? {
        url: documents.goodsServiceLicense.url,
        status: documents.goodsServiceLicense.status,
        expiryDate: documents.goodsServiceLicense.expiryDate ? documents.goodsServiceLicense.expiryDate.toDate().toISOString() : null,
      } : null,
    };

    res.status(200).json({ success: true, documents: formattedDocuments });
  } catch (error) {
    console.error('Error fetching job seeker documents:', error);
    res.status(500).json({ message: 'Failed to fetch job seeker documents' });
  }
},

};

module.exports = jobSeekerController;