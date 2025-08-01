const cloudinary = require('cloudinary').v2;

require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// console.log(cloudinary.config());

const uploadImage = async (imagePath) => {
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    };

    try {
      // Upload the image
      // if (!imagePath || !fs.existsSync(imagePath)) {
      //   throw new Error(`Invalid image path: ${imagePath}`);
      // }
      const result = await cloudinary.uploader.upload(imagePath, options);
      console.log('Uploaded to Cloudinary:', result.secure_url);
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
    }
};

module.exports = {
  uploadImage,
};