const multer = require('multer');

// Ensure uploads directory exists
const fs = require('fs');
const path = require('path');
const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = (file.originalname || '').split('.').pop() || 'bin';
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common image and document formats
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test((file.originalname || '').toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype || '');

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  },
});

// Export different upload configurations
const uploadSingle = upload.single('file');
const uploadAny = upload.any();
const uploadArray = (fieldName, maxCount) => upload.array(fieldName, maxCount);

module.exports = {
  uploadSingle,
  uploadAny,
  uploadArray,
  upload,
};


