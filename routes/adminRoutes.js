const express = require('express');
const router = express.Router();

// ✅ ONLY ONE TIME import attachemnt 
const {
  publishPaper,
  getCertificates
} = require('../Controllers/paperController');
const {
  adminLogin,
  getAllPapers,
  updateStatus,
  approvePaper,
  rejectPaper,
  sendToRevision,
  deletePaper,
  getTrashPapers,
  restorePaper,
  permanentDeletePaper,
  bulkPermanentDelete,
  markPaperAsRead,
  getApprovedPapers,
  getAllPayments,
  updateWaveOff,
  assignReviewer,
  saveRemark,
  uploadPaperFiles,
  deletePaperFile
} = require('../Controllers/adminController');

const authMiddleware = require('../Middleware/authMiddleware');
const adminMiddleware = require('../Middleware/adminmiddleware');
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(null, "uploads/revision-files");

  },

  filename: function (req, file, cb) {

    cb(
      null,
      Date.now() +
        path.extname(file.originalname)
    );

  },

});

const upload = multer({ storage });
const adminFileStorage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(null, "uploads/admin-files");

  },

  filename: function (req, file, cb) {

    cb(
      null,
      Date.now() +
      "-" +
      file.originalname
    );

  },

});

const adminFileUpload = multer({

  storage: adminFileStorage,

  limits: {
    fileSize: 1024 * 1024, // 1MB
  },

});


// ==============================
// 🔓 PUBLIC ROUTE
// ==============================

router.post('/login', adminLogin);

// ==============================
// 🔐 PROTECTED ADMIN ROUTES
// ==============================

router.get('/papers', authMiddleware, adminMiddleware, getAllPapers);
router.get('/approved-papers', authMiddleware, adminMiddleware, getApprovedPapers);

router.put('/status/:id', authMiddleware, adminMiddleware, updateStatus);

router.put('/approve/:id', authMiddleware, adminMiddleware, approvePaper);
router.put('/reject/:id', authMiddleware, adminMiddleware, rejectPaper);

// ✅ NEW ROUTES
router.put('/revision/:id', authMiddleware, adminMiddleware, upload.single("attachment"), sendToRevision);

router.put('/publish/:id', authMiddleware, adminMiddleware, publishPaper);
router.get('/certificates', authMiddleware, adminMiddleware, getCertificates);
router.get('/payments', authMiddleware, adminMiddleware, getAllPayments);
router.put('/payments/:paymentId/waveoff', authMiddleware, adminMiddleware, updateWaveOff);

router.delete('/papers/:id', authMiddleware, adminMiddleware, deletePaper);
router.get( '/trash', authMiddleware, adminMiddleware, getTrashPapers);
router.put( '/restore/:id', authMiddleware, adminMiddleware, restorePaper);
router.delete( '/permanent-delete/:id', authMiddleware, adminMiddleware, permanentDeletePaper);
router.post( '/bulk-permanent-delete', authMiddleware, adminMiddleware, bulkPermanentDelete);
router.put( "/read/:id", authMiddleware, markPaperAsRead);
router.put( "/assign-reviewer/:paperId", authMiddleware, adminMiddleware, assignReviewer);
router.put( "/remark/:id", authMiddleware, adminMiddleware, saveRemark);
router.post( "/upload-paper-file/:paperId", authMiddleware, adminMiddleware, adminFileUpload.array( "files",5 ), uploadPaperFiles);
router.delete( "/delete-paper-file/:paperId/:fileId", authMiddleware, adminMiddleware, deletePaperFile);

// ==============================
// 🚀 EXPORT
// ==============================

module.exports = router;
