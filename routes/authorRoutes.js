const express = require('express');

const {
  registerAuthor
} = require('../Controllers/authorController');

const router = express.Router();

// Author Registration
router.post('/register', registerAuthor);

module.exports = router;
