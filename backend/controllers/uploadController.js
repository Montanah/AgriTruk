const fs = require('fs');
const path = require('path');
const { uploadImage } = require('../utils/cloudinaryUpload');

exports.handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const url = await uploadImage(filePath);

    // Clean up local file
    try {
      fs.unlinkSync(filePath);
    } catch {}

    if (!url) {
      return res.status(500).json({ success: false, message: 'Failed to upload to Cloudinary' });
    }

    return res.status(200).json({ success: true, url });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ success: false, message: 'Upload failed' });
  }
};


