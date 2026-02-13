// Faz 2 — File Upload Validator (Multer + DOCX validation)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed MIME types for DOCX
const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/octet-stream',
  'application/x-zip-compressed'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.docx') {
    return cb(new Error('Only .docx files are allowed'), false);
  }
  // Accept any MIME for .docx extension — we validate magic bytes after upload
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Validate DOCX magic bytes (PK zip signature: 50 4B 03 04)
function validateDocxMagicBytes(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    return buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
  } catch {
    return false;
  }
}

// Error handler middleware for multer errors
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large. Maximum 50MB allowed.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
}

module.exports = { upload, validateDocxMagicBytes, handleUploadError };
