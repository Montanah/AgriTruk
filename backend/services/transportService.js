// Enhanced verification service with automated checks before manual review

const verificationService = {
  
  // Driver License Verification with NTSA
  async verifyDriverLicense(licenseNumber, idNumber, documentUrl) {
    try {
      // Option 1: YouVerify API
      const youVerifyResponse = await fetch('https://api.youverify.co/v2/api/identity/ke/drivers-license', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.YOUVERIFY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          license_number: licenseNumber,
          id_number: idNumber
        })
      });

      const youVerifyResult = await youVerifyResponse.json();

      // Option 2: OCR + Document Analysis
      const ocrResult = await this.extractLicenseData(documentUrl);
      
      // Option 3: NTSA eCitizen integration (if available)
      // const ntsaResult = await this.verifyWithNTSA(licenseNumber);

      return {
        isValid: youVerifyResult.status === 'success',
        apiVerification: youVerifyResult,
        ocrData: ocrResult,
        confidence: this.calculateConfidence(youVerifyResult, ocrResult),
        verificationDate: new Date(),
        provider: 'YouVerify'
      };

    } catch (error) {
      console.error('Driver license verification error:', error);
      return {
        isValid: false,
        error: error.message,
        confidence: 0
      };
    }
  },

  // Insurance Certificate Verification
  async verifyInsurance(policyNumber, documentUrl) {
    try {
      // Extract data from insurance document
      const ocrData = await this.extractInsuranceData(documentUrl);
      
      // Check against known insurance providers
      const providerVerification = await this.verifyInsuranceProvider(ocrData.provider);
      
      // Check policy validity dates
      const isDateValid = this.validateInsuranceDates(ocrData.startDate, ocrData.expiryDate);

      return {
        isValid: providerVerification.isValid && isDateValid,
        provider: ocrData.provider,
        policyNumber: ocrData.policyNumber,
        expiryDate: ocrData.expiryDate,
        confidence: this.calculateInsuranceConfidence(ocrData, providerVerification),
        verificationDate: new Date()
      };

    } catch (error) {
      console.error('Insurance verification error:', error);
      return {
        isValid: false,
        error: error.message,
        confidence: 0
      };
    }
  },

  // ID Document Verification
  async verifyNationalID(idNumber, documentUrl) {
    try {
      // OCR extraction
      const ocrData = await this.extractIDData(documentUrl);
      
      // Basic validation checks
      const isFormatValid = this.validateKenyanIDFormat(idNumber);
      const isOCRMatch = ocrData.idNumber === idNumber;
      
      // Age verification
      const age = this.calculateAgeFromID(idNumber);
      const isValidAge = age >= 18; // Minimum driving age

      return {
        isValid: isFormatValid && isOCRMatch && isValidAge,
        extractedData: ocrData,
        age: age,
        confidence: this.calculateIDConfidence(isFormatValid, isOCRMatch, isValidAge),
        verificationDate: new Date()
      };

    } catch (error) {
      console.error('ID verification error:', error);
      return {
        isValid: false,
        error: error.message,
        confidence: 0
      };
    }
  },

  // OCR and document processing methods
  async extractLicenseData(documentUrl) {
    // Using cloud vision API or similar OCR service
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient();
    
    const [result] = await client.textDetection(documentUrl);
    const text = result.fullTextAnnotation.text;
    
    // Extract relevant fields using regex patterns
    const licenseNumber = this.extractPattern(text, /DL[\s]*([A-Z0-9]+)/i);
    const expiryDate = this.extractPattern(text, /(\d{2}\/\d{2}\/\d{4})/);
    const name = this.extractPattern(text, /NAME[\s]*:[\s]*([A-Z\s]+)/i);
    
    return {
      licenseNumber,
      expiryDate,
      name,
      rawText: text
    };
  },

  async extractInsuranceData(documentUrl) {
    // Similar OCR processing for insurance documents
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient();
    
    const [result] = await client.textDetection(documentUrl);
    const text = result.fullTextAnnotation.text;
    
    return {
      provider: this.extractPattern(text, /(JUBILEE|APA|BRITAM|CIC|MADISON|HERITAGE)/i),
      policyNumber: this.extractPattern(text, /POLICY[\s]*[NO.]*[\s]*:?[\s]*([A-Z0-9]+)/i),
      expiryDate: this.extractPattern(text, /EXPIRY[\s]*:?[\s]*(\d{2}\/\d{2}\/\d{4})/i),
      startDate: this.extractPattern(text, /FROM[\s]*:?[\s]*(\d{2}\/\d{2}\/\d{4})/i),
      vehicleRegNo: this.extractPattern(text, /REG[\s]*[NO.]*[\s]*:?[\s]*([A-Z0-9]+)/i)
    };
  },

  async extractIDData(documentUrl) {
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient();
    
    const [result] = await client.textDetection(documentUrl);
    const text = result.fullTextAnnotation.text;
    
    return {
      idNumber: this.extractPattern(text, /(\d{8})/),
      name: this.extractPattern(text, /([A-Z\s]+)(?=\d{8})/),
      dateOfBirth: this.extractPattern(text, /(\d{2}\/\d{2}\/\d{4})/)
    };
  },

  // Validation helper methods
  validateKenyanIDFormat(idNumber) {
    return /^\d{8}$/.test(idNumber);
  },

  calculateAgeFromID(idNumber) {
    // Kenyan ID format includes birth year in specific positions
    const birthYear = parseInt(idNumber.substring(1, 3));
    const currentYear = new Date().getFullYear() % 100;
    
    let fullBirthYear;
    if (birthYear > currentYear) {
      fullBirthYear = 1900 + birthYear;
    } else {
      fullBirthYear = 2000 + birthYear;
    }
    
    return new Date().getFullYear() - fullBirthYear;
  },

  validateInsuranceDates(startDate, expiryDate) {
    const now = new Date();
    const start = new Date(startDate);
    const expiry = new Date(expiryDate);
    
    return start <= now && expiry >= now;
  },

  async verifyInsuranceProvider(providerName) {
    // List of registered insurance companies in Kenya
    const validProviders = [
      'JUBILEE', 'APA', 'BRITAM', 'CIC', 'MADISON', 'HERITAGE', 
      'KENINDIA', 'ORIENT', 'PACIS', 'PHOENIX', 'TAKAFUL'
    ];
    
    return {
      isValid: validProviders.some(provider => 
        providerName?.toUpperCase().includes(provider)
      ),
      recognizedProvider: providerName
    };
  },

  // Confidence calculation methods
  calculateConfidence(apiResult, ocrResult) {
    let confidence = 0;
    
    if (apiResult?.status === 'success') confidence += 70;
    if (ocrResult?.licenseNumber) confidence += 20;
    if (ocrResult?.expiryDate) confidence += 10;
    
    return Math.min(confidence, 100);
  },

  calculateInsuranceConfidence(ocrData, providerVerification) {
    let confidence = 0;
    
    if (providerVerification.isValid) confidence += 50;
    if (ocrData.policyNumber) confidence += 25;
    if (ocrData.expiryDate) confidence += 15;
    if (ocrData.vehicleRegNo) confidence += 10;
    
    return Math.min(confidence, 100);
  },

  calculateIDConfidence(isFormatValid, isOCRMatch, isValidAge) {
    let confidence = 0;
    
    if (isFormatValid) confidence += 40;
    if (isOCRMatch) confidence += 40;
    if (isValidAge) confidence += 20;
    
    return confidence;
  },

  extractPattern(text, pattern) {
    const match = text.match(pattern);
    return match ? match[1] : null;
  }
};

// Enhanced reviewTransporter function with automated verification
exports.reviewTransporter = async (req, res) => {
  try {
    const transporterId = req.params.transporterId;
    const { action, reason, insuranceExpiryDate, driverLicenseExpiryDate, idExpiryDate, skipAutoVerification } = req.body;

    // Get transporter data
    const transporter = await Transporter.get(transporterId);
    if (!transporter) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    // Status checks (existing logic)
    if (transporter.status === 'approved' && (action === 'approve-dl' || action === 'approve-insurance' || action === 'approve-id')) {
      return res.status(400).json({ message: 'Transporter already approved' });
    }
    if (transporter.status === 'rejected' && action === 'reject') {
      return res.status(400).json({ message: 'Transporter already rejected' });
    }

    let updates = {};
    let verificationResults = {};

    // AUTO-VERIFICATION BEFORE MANUAL APPROVAL
    if (!skipAutoVerification) {
      
      if (action === 'approve-dl') {
        // Automated driver license verification
        verificationResults.driverLicense = await verificationService.verifyDriverLicense(
          transporter.driverLicenseNumber,
          transporter.idNumber,
          transporter.driverLicenseUrl
        );
        
        // Store verification results
        updates.driverLicenseVerification = verificationResults.driverLicense;
        
        // Auto-reject if verification fails with high confidence
        if (!verificationResults.driverLicense.isValid && verificationResults.driverLicense.confidence > 80) {
          updates = {
            status: 'rejected',
            rejectionReason: 'Driver license verification failed - Invalid license number or document',
            driverLicenseVerification: verificationResults.driverLicense,
            updatedAt: admin.firestore.Timestamp.now(),
          };
          
          await Transporter.update(transporterId, updates);
          
          // Send rejection notification
          await sendRejectionNotification(transporter, 'Driver license verification failed');
          
          return res.status(200).json({ 
            message: 'Driver license auto-rejected due to verification failure', 
            verificationResults: verificationResults.driverLicense,
            updates 
          });
        }
      }

      if (action === 'approve-insurance') {
        // Automated insurance verification
        verificationResults.insurance = await verificationService.verifyInsurance(
          transporter.insurancePolicyNumber,
          transporter.insuranceUrl
        );
        
        updates.insuranceVerification = verificationResults.insurance;
        
        // Auto-reject if verification fails
        if (!verificationResults.insurance.isValid && verificationResults.insurance.confidence > 70) {
          updates = {
            status: 'rejected',
            rejectionReason: 'Insurance verification failed - Invalid policy or expired coverage',
            insuranceVerification: verificationResults.insurance,
            updatedAt: admin.firestore.Timestamp.now(),
          };
          
          await Transporter.update(transporterId, updates);
          await sendRejectionNotification(transporter, 'Insurance verification failed');
          
          return res.status(200).json({ 
            message: 'Insurance auto-rejected due to verification failure', 
            verificationResults: verificationResults.insurance,
            updates 
          });
        }
      }

      if (action === 'approve-id') {
        // Automated ID verification
        verificationResults.nationalID = await verificationService.verifyNationalID(
          transporter.idNumber,
          transporter.idUrl
        );
        
        updates.idVerification = verificationResults.nationalID;
        
        // Auto-reject if verification fails
        if (!verificationResults.nationalID.isValid && verificationResults.nationalID.confidence > 80) {
          updates = {
            status: 'rejected',
            rejectionReason: 'National ID verification failed - Invalid ID format or underage',
            idVerification: verificationResults.nationalID,
            updatedAt: admin.firestore.Timestamp.now(),
          };
          
          await Transporter.update(transporterId, updates);
          await sendRejectionNotification(transporter, 'National ID verification failed');
          
          return res.status(200).json({ 
            message: 'ID auto-rejected due to verification failure', 
            verificationResults: verificationResults.nationalID,
            updates 
          });
        }
      }
    }

    // EXISTING MANUAL APPROVAL LOGIC (with verification results included)
    if (action === 'approve-dl') {
      if (!driverLicenseExpiryDate) {
        return res.status(400).json({ message: 'driverLicenseExpiryDate is required' });
      }
      
      updates = {
        ...updates,
        driverLicenseExpiryDate: admin.firestore.Timestamp.fromDate(new Date(driverLicenseExpiryDate)),
        driverLicenseapproved: true,
        updatedAt: admin.firestore.Timestamp.now(),
      };
      
      await Transporter.update(transporterId, updates);

      // Check if all documents are approved
      if (transporter.insuranceapproved && transporter.idapproved) {
        await finalizeApproval(transporterId, transporter);
      }
      
      return res.status(200).json({ 
        message: 'Driver license approved', 
        verificationResults: verificationResults.driverLicense || null,
        updates 
      });
    }

    if (action === 'approve-insurance') {
      if (!insuranceExpiryDate) {
        return res.status(400).json({ message: 'insuranceExpiryDate is required' });
      }
      
      updates = {
        ...updates,
        insuranceExpiryDate: admin.firestore.Timestamp.fromDate(new Date(insuranceExpiryDate)),
        insuranceapproved: true,
        updatedAt: admin.firestore.Timestamp.now(),
      };
      
      await Transporter.update(transporterId, updates);

      if (transporter.driverLicenseapproved && transporter.idapproved) {
        await finalizeApproval(transporterId, transporter);
      }
      
      return res.status(200).json({ 
        message: 'Insurance approved', 
        verificationResults: verificationResults.insurance || null,
        updates 
      });
    }

    if (action === 'approve-id') {
      updates = {
        ...updates,
        idapproved: true,
        updatedAt: admin.firestore.Timestamp.now(),
      };
      
      if (idExpiryDate) {
        updates.idExpiryDate = admin.firestore.Timestamp.fromDate(new Date(idExpiryDate));
      }
      
      await Transporter.update(transporterId, updates);

      if (transporter.driverLicenseapproved && transporter.insuranceapproved) {
        await finalizeApproval(transporterId, transporter);
      }
      
      return res.status(200).json({ 
        message: 'ID approved', 
        verificationResults: verificationResults.nationalID || null,
        updates 
      });
    }

    // Existing rejection logic
    if (action === 'reject') {
      updates = {
        status: 'rejected',
        rejectionReason: reason || 'Unqualified',
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await Transporter.update(transporterId, updates);
      await sendRejectionNotification(transporter, reason || 'Unqualified');

      await logAdminActivity(
        req.user.uid,
        'reject_transporter',
        req,
        { type: 'transporter', id: transporterId }
      );

      return res.status(200).json({ message: 'Transporter rejected', updates });
    }

    return res.status(400).json({ message: 'Invalid action, must be approve-dl, approve-insurance, approve-id, or reject' });

  } catch (error) {
    console.error('Review transporter error:', error);
    res.status(500).json({ message: 'Failed to review transporter' });
  }
};

// Helper functions
async function finalizeApproval(transporterId, transporter) {
  const updates = {
    status: 'approved',
    updatedAt: admin.firestore.Timestamp.now(),
  };
  
  await Transporter.update(transporterId, updates);

  await sendEmail({
    to: transporter.email,
    subject: 'Transporter Approved',
    text: 'Your transporter account has been approved. Welcome to Truk!'
  });

  const formattedPhone = formatPhoneNumber(transporter.phoneNumber);
  const smsMessage = 'Your Truk documents have been approved. Welcome aboard!';
  await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);

  await logAdminActivity(
    req.user.uid,
    'approve_transporter',
    req,
    { type: 'transporter', id: transporterId }
  );
}

async function sendRejectionNotification(transporter, reason) {
  await sendEmail({
    to: transporter.email,
    subject: 'Transporter Rejected',
    html: getRejectTemplate('Transporter Rejected', `Your transporter account has been rejected. Reason: ${reason}`, transporter),
    text: `Your transporter account has been rejected. Reason: ${reason}`
  });

  const formattedPhone = formatPhoneNumber(transporter.phoneNumber);
  const smsMessage = `Your Truk documents have been rejected. Reason: ${reason}.`;
  await smsService.sendSMS('TRUK LTD', smsMessage, formattedPhone);
}

// New endpoint for bulk verification
exports.bulkVerifyDocuments = async (req, res) => {
  try {
    const { transporterIds } = req.body;
    
    const results = [];
    
    for (const transporterId of transporterIds) {
      const transporter = await Transporter.get(transporterId);
      if (!transporter) continue;
      
      const verificationResults = {};
      
      // Verify all documents
      if (transporter.driverLicenseUrl) {
        verificationResults.driverLicense = await verificationService.verifyDriverLicense(
          transporter.driverLicenseNumber,
          transporter.idNumber,
          transporter.driverLicenseUrl
        );
      }
      
      if (transporter.insuranceUrl) {
        verificationResults.insurance = await verificationService.verifyInsurance(
          transporter.insurancePolicyNumber,
          transporter.insuranceUrl
        );
      }
      
      if (transporter.idUrl) {
        verificationResults.nationalID = await verificationService.verifyNationalID(
          transporter.idNumber,
          transporter.idUrl
        );
      }
      
      // Store verification results
      await Transporter.update(transporterId, {
        bulkVerificationResults: verificationResults,
        bulkVerificationDate: admin.firestore.Timestamp.now()
      });
      
      results.push({
        transporterId,
        name: transporter.name,
        verificationResults
      });
    }
    
    res.status(200).json({ results });
    
  } catch (error) {
    console.error('Bulk verification error:', error);
    res.status(500).json({ message: 'Failed to perform bulk verification' });
  }
};

module.exports = { verificationService };