const Company = require('../models/Company');
const  { logActivity } = require('../utils/activityLogger');
const sendEmail = require("../utils/sendEmail");

exports.createCompany = async (req, res) => {
  try {
    const { name, registration, contact } = req.body;
    console.log("details", name, registration, contact);

    if (!name || !registration || !contact) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const companyData = {
      name,
      registration,
      contact,
      transporterId: req.user.uid,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const company = await Company.create(companyData);
    await logActivity(req.user.uid, 'create_company', req);
    res.status(201).json({ message: 'Company created successfully', company });
  } catch (err) {
    console.error('Create company error:', err);
    res.status(500).json({ message: 'Failed to create company' });
  }
};

exports.getCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.get(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.status(200).json(company);
  } catch (err) {
    console.error('Get company error:', err);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    const company = await Company.get(companyId);
    if (company.transporterId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to update this company' });
    }

    const updatedCompany = await Company.update(companyId, updates);
    await logActivity(req.user.uid, 'update_company', req);
    res.status(200).json({ message: 'Company updated successfully', company: updatedCompany });
  } catch (err) {
    console.error('Update company error:', err);
    if (err.message === 'Company not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to update company' });
    }
  }
};

exports.approveCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const updatedCompany = await Company.approve(companyId);
    const email = updatedCompany?.companyContact;
    await sendEmail({
      to: email,
      subject: 'Company Status',
      text: 'Your company has been approved, proceed to add Drivers and Vehicles.',
      //html: getMFATemplate(verificationCode, null, req.ip || 'unknown', req.headers['user-agent'] || 'unknown')
      html: `<p>Your Company has been approved</p>`
    });

    await logActivity(req.user.uid, 'approve_company', req);
    res.status(200).json({ message: 'Company approved successfully', company: updatedCompany });
  } catch (err) {
    console.error('Approve company error:', err);
    if (err.message === 'Company not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to approve company' });
    }
  }
};

exports.rejectCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const updatedCompany = await Company.reject(companyId, reason);

    const email = updatedCompany?.companyContact;

    await sendEmail({
      to: email,
      subject: 'Company Approval Status',
      text: `Your company has been rejected because of: ${reason}`,
    //   html: getMFATemplate(verificationCode, null, req.ip || 'unknown', req.headers['user-agent'] || 'unknown')
      html: `<p>Your company has been rejected because of: <strong>${reason}</strong></p>`
    });

    await logActivity(req.user.uid, 'reject_company', req);
    res.status(200).json({ message: 'Company rejected successfully', company: updatedCompany });
  } catch (err) {
    console.error('Reject company error:', err);
    if (err.message === 'Company not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to reject company' });
    }
  }
};

exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.getAll();
    await logActivity(req.admin.adminId, 'get_all_companies', req);
    res.status(200).json(companies);
  } catch (err) {
    console.error('Get all companies error:', err);
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    await Company.delete(companyId);
    await logActivity(req.user.uid, 'delete_company', req);
    res.status(200).json({ message: 'Company deleted successfully' });
  } catch (err) {
    console.error('Delete company error:', err);
    if (err.message === 'Company not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Failed to delete company' });
    }
  }
};

exports.getCompaniesByTransporter = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const companies = await Company.getByTransporter(transporterId);
    res.status(200).json(companies);
  } catch (err) {
    console.error('Get companies by transporter error:', err);
    res.status(500).json({ message: 'Failed to fetch companies for transporter' });
  }
};

exports.getCompaniesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const companies = await Company.getByStatus(status);
    res.status(200).json(companies);
  } catch (err) {
    console.error('Get companies by status error:', err);
    res.status(500).json({ message: 'Failed to fetch companies by status' });
  }
};

exports.getCompaniesByTransporterAndStatus = async (req, res) => {
  try {
    const { transporterId, status } = req.params;
    const companies = await Company.getByTransporterAndStatus(transporterId, status);
    res.status(200).json(companies);
  } catch (err) {
    console.error('Get companies by transporter and status error:', err);
    res.status(500).json({ message: 'Failed to fetch companies for transporter and status' });
  }
};

exports.getAllForTransporter = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const companies = await Company.getAllForTransporter(transporterId);
    res.status(200).json(companies);
  } catch (err) {
    console.error('Get all companies for transporter error:', err);
    res.status(500).json({ message: 'Failed to fetch companies for transporter' });
  }
};

exports.searchCompany = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const result = await Company.search({ page, limit, status, search });
    res.status(200).json(result);
  } catch (err) {
    console.error('Search companies error:', err);
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
};