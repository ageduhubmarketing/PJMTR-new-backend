const express = require('express');

const {
  registerAuthor,
  verifyAuthorOTP,
  loginAuthor
} = require('../Controllers/authorController');

const router = express.Router();

// Author Registration
router.post('/register', registerAuthor);

// Author OTP Verification
router.post('/verify-otp', verifyAuthorOTP);
// Author Login
router.post('/login', loginAuthor);

module.exports = router;
