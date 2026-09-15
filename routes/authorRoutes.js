const express = require('express');

const {
  registerAuthor,
  loginAuthor
} = require('../controllers/authorController');

const router = express.Router();

// Author Registration
router.post('/register', registerAuthor);

// Author Login
router.post('/login', loginAuthor);

module.exports = router;
