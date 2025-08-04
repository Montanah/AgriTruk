const cloudinary = require('cloudinary').v2;
const fs = require('fs');

require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const uploadImage = async (filePath, resourceType = 'image') => {
  console.log(`Attempting to upload ${filePath} as ${resourceType}`); // Debug start
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    resource_type: resourceType,
  };

  try {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    console.log('Uploading to Cloudinary with options:', options); // Debug options
    const result = await cloudinary.uploader.upload(filePath, options);
    console.log(`Uploaded to Cloudinary (${resourceType}):`, result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error(`Cloudinary upload error (${resourceType}):`, error.message, error.stack); // Detailed error
    return null;
  }
};

module.exports = {
  uploadImage,
};