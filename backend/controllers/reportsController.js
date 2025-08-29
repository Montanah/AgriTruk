const Booking = require("../models/Booking");
const User = require("../models/User");
const Transporter = require("../models/Transporter");
const { logAdminActivity } = require("../utils/activityLogger");
const { formatFirestoreTimestamp } = require("../schemas/Booking");
const pdf = require('html-pdf');
const moment = require('moment');
const db = require('../config/firebase'); 

exports.getBookingsForExport = async (req, res) => {
  try {
    const bookings = await Booking.getAll(); 
    
    // Function to format vehicle information into a single sentence
    const formatVehicleInfo = (transporter) => {
      if (!transporter) return 'Not assigned';
      
      const parts = [];
      if (transporter.vehicleColor) parts.push(transporter.vehicleColor);
      if (transporter.vehicleMake) parts.push(transporter.vehicleMake);
      if (transporter.vehicleModel) parts.push(transporter.vehicleModel);
      if (transporter.vehicleYear) parts.push(`(${transporter.vehicleYear})`);
      if (transporter.vehicleRegistration) parts.push(`- ${transporter.vehicleRegistration}`);
      if (transporter.vehicleCapacity) parts.push(`- ${transporter.vehicleCapacity}kg capacity`);
      
      return parts.join(' ');
    };

    const formattedBookings = bookings.map(booking => ({
      // Essential identifiers
      'Booking ID': booking.bookingId,
      'Request ID': booking.requestId,
      
      // Booking details
      'Booking Type': booking.bookingType,
      'Booking Mode': booking.bookingMode,
      'Status': booking.status,
      
      // Location information
      'From Location': booking.fromLocation,
      'To Location': booking.toLocation,
      
      // Cargo details
      'Product Type': booking.productType,
      'Weight (kg)': booking.weightKg,
      'Special Cargo': Array.isArray(booking.specialCargo) 
        ? booking.specialCargo.join(', ') 
        : booking.specialCargo,
      
      // Financial information
      'Total Cost': `$${booking.cost || 0}`,
      'Fuel Surcharge': `$${booking.fuelSurcharge || 0}`,
      'Wait Time Fee': `$${booking.waitTimeFee || 0}`,
      
      // User information (if available)
      'Customer Name': booking.user?.displayName || booking.userId || 'N/A',
      'Customer Email': booking.user?.email || 'N/A',
      'Customer Phone': booking.user?.phoneNumber || 'N/A',
      
      // Transporter information (if available)
      'Transporter Name': booking.transporter?.displayName || 'Not assigned',
      'Transporter Email': booking.transporter?.email || 'N/A',
      'Transporter Phone': booking.transporter?.phoneNumber || 'N/A',
      'Transporter Type': booking.transporter?.transporterType || 'N/A',
      
      // Vehicle information (consolidated into single sentence)
      'Vehicle Details': formatVehicleInfo(booking.transporter),
      
      // Formatted timestamps
      'Pickup Date': formatFirestoreTimestamp(booking.pickUpDate),
      'Accepted At': formatFirestoreTimestamp(booking.acceptedAt),
      'Started At': formatFirestoreTimestamp(booking.startedAt),
      'Completed At': formatFirestoreTimestamp(booking.completedAt),
      'Cancelled At': formatFirestoreTimestamp(booking.cancelledAt),
      'Created At': formatFirestoreTimestamp(booking.createdAt),
      'Updated At': formatFirestoreTimestamp(booking.updatedAt),
      
      // Additional info
      'Urgency Level': booking.urgencyLevel,
      'Perishable': booking.perishable ? 'Yes' : 'No',
      'Refrigeration Needed': booking.needsRefrigeration ? 'Yes' : 'No',
      'Humidity Control': booking.humidyControl ? 'Yes' : 'No',
      'Insured': booking.insured ? 'Yes' : 'No',
      'Priority': booking.priority ? 'Yes' : 'No',
      'Consolidated': booking.consolidated ? 'Yes' : 'No',
      'Cancellation Reason': booking.cancellationReason || 'N/A',
      'Additional Notes': booking.additionalNotes || 'None',
      'Estimated Duration': booking.estimatedDuration || 'N/A',
      'Actual Distance': booking.actualDistance ? `${booking.actualDistance} km` : 'N/A'
    }));

    await logAdminActivity(req.user.uid, 'export_bookings_report', req);
    
    res.status(200).json({
      message: 'Bookings exported successfully',
      totalCount: formattedBookings.length,
      bookings: formattedBookings
    });

  } catch (error) {
    console.error('Export bookings error:', error);
    res.status(500).json({ message: 'Failed to export bookings' });
  }
};

exports.generateBookingPdfOld = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Fetch bookings and related data
    const bookings = await Booking.getAll();
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'No bookings found' });
    }

    // Format vehicle info
    const formatVehicleInfo = (transporter) => {
      if (!transporter) return 'Not assigned';
      const parts = [];
      if (transporter.vehicleColor) parts.push(transporter.vehicleColor);
      if (transporter.vehicleMake) parts.push(transporter.vehicleMake);
      if (transporter.vehicleModel) parts.push(transporter.vehicleModel);
      if (transporter.vehicleYear) parts.push(`(${transporter.vehicleYear})`);
      if (transporter.vehicleRegistration) parts.push(`- ${transporter.vehicleRegistration}`);
      if (transporter.vehicleCapacity) parts.push(`- ${transporter.vehicleCapacity}kg capacity`);
      return parts.join(' ');
    };

    // Format Firestore timestamp
    const formatFirestoreTimestamp = (timestamp) => {
      if (!timestamp || !timestamp._seconds) return 'N/A';
      return moment(timestamp._seconds * 1000).format('MMM D, YYYY h:mm A');
    };

    // Prepare booking data
    const data = await Promise.all(bookings.map(async (booking) => {
      const user = await User.get(booking.userId);
      const transporter = booking.transporterId ? await Transporter.get(booking.transporterId) : null;

      return {
        'Booking ID': booking.bookingId || 'N/A',
        'Request ID': booking.requestId || 'N/A',
        'Booking Type': booking.bookingType || 'N/A',
        'Booking Mode': booking.bookingMode || 'N/A',
        'Status': booking.status || 'N/A',
        'Customer Name': user?.name || 'N/A',
        'Customer Email': user?.email || 'N/A',
        'Customer Phone': user?.phone || 'N/A',
        'Transporter Name': transporter?.displayName || 'Not assigned',
        'Transporter Email': transporter?.email || 'N/A',
        'Transporter Phone': transporter?.phoneNumber || 'N/A',
        'Transporter Type': transporter?.transporterType || 'N/A',
        'Vehicle Details': formatVehicleInfo(transporter),
        'From Location': booking.fromLocation || 'N/A',
        'To Location': booking.toLocation || 'N/A',
        'Product Type': booking.productType || 'N/A',
        'Weight (kg)': booking.weightKg || 'N/A',
        'Special Cargo': Array.isArray(booking.specialCargo) 
          ? booking.specialCargo.join(', ') 
          : booking.specialCargo || 'None',
        'Total Cost': `KES ${booking.cost || 0}`,
        'Fuel Surcharge': `KES ${booking.fuelSurcharge || 0}`,
        'Wait Time Fee': `KES ${booking.waitTimeFee || 0}`,
        'Pickup Date': formatFirestoreTimestamp(booking.pickUpDate),
        'Accepted At': formatFirestoreTimestamp(booking.acceptedAt),
        'Created At': formatFirestoreTimestamp(booking.createdAt),
        'Updated At': formatFirestoreTimestamp(booking.updatedAt),
        'Urgency Level': booking.urgencyLevel || 'N/A',
        'Perishable': booking.perishable ? 'Yes' : 'No',
        'Refrigeration Needed': booking.needsRefrigeration ? 'Yes' : 'No',
        'Insured': booking.insured ? 'Yes' : 'No',
        'Additional Notes': booking.additionalNotes || 'None'
      };
    }));

    // Filter by date range if provided
    const filteredData = data.filter(booking => {
      if (!booking['Created At'] || booking['Created At'] === 'N/A') return true;
      const createdAt = moment(booking['Created At'], 'MMM D, YYYY h:mm A');
      if (startDate && createdAt.isBefore(moment(startDate))) return false;
      if (endDate && createdAt.isAfter(moment(endDate))) return false;
      return true;
    });

    if (filteredData.length === 0) {
      return res.status(404).json({ success: false, message: 'No bookings found in the specified date range' });
    }

    // Company info
    const companyName = "TRUK AFRICA";
    const companyAddress = "123 NAIROBI";
    const companyPhone = "+254 758-594951";
    const companyEmail = "info@trukafrica.com";
    const companyWebsite = "www.trukafrica.com";

    // Generate HTML for PDF
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bookings Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 15px;
          color: #333;
          font-size: 10px;
        }
        .header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          border-bottom: 2px solid #4a86e8;
          padding-bottom: 10px;
        }
        .company-info {
          flex: 1;
          text-align: center;
        }
        .company-name {
          font-size: 20px;
          font-weight: bold;
          color: #4a86e8;
          margin-bottom: 3px;
        }
        .report-info {
          text-align: right;
          font-size: 9px;
        }
        .report-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 3px;
        }
        .logo {
          flex: 0 0 auto;
          margin-right: 20px;
        }
        .logo img {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }
        .report-details {
          margin: 15px 0;
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 4px;
          font-size: 9px;
        }
        .date-range {
          font-style: italic;
          margin-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 8px;
          table-layout: fixed;
        }
        th {
          background-color: #4a86e8;
          color: white;
          padding: 6px 4px;
          text-align: left;
          font-weight: bold;
          word-wrap: break-word;
        }
        td {
          padding: 4px;
          border-bottom: 1px solid #ddd;
          word-wrap: break-word;
          vertical-align: top;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 8px;
          color: #777;
          border-top: 1px solid #ddd;
          padding-top: 8px;
        }
        .summary {
          margin: 10px 0;
          padding: 8px;
          background-color: #e7f3fe;
          border-left: 3px solid #4a86e8;
          font-size: 9px;
        }
        .column-narrow {
          width: 60px;
        }
        .column-medium {
          width: 80px;
        }
        .column-wide {
          width: 120px;
        }
        .split-cell {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        .split-cell div {
          margin-bottom: 2px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo"> 
          <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="TRUK Logo">
        </div>
        <div class="company-info">
          <div class="company-name">${companyName}</div>
          <div>${companyAddress}</div>
          <div>${companyPhone} | ${companyEmail}</div>
          <div>${companyWebsite}</div>
        </div>
        <div class="report-info">
          <div class="report-title">Bookings Report</div>
          <div>Generated: ${moment().format('MMM D, YYYY h:mm A')}</div>
        </div>        
      </div>

      <div class="report-details">
        <div class="date-range">
          Date Range: ${startDate ? moment(startDate).format('MMM D, YYYY') : 'All records'} to ${endDate ? moment(endDate).format('MMM D, YYYY') : 'Present'}
        </div>
        <div>Total Records: ${filteredData.length}</div>
      </div>

      <div class="summary">
        <strong>Report Summary:</strong> Bookings report for ${startDate || endDate ? 'selected date range' : 'all available data'}
      </div>

      <table>
        <thead>
          <tr>
          <th class="column-narrow">Booking ID</th>
        <th class="column-narrow">Request ID</th>
        <th class="column-medium">Booking Type</th>
        <th class="column-medium">Booking Mode</th>
        <th class="column-medium">Status</th>
        <th class="column-wide">Customer Name</th>
        <th class="column-wide">Customer Email</th>
        <th class="column-wide">Customer Phone</th>
        <th class="column-wide">Transporter Name</th>
      </tr>
      <tr>
        <th class="column-wide">Transporter Email</th>
        <th class="column-wide">Transporter Phone</th>
        <th class="column-medium">Transporter Type</th>
        <th class="column-wide">Vehicle Details</th>
        <th class="column-wide">From Location</th>
        <th class="column-wide">To Location</th>
        <th class="column-medium">Product Type</th>
        <th class="column-narrow">Weight (kg)</th>
      </tr>
    </thead>
       <tbody>
`;

filteredData.forEach(row => {
  html += `
    <tr>
      <td>${row['Booking ID'] || 'N/A'}</td>
      <td>${row['Request ID'] || 'N/A'}</td>
      <td>${row['Booking Type'] || 'N/A'}</td>
      <td>${row['Booking Mode'] || 'N/A'}</td>
      <td>${row['Status'] || 'N/A'}</td>
      <td>${row['Customer Name'] || 'N/A'}</td>
      <td>${row['Customer Email'] || 'N/A'}</td>
      <td>${row['Customer Phone'] || 'N/A'}</td>
      <td>${row['Transporter Name'] || 'Not assigned'}</td>
    </tr>
    <tr>
      <td>${row['Transporter Email'] || 'N/A'}</td>
      <td>${row['Transporter Phone'] || 'N/A'}</td>
      <td>${row['Transporter Type'] || 'N/A'}</td>
      <td>${row['Vehicle Details'] || 'Not assigned'}</td>
      <td>${row['From Location'] || 'N/A'}</td>
      <td>${row['To Location'] || 'N/A'}</td>
      <td>${row['Product Type'] || 'N/A'}</td>
      <td>${row['Weight (kg)'] || 'N/A'}</td>
    </tr>
  `;
});

html += `
    </tbody>
  </table>


      <div class="footer">
        <div>${companyName} - Confidential Report</div>
        <div>Generated on ${moment().format('MMM D, YYYY h:mm A')} | Page {{page}} of {{pages}}</div>
      </div>
    </body>
    </html>
    `;

    const options = { 
      format: 'A4', 
      orientation: 'landscape',
      footer: {
        height: "10mm",
        contents: {
          default: '<span style="color: #444; font-size: 8px;">Page {{page}} of {{pages}}</span>', 
        }
      },
      border: {
        top: "0.4in",
        right: "0.4in",
        bottom: "0.6in",
        left: "0.4in"
      }
    };

    pdf.create(html, options).toStream((err, stream) => {
      if (err) {
        console.error('PDF generation error:', err);
        return res.status(500).json({ success: false, message: 'Failed to generate PDF' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=bookings_report_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
      stream.pipe(res);
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};


exports.generateBookingPdf = async (req, res) => {
  try {
    const { startDate, endDate, view = 'summary' } = req.query;

    // Fetch bookings and related data
    const bookings = await Booking.getAll();
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'No bookings found' });
    }

    const formatVehicleInfo = (transporter) => {
      if (!transporter) return 'Not assigned';
      const parts = [];
      if (transporter.vehicleColor) parts.push(transporter.vehicleColor);
      if (transporter.vehicleMake) parts.push(transporter.vehicleMake);
      if (transporter.vehicleModel) parts.push(transporter.vehicleModel);
      if (transporter.vehicleYear) parts.push(`(${transporter.vehicleYear})`);
      if (transporter.vehicleRegistration) parts.push(`- ${transporter.vehicleRegistration}`);
      if (transporter.vehicleCapacity) parts.push(`- ${transporter.vehicleCapacity}kg capacity`);
      return parts.join(' ');
    };

    const formatFirestoreTimestamp = (timestamp) => {
      if (!timestamp || !timestamp._seconds) return 'N/A';
      return moment(timestamp._seconds * 1000).format('MMM D, YYYY h:mm A');
    };

    const data = await Promise.all(bookings.map(async (booking) => {
      const user = await User.get(booking.userId);
      const transporter = booking.transporterId ? await Transporter.get(booking.transporterId) : null;

      return {
        bookingId: booking.bookingId || 'N/A',
        requestId: booking.requestId || 'N/A',
        bookingType: booking.bookingType || 'N/A',
        bookingMode: booking.bookingMode || 'N/A',
        status: booking.status || 'N/A',
        customerName: user?.name || 'N/A',
        customerEmail: user?.email || 'N/A',
        customerPhone: user?.phone || 'N/A',
        transporterName: transporter?.displayName || 'Not assigned',
        transporterEmail: transporter?.email || 'N/A',
        transporterPhone: transporter?.phoneNumber || 'N/A',
        transporterType: transporter?.transporterType || 'N/A',
        vehicleDetails: formatVehicleInfo(transporter),
        fromLocation: booking.fromLocation || 'N/A',
        toLocation: booking.toLocation || 'N/A',
        productType: booking.productType || 'N/A',
        weightKg: booking.weightKg || 'N/A',
        totalCost: `KES ${booking.cost || 0}`,
        fuelSurcharge: `KES ${booking.fuelSurcharge || 0}`,
        waitTimeFee: `KES ${booking.waitTimeFee || 0}`,
        pickUpDate: formatFirestoreTimestamp(booking.pickUpDate),
        acceptedAt: formatFirestoreTimestamp(booking.acceptedAt),
        createdAt: formatFirestoreTimestamp(booking.createdAt),
        updatedAt: formatFirestoreTimestamp(booking.updatedAt),
        urgencyLevel: booking.urgencyLevel || 'N/A',
        perishable: booking.perishable ? 'Yes' : 'No',
        refrigeration: booking.needsRefrigeration ? 'Yes' : 'No',
        insured: booking.insured ? 'Yes' : 'No',
        notes: booking.additionalNotes || 'None'
      };
    }));

    // Filter by date range
    const filteredData = data.filter(booking => {
      if (!booking.createdAt || booking.createdAt === 'N/A') return true;
      const createdAt = moment(booking.createdAt, 'MMM D, YYYY h:mm A');
      if (startDate && createdAt.isBefore(moment(startDate))) return false;
      if (endDate && createdAt.isAfter(moment(endDate))) return false;
      return true;
    });

    if (filteredData.length === 0) {
      return res.status(404).json({ success: false, message: 'No bookings found in the specified date range' });
    }

    // Company info
    const companyName = "TRUK AFRICA";
    const companyAddress = "123 NAIROBI";
    const companyPhone = "+254 758-594951";
    const companyEmail = "info@trukafrica.com";
    const companyWebsite = "www.trukafrica.com";
    const generatedDate = moment().format('MMM D, YYYY h:mm A');

    // ---------- HTML GENERATION ----------

    let tableHeaders = '';
    let tableRows = '';

    if (view === 'summary') {
      // --- Summary View ---
      tableHeaders = `
        <tr>
          <th>Booking ID</th>
          <th>Status</th>
          <th>Customer</th>
          <th>Transporter</th>
          <th>From</th>
          <th>To</th>
          <th>Product</th>
          <th>Weight</th>
          <th>Total Cost</th>
          <th>Pickup Date</th>
        </tr>
      `;
      filteredData.forEach(row => {
        tableRows += `
          <tr>
            <td>${row.bookingId}</td>
            <td>${row.status}</td>
            <td>${row.customerName}</td>
            <td>${row.transporterName}</td>
            <td>${row.fromLocation}</td>
            <td>${row.toLocation}</td>
            <td>${row.productType}</td>
            <td>${row.weightKg}</td>
            <td>${row.totalCost}</td>
            <td>${row.pickUpDate}</td>
          </tr>
        `;
      });
    } else {
      // --- Detailed View ---
      tableHeaders = `
        <tr>
          <th>Booking ID</th>
          <th>Request ID</th>
          <th>Booking Type</th>
          <th>Booking Mode</th>
          <th>Status</th>
          <th>Customer</th>
          <th>Transporter</th>
          <th>Vehicle</th>
          <th>From</th>
          <th>To</th>
          <th>Product</th>
          <th>Weight</th>
          <th>Cost</th>
          <th>Surcharges</th>
          <th>Urgency</th>
          <th>Perishable</th>
          <th>Refrigeration</th>
          <th>Insured</th>
          <th>Pickup Date</th>
          <th>Notes</th>
        </tr>
      `;
      filteredData.forEach(row => {
        tableRows += `
          <tr>
            <td>${row.bookingId}</td>
            <td>${row.requestId}</td>
            <td>${row.bookingType}</td>
            <td>${row.bookingMode}</td>
            <td>${row.status}</td>
            <td>${row.customerName} / ${row.customerPhone} / ${row.customerEmail}</td>
            <td>${row.transporterName} / ${row.transporterPhone} / ${row.transporterEmail}</td>
            <td>${row.vehicleDetails}</td>
            <td>${row.fromLocation}</td>
            <td>${row.toLocation}</td>
            <td>${row.productType}</td>
            <td>${row.weightKg}</td>
            <td>${row.totalCost}</td>
            <td>${row.fuelSurcharge} / ${row.waitTimeFee}</td>
            <td>${row.urgencyLevel}</td>
            <td>${row.perishable}</td>
            <td>${row.refrigeration}</td>
            <td>${row.insured}</td>
            <td>${row.pickUpDate}</td>
            <td>${row.notes}</td>
          </tr>
        `;
      });
    }

    const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Bookings Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 15px; color: #333; font-size: 10px; }
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #4a86e8;
            padding-bottom: 10px;
          }
          .company-info {
            flex: 1;
            text-align: center;
          }
          .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #4a86e8;
            margin-bottom: 3px;
          }
          .report-info {
            text-align: right;
            font-size: 9px;
          }
          .report-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .logo {
            flex: 0 0 auto;
            margin-right: 20px;
          }
          .logo img {
            width: 60px;
            height: 60px;
            object-fit: contain;
          }
          .report-details {
            margin: 15px 0;
            padding: 10px;
            background-color: #f9f9f9;
            border-radius: 4px;
            font-size: 9px;
          }
          .date-range {
            font-style: italic;
            margin-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 8px;
            table-layout: fixed;
          }
          th {
            background-color: #4a86e8;
            color: white;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
            word-wrap: break-word;
          }
          td {
            padding: 4px;
            border-bottom: 1px solid #ddd;
            word-wrap: break-word;
            vertical-align: top;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            color: #777;
            border-top: 1px solid #ddd;
            padding-top: 8px;
          }
          .summary {
            margin: 10px 0;
            padding: 8px;
            background-color: #e7f3fe;
            border-left: 3px solid #4a86e8;
            font-size: 9px;
          }
          .column-narrow {
            width: 60px;
          }
          .column-medium {
            width: 80px;
          }
          .column-wide {
            width: 120px;
          }
          .split-cell {
            display: flex;
            flex-direction: column;
            line-height: 1.2;
          }
          .split-cell div {
            margin-bottom: 2px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo"> 
            <img src="https://res.cloudinary.com/trukapp/image/upload/v1750965061/TRUK_Logo_zp8lv3.png" alt="TRUK Logo">
          </div>
          <div class="company-info">
            <div class="company-name">${companyName}</div>
            <div>${companyAddress}</div>
            <div>${companyPhone} | ${companyEmail}</div>
            <div>${companyWebsite}</div>
          </div>
          <div class="report-info">
            <div class="report-title">Bookings Report</div>
            <div>Generated: ${moment().format('MMM D, YYYY h:mm A')}</div>
          </div>        
        </div>

        <div class="report-details">
          <div class="date-range">
            Date Range: ${startDate ? moment(startDate).format('MMM D, YYYY') : 'All records'} to ${endDate ? moment(endDate).format('MMM D, YYYY') : 'Present'}
          </div>
          <div>Total Records: ${filteredData.length}</div>
        </div>

        <div class="summary">
          <strong>Report Summary:</strong> Bookings report for ${startDate || endDate ? 'selected date range' : 'all available data'}
        </div>
        <table>
          <thead>${tableHeaders}</thead>
          <tbody>${tableRows}</tbody>
        </table>

       
      </body>
      </html>
    `;

    // PDF Options with footer configuration
    const options = { 
      format: 'A4', 
      orientation: 'landscape',
      footer: {
        height: "15mm",
         contents: {
          default: '<div style="text-align: center; color: #777; font-size: 8px;">' + companyName + ' - Confidential Report<br>Generated on ' + generatedDate + ' | Page {{page}} of {{pages}}</div>'
        }
      },
      border: {
        top: "0.4in",
        right: "0.4in",
        bottom: "0.6in",
        left: "0.4in"
      }
    };

    pdf.create(html, options).toStream((err, stream) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to generate PDF' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=bookings_report_${view}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
      stream.pipe(res);
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
};

exports.generateBookingCsv = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Fetch bookings and related data
    const bookings = await Booking.getAll();
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'No bookings found' });
    }

    // Format Firestore timestamp
    const formatFirestoreTimestamp = (timestamp) => {
      if (!timestamp || !timestamp._seconds) return 'N/A';
      return moment(timestamp._seconds * 1000).format('MMM D, YYYY h:mm A');
    };

    // Prepare booking data
    const data = await Promise.all(bookings.map(async (booking) => {
      const user = await User.get(booking.userId);
      const transporter = booking.transporterId ? await Transporter.get(booking.transporterId) : null;

      return {
        'Booking ID': booking.bookingId || 'N/A',
        'Request ID': booking.requestId || 'N/A',
        'Booking Type': booking.bookingType || 'N/A',
        'Booking Mode': booking.bookingMode || 'N/A',
        'Status': booking.status || 'N/A',
        'Customer Name': user?.displayName || 'N/A',
        'Customer Email': user?.email || 'N/A',
        'Customer Phone': user?.phoneNumber || 'N/A',
        'Transporter Name': transporter?.displayName || 'Not assigned',
        'Transporter Email': transporter?.email || 'N/A',
        'Transporter Phone': transporter?.phoneNumber || 'N/A',
        'Transporter Type': transporter?.transporterType || 'N/A',
        'Vehicle Details': transporter ? `${transporter.vehicleColor || ''} ${transporter.vehicleMake || ''} ${transporter.vehicleModel || ''} (${transporter.vehicleYear || ''}) - ${transporter.vehicleRegistration || ''} - ${transporter.vehicleCapacity || ''}kg capacity`.trim() : 'Not assigned',
        'From Location': booking.fromLocation || 'N/A',
        'To Location': booking.toLocation || 'N/A',
        'Product Type': booking.productType || 'N/A',
        'Weight (kg)': booking.weightKg || 'N/A',
        'Special Cargo': Array.isArray(booking.specialCargo) ? booking.specialCargo.join(', ') : booking.specialCargo || 'None',
        'Total Cost': `KES ${booking.cost || 0}`,
        'Fuel Surcharge': `KES ${booking.fuelSurcharge || 0}`,
        'Wait Time Fee': `KES ${booking.waitTimeFee || 0}`,
        'Pickup Date': formatFirestoreTimestamp(booking.pickUpDate),
        'Accepted At': formatFirestoreTimestamp(booking.acceptedAt),
        'Created At': formatFirestoreTimestamp(booking.createdAt),
        'Updated At': formatFirestoreTimestamp(booking.updatedAt),
        'Urgency Level': booking.urgencyLevel || 'N/A',
        'Perishable': booking.perishable ? 'Yes' : 'No',
        'Refrigeration Needed': booking.needsRefrigeration ? 'Yes' : 'No',
        'Insured': booking.insured ? 'Yes' : 'No',
        'Additional Notes': booking.additionalNotes || 'None'
      };
    }));

    // Filter by date range if provided
    const filteredData = data.filter(booking => {
      if (!booking['Created At'] || booking['Created At'] === 'N/A') return true;
      const createdAt = moment(booking['Created At'], 'MMM D, YYYY h:mm A');
      if (startDate && createdAt.isBefore(moment(startDate))) return false;
      if (endDate && createdAt.isAfter(moment(endDate))) return false;
      return true;
    });

    if (filteredData.length === 0) {
      return res.status(404).json({ success: false, message: 'No bookings found in the specified date range' });
    }

    // Generate CSV content
    const headers = Object.keys(filteredData[0]);
    let csv = [
      'Company,TRUK AFRICA',
      'Address,123 NAIROBI',
      'Phone,+254 758-594951',
      'Email,info@trukafrica.com',
      'Website,www.trukafrica.com',
      '',
      `Report Title,Bookings Report`,
      `Generated,${moment().format('MMM D, YYYY h:mm A')}`,
      `Date Range,${startDate ? moment(startDate).format('MMM D, YYYY') : 'All records'} to ${endDate ? moment(endDate).format('MMM D, YYYY') : 'Present'}`,
      `Total Records,${filteredData.length}`,
      '',
      `Report Summary,Bookings report for ${startDate || endDate ? 'selected date range' : 'all available data'}`,
      '',
      headers.join(',')
    ];

    filteredData.forEach(row => {
      const values = headers.map(header => {
        let value = row[header] || '';
        // Ensure value is a string before applying replace
        value = String(value).replace(/"/g, '""');
        if (value.includes(',')) value = `"${value}"`;
        return value;
      });
      csv.push(values.join(','));
    });

    csv.push('');
    csv.push('TRUK AFRICA - Confidential Report');
    csv.push(`Generated on ${moment().format('MMM D, YYYY h:mm A')} | Page 1 of 1`);

    // Send CSV response
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bookings_report_${moment().format('YYYYMMDD_HHmmss')}.csv`);
    res.send(csv.join('\n'));

  } catch (error) {
    console.error('CSV generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate CSV' });
  }
};