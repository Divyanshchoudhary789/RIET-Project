const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const { sendError } = require('../utils/response');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE_MB = 10;

// Use memory storage — files are uploaded directly to Cloudinary from buffer
const memoryStorage = multer.memoryStorage();

/**
 * Uploads a buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} folder - Cloudinary folder path
 * @param {string} originalname - Original filename for public_id generation
 * @param {string} [mimetype] - The file's MIME type, used to pick the right resource_type
 * @returns {Promise<string>} Secure URL of the uploaded file
 */
const uploadBufferToCloudinary = (buffer, folder, originalname, mimetype = '') => {
  return new Promise((resolve, reject) => {
    // Cloudinary's default account security setting blocks delivery of PDFs (and other
    // non-image documents) uploaded as resource_type "image"/"auto" with a 401
    // "deny or ACL failure" — confirmed by direct testing, and it affects every such
    // file regardless of age or delivery type. Uploading them as "raw" instead
    // bypasses the image-delivery pipeline entirely and is unaffected by that
    // restriction. Actual images (jpg/png/webp) are unaffected and keep using "auto".
    const resourceType = mimetype.startsWith('image/') ? 'auto' : 'raw';

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `riet/${folder}`,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: true,
        // Plain public delivery — the random, non-guessable public_id
        // (unique_filename: true) is the achievable protection against enumeration
        // on this account's plan (see git history for why type:'authenticated' was
        // tried and reverted).
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Creates a multer middleware instance that stores files in memory.
 * Call uploadBufferToCloudinary after this middleware to actually persist the file.
 * @param {number} [maxFiles=5]
 */
const createUploadMiddleware = (folder, maxFiles = 5) => {
  return multer({
    storage: memoryStorage,
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `File type ${file.mimetype} is not allowed.`));
      }
    },
  });
};

/**
 * Express error handler for multer errors.
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 400, `File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
    }
    return sendError(res, 400, `File upload error: ${err.message}`);
  }
  next(err);
};

module.exports = { createUploadMiddleware, handleUploadError, uploadBufferToCloudinary };
