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
const {getAuthorRevisions,submitAuthorRevision} = require("../Controllers/paperController");

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
// Revised PDF Upload
const revisionUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
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
router.put('/profile',authorAuth,upload.single('profileImage'),updateAuthorProfile);
router.get("/payments",authorAuth,getAuthorPayments);
// Revision Routes
router.get("/revisions",authorAuth,getAuthorRevisions);
router.post("/revisions/:paperId/submit",authorAuth,revisionUpload.single("revisedFile"),submitAuthorRevision);

module.exports = router;
