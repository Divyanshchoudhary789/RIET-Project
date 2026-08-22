const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authenticate');
const { requirePasswordChange } = require('../../middleware/authorize');
const { createUploadMiddleware, handleUploadError, uploadBufferToCloudinary } = require('../../middleware/upload');
const { sendSuccess, sendError } = require('../../utils/response');

const generalUpload = createUploadMiddleware('documents', 5);

router.use(authenticate, requirePasswordChange);

/**
 * POST /api/attachments/upload
 * Generic file upload endpoint.
 * Accepts up to 5 files; returns Cloudinary secure URLs.
 * These URLs can be stored in any document's attachments field.
 *
 * Files are stored with Cloudinary's "authenticated" delivery type (see
 * middleware/upload.js) — the returned secure_url is cryptographically signed by
 * Cloudinary at upload time, so it cannot be guessed or enumerated by a third party;
 * only someone who is handed this exact URL (via an already role/document-gated API
 * response) can fetch the file.
 */
router.post(
  '/upload',
  generalUpload.array('files', 5),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return sendError(res, 400, 'No files were uploaded.');
      }

      const uploadPromises = req.files.map((file) =>
        uploadBufferToCloudinary(file.buffer, 'documents', file.originalname, file.mimetype)
      );

      const urls = await Promise.all(uploadPromises);

      return sendSuccess(res, 200, 'Files uploaded successfully.', { urls });
    } catch (err) {
      // Cloudinary not configured or upload failed
      if (err.message && err.message.includes('cloudinary')) {
        return sendError(res, 503, 'File storage service is not available. Contact your administrator.');
      }
      return sendError(res, 500, 'File upload failed.');
    }
  }
);

module.exports = router;
