const express = require('express');

const {
  registerAuthor,
  verifyAuthorOTP
} = require('../Controllers/authorController');

const router = express.Router();

// Author Registration
router.post('/register', registerAuthor);

// Author OTP Verification
router.post('/verify-otp', verifyAuthorOTP);

module.exports = router;
