const cloudinary = require('cloudinary').v2;
const fs = require('fs');

require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const uploadImage = async (filePath) => {
  
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    resource_type: 'auto',
  };

  try {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    const result = await cloudinary.uploader.upload(filePath, options);
   
    return result.secure_url;
  } catch (error) {
    console.error(`Cloudinary upload error (${result.resource_type}):`, error.message, error.stack); // Detailed error
    return null;
  }
};

module.exports = {
  uploadImage,
};