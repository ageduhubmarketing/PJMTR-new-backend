const express = require('express');

const {
  registerAuthor,
  verifyAuthorOTP,
  loginAuthor,
  getAuthorProfile
} = require('../Controllers/authorController');

const authorAuth = require('../Middleware/authorAuth');

const router = express.Router();

// Author Registration
router.post('/register', registerAuthor);

// Author OTP Verification
router.post('/verify-otp', verifyAuthorOTP);
// Author Login
router.post('/login', loginAuthor);
// Get Author Profile
router.get('/profile', authorAuth, getAuthorProfile);

module.exports = router;
