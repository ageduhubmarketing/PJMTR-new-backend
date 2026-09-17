const express = require('express');
const multer = require('multer');

const {
  registerAuthor,
  verifyAuthorOTP,
  loginAuthor,
  getAuthorProfile,
  updateAuthorProfile
} = require('../Controllers/authorController');

const {getAuthorPayments} = require("../Controllers/paymentController");

const authorAuth = require('../Middleware/authorAuth');

const router = express.Router();

// Profile Image Upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Author Registration
router.post('/register', registerAuthor);

// Author OTP Verification
router.post('/verify-otp', verifyAuthorOTP);

// Author Login
router.post('/login', loginAuthor);

// Get Author Profile
router.get('/profile', authorAuth, getAuthorProfile);

// Update Author Profile
router.put(
  '/profile',
  authorAuth,
  upload.single('profileImage'),
  updateAuthorProfile
);
router.get("/payments",authorAuth,getAuthorPayments);

module.exports = router;
