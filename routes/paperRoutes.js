// backend/Routes/paperRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import controller functions
const {
  submitPaper,
  getStatus,
  getFileById,
  getCoverLetter,
  getSupplementaryFile,
  approvePaper,
  rejectPaper,
  deletePaper,
  getAllPapers,
  saveTrendingPapers,
  getTrendingPapers,
  downloadCertificate
} = require('../Controllers/paperController');

// =============================
// Multer Storage (In-Memory)
// =============================
const storage = multer.memoryStorage();
const upload = multer({ storage });

// =============================
// Routes
// =============================

// Submit paper with 3 files: manuscript, cover letter, supplementary file
router.post(
  '/submit',
  upload.fields([
    { name: 'manuscriptFile', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 },
    { name: 'supplementaryFile', maxCount: 1 },
  ]),
  submitPaper
);

// Get status of a paper by ID
router.get('/status/:id', getStatus);

// Get file by paper ID
router.get('/file/:id', getFileById);
router.get('/cover/:id', getCoverLetter);
router.get('/supplement/:id', getSupplementaryFile);

// Approve a paper
router.put('/approve/:id', approvePaper);

// Reject a paper
router.put('/reject/:id', rejectPaper);

// Delete a paper
router.delete('/delete/:id', deletePaper);
// Get all papers (admin dropdown)
router.get('/all', getAllPapers);

// Save trending papers
router.post('/trending-papers', saveTrendingPapers);

// Get trending papers
router.get('/trending-papers', getTrendingPapers);
// Download Certificate from MongoDB
router.get("/certificate/:id", downloadCertificate);
module.exports = router;
