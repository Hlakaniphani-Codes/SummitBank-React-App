const fs = require('fs');
const path = require('path');
const multer = require('multer');

require('dotenv').config();

const uploadPath = process.env.UPLOAD_PATH || './uploads/kyc';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '_' + safe);
  },
});

const limits = {
  fileSize: Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024),
};

const upload = multer({ storage, limits });

module.exports = upload;

