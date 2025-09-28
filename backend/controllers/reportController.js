const db = require('../config/firebase');

// Get all reports for a company
const getReports = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get company ID for the user
    const companyQuery = await db.collection('companies')
      .where('transporterId', '==', userId)
      .limit(1)
      .get();

    if (companyQuery.empty) {
      return res.status(200).json({ reports: [] });
    }

    const companyId = companyQuery.docs[0].id;

    // Get all reports for the company
    const reportsQuery = await db.collection('reports')
      .where('companyId', '==', companyId)
      .orderBy('generatedAt', 'desc')
      .get();

    const reports = reportsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

// Generate a new report
const generateReport = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { type, dateRange } = req.body;

    // Get company ID for the user
    const companyQuery = await db.collection('companies')
      .where('transporterId', '==', userId)
      .limit(1)
      .get();

    if (companyQuery.empty) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const companyId = companyQuery.docs[0].id;

    // Create report record
    const reportData = {
      companyId,
      type,
      dateRange: parseInt(dateRange),
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
      status: 'generating',
      generatedAt: new Date(),
      createdAt: new Date(),
    };

    const reportRef = await db.collection('reports').add(reportData);

    // In a real implementation, you would queue this for background processing
    // For now, we'll simulate immediate generation
    setTimeout(async () => {
      try {
        await reportRef.update({
          status: 'ready',
          downloadUrl: `https://example.com/reports/${reportRef.id}.pdf`,
          completedAt: new Date(),
        });
      } catch (error) {
        console.error('Error updating report status:', error);
        await reportRef.update({
          status: 'failed',
          error: error.message,
        });
      }
    }, 5000); // Simulate 5 second generation time

    res.status(201).json({
      message: 'Report generation started',
      report: { id: reportRef.id, ...reportData }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
};

// Download a report
const downloadReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Get report
    const reportDoc = await db.collection('reports').doc(id).get();
    if (!reportDoc.exists) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const reportData = reportDoc.data();

    // Verify user owns the company
    const companyQuery = await db.collection('companies')
      .where('transporterId', '==', userId)
      .limit(1)
      .get();

    if (companyQuery.empty || companyQuery.docs[0].id !== reportData.companyId) {
      return res.status(403).json({ message: 'Unauthorized to access this report' });
    }

    if (reportData.status !== 'ready') {
      return res.status(400).json({ message: 'Report is not ready for download' });
    }

    // In a real implementation, you would serve the actual file
    res.status(200).json({
      message: 'Report download initiated',
      downloadUrl: reportData.downloadUrl
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ message: 'Failed to download report' });
  }
};

module.exports = {
  getReports,
  generateReport,
  downloadReport
};
