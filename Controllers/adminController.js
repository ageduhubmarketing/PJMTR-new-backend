const Admin = require('../Models/Admin');
const Paper = require('../Models/Paper');
const Payment = require("../Models/Payment");
const Reviewer = require("../Models/reviewerModel"); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require("fs");
const path = require("path");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
const getRecipientDetails = (paper) => {
  const correspondingAuthor =
    paper?.correspondingAuthor || {};

  const firstAuthor =
    paper?.authors?.[0] || {};

  const recipientEmail =
    correspondingAuthor.email ||
    firstAuthor.email ||
    null;

  const recipientName =
    correspondingAuthor.email
      ? `${correspondingAuthor.firstName || ""} ${correspondingAuthor.lastName || ""}`.trim()
      : `${firstAuthor.firstName || ""} ${firstAuthor.lastName || ""}`.trim();

  return {
    recipientEmail,
    recipientName,
  };
};


exports.adminLogin = async (req, res) => {
  try {
    console.log("LOGIN API HIT"); // 🔥 ADD THIS

   let { email, password } = req.body;

console.log("Incoming Email:", email);

email = email.trim().toLowerCase();

const admin = await Admin.findOne({
  email
});

console.log("Admin Found:", admin);
    if (!admin) {
      console.log("Admin not found");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log("Password mismatch");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    console.log("TOKEN GENERATED"); // 🔥

    return res.json({ token }); // ✅ IMPORTANT (return)
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getAllPapers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = req.query.download === "true"
  ? 0
  : 5;
const { status, fromDate, toDate, search } = req.query;

let filter = {};

if (search) {
  filter.$or = [
    {
      applicationId: {
        $regex: search,
        $options: "i",
      },
    },
    {
      title: {
        $regex: search,
        $options: "i",
      },
    },

    // Keywords
    {
      keywords: {
        $regex: search,
        $options: "i",
      },
    },

    // Author First Name
    {
      "authors.firstName": {
        $regex: search,
        $options: "i",
      },
    },

    // Author Last Name
    {
      "authors.lastName": {
        $regex: search,
        $options: "i",
      },
    },

    // Corresponding Author First Name
    {
      "correspondingAuthor.firstName": {
        $regex: search,
        $options: "i",
      },
    },

    // Corresponding Author Last Name
    {
      "correspondingAuthor.lastName": {
        $regex: search,
        $options: "i",
      },
    },
  ];
}
if (status && status !== "all") {

  if (status === "under review") {
    filter.status = "Under Reviewing";
  } else {
    filter.status =
      status.charAt(0).toUpperCase() +
      status.slice(1);
  }
}

if (fromDate || toDate) {

  filter.createdAt = {};

  if (fromDate) {
    filter.createdAt.$gte = new Date(fromDate);
  }

  if (toDate) {

    const to = new Date(toDate);

    to.setHours(23, 59, 59, 999);

    filter.createdAt.$lte = to;
  }
}
    const papers = await Paper.find({
  ...filter,
  isDeleted: { $ne: true },
})
     .select(
  req.query.download === "true"
    ? `
      applicationId
      title
      researchArea
      keywords
      abstract
      message
      country
      state
      city
      postalCode
      address
      status
      createdAt
      authors
      correspondingAuthor
      isRead
    `
    : `
      manuscriptType
      title
      abstract
      keywords
      researchArea
      authors
      correspondingAuthor
      country
      state
      city
      postalCode
      address
      message
      ethicalApproval
      ethicalApprovalNumber
      conflictOfInterest
      conflictDetails
      fundingSupport
      fundingAmount
      fundingInstitution
      reviewers
      nonPreferredReviewer
      assignedReviewers
      agreement
      status
      createdAt
      applicationId
      file
      coverLetter
      supplementaryFile
      adminFiles
      adminRemark
      isRead
      revisionHistory
    `
)
     .sort({ _id: -1 })

.skip(limit ? (page - 1) * limit : 0)

.limit(limit || 0)

.lean();
papers.forEach((paper) => {
  if (paper.file) {
    delete paper.file.data;
  }

  if (paper.coverLetter) {
    delete paper.coverLetter.data;
  }

  if (paper.supplementaryFile) {
    delete paper.supplementaryFile.data;
  }

  // Remove revised file binary data
  if (paper.revisionHistory) {
    paper.revisionHistory.forEach((revision) => {
      if (revision.revisedFile) {
        delete revision.revisedFile.data;
      }
    });
  }
});
    const total = await Paper.countDocuments({
  ...filter,
  isDeleted: { $ne: true },
});

    res.json({
  papers,
  currentPage: page,
  totalPages: limit
    ? Math.ceil(total / limit)
    : 1,
  totalPapers: total,
});

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const paper = await Paper.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!paper) return res.status(404).json({ message: 'Paper not found' });
  res.json({ message: `Paper ${status}`, paper });
};
exports.approvePaper = async (req, res) => {

  try {

    const paper =
      await Paper.findByIdAndUpdate(

        req.params.id,

       {
        status: "Approved",
        authorStatus: "Approved",
        approvedAt: new Date(),
      },

        { new: true }

      );

    if (!paper) {

      return res.status(404).json({

        message:
          "Paper not found",

      });

    }
    // ==============================
// CREATE PAYMENT ENTRY
// ==============================

const existingPayment =
  await Payment.findOne({
    applicationId: paper.applicationId,
  });

if (!existingPayment) {
const authors =
  paper.authors || [];

const correspondingAuthor =
  paper.correspondingAuthor || {};

// ==============================
// TOTAL AUTHOR COUNT
// ==============================
let totalAuthors = authors.length;
const hasCorrespondingAuthor =
  correspondingAuthor?.email;

const isCorrespondingIncluded =
  hasCorrespondingAuthor &&
  authors.some(
    (author) =>
      author.email &&
      author.email.toLowerCase() ===
      correspondingAuthor.email.toLowerCase()
  );

if (
  hasCorrespondingAuthor &&
  !isCorrespondingIncluded
) {
  totalAuthors += 1;
}
  // ==============================
// COUNTRY TYPE
// ==============================

const country =
  correspondingAuthor?.country ||
  authors?.[0]?.country ||
  "India";

const isIndian =
  country.toLowerCase() === "india";

const countryType = isIndian
  ? "Indian"
  : "Non-Indian";

// ==============================
// AMOUNT CALCULATION
// ==============================

let baseAmount = 0;

let extraAuthors = 0;

let extraAuthorCharge = 0;

// ==============================
// INDIAN
// ==============================

if (isIndian) {

  baseAmount = 7500;

  if (totalAuthors > 4) {

    extraAuthors =
      totalAuthors - 4;

    extraAuthorCharge =
      extraAuthors * 3000;

  }

}

// ==============================
// NON-INDIAN
// ==============================

else {

  baseAmount = 150;

  if (totalAuthors > 4) {

    extraAuthors =
      totalAuthors - 4;

    extraAuthorCharge =
      extraAuthors * 50;

  }

}

// ==============================
// SUBTOTAL
// ==============================

const subtotal =
  baseAmount +
  extraAuthorCharge;

// ==============================
// GST
// ==============================

// CGST
const cgstAmount =
  (subtotal * 9) / 100;

// SGST
const sgstAmount =
  (subtotal * 9) / 100;

// FINAL AMOUNT
const finalAmount =
  subtotal +
  cgstAmount +
  sgstAmount;
  await Payment.create({

    applicationId:
      paper.applicationId,

    title:
      paper.title,

  author: paper.authors || [],

correspondingAuthor:
  paper.correspondingAuthor || {},

    amount: finalAmount,
   

authorCount:
  totalAuthors,

countryType:
  countryType,

baseAmount:
  baseAmount,

extraAuthors:
  extraAuthors,

extraAuthorCharge:
  extraAuthorCharge,

subtotal:
  subtotal,

cgstAmount:
  cgstAmount,

sgstAmount:
  sgstAmount,

finalAmount:
  finalAmount,

    status: "Pending",

  });

}

    // ==============================
    // SEND APPROVAL EMAIL
    // ==============================

    try {

const { recipientEmail, recipientName } =
  getRecipientDetails(paper);

if (recipientEmail) {
  await tranEmailApi.sendTransacEmail({

    sender: {
      email: "editor@pjmtr.in",
      name: "PACIFIC JOURNAL OF MODERN THEORIES AND RESEARCH",
    },

    to: [
      {
        email: recipientEmail,
        name: recipientName,
      },
    ],

    templateId: 5,

    params: {
      author_name: recipientName,
      title: paper.title,
      applicationId: paper.applicationId,
    },

  });

  console.log(
    "Approval email sent successfully"
  );

}

    } catch (mailError) {

      console.log(
        "Brevo approval mail error:",
        mailError
      );

    }

    res.json({

      message:
        "Paper approved successfully",

      paper,

    });

  } catch (error) {

    res.status(500).json({

      message:
        "Approval failed",

      error:
        error.message,

    });

  }

};
exports.rejectPaper = async (req, res) => {

  try {

    const { rejectionReason } = req.body;

    const paper =
      await Paper.findByIdAndUpdate(
        req.params.id,
        {
          status: "Rejected",
          rejectionReason,
          rejectedAt: new Date(),
        },
        { new: true }
      );

    if (!paper) {
      return res.status(404).json({
        message: "Paper not found",
      });
    }

    // SEND REJECTION EMAIL
    try {

      const {
        recipientEmail,
        recipientName,
      } = getRecipientDetails(paper);

      if (recipientEmail) {

        await tranEmailApi.sendTransacEmail({

          sender: {
            email: "editor@pjmtr.in",
            name: "PACIFIC JOURNAL OF MODERN THEORIES AND RESEARCH",
          },

          to: [
            {
              email: recipientEmail,
              name: recipientName,
            },
          ],

          templateId: 3,

          params: {
            author_name: recipientName,
            title: paper.title,
            applicationId: paper.applicationId,

            submissionDate:
              paper.createdAt
                ? new Date(paper.createdAt).toLocaleDateString("en-GB")
                : "—",

            decisionDate:
              new Date().toLocaleDateString("en-GB"),

            reason: rejectionReason,
          },

        });

        console.log(
          "Rejection email sent successfully"
        );

      }

    } catch (mailError) {

      console.log(
        "Brevo rejection mail error:",
        mailError
      );

    }

    res.json({
      message: "Paper rejected successfully",
      paper,
    });

  } catch (error) {

    res.status(500).json({
      message: "Rejection failed",
      error: error.message,
    });

  }

};
exports.sendToRevision = async (req, res) => {
  try {
    const {
      revisionReason,
      revisionDeadline,
    } = req.body;

    const paper = await Paper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({
        message: "Paper not found",
      });
    }

    // New revision entry
    const revisionNumber =
      (paper.revisionHistory?.length || 0) + 1;

    const newRevision = {
      revisionNumber,
      revisionReason: revisionReason || "",
      revisionDeadline: revisionDeadline || null,
      status: "Revision Required",
    };

     // Admin attachment
if (req.file) {
  newRevision.adminAttachment = {
    fileName: req.file.originalname,
    fileUrl: req.file.path.replace(/\\/g, "/"),
  };
}

    // Save revision history
    if (!Array.isArray(paper.revisionHistory)) {
      paper.revisionHistory = [];
    }
    paper.revisionHistory.push(newRevision);

    // Update paper status
    paper.status = "Revision";
    paper.authorStatus = "Revision";
    
    paper.adminRemark = revisionReason || "";
    paper.revisionAt = new Date();

    await paper.save();

    // ==========================
    // SEND REVISION EMAIL
    // ==========================

    try {
      const {
        recipientEmail,
        recipientName,
      } = getRecipientDetails(paper);

      if (recipientEmail) {
        let attachments = [];

        console.log("========== REVISION MAIL DEBUG ==========");
        console.log("Paper ID:", paper._id);
        console.log("Application ID:", paper.applicationId);
        console.log("Recipient Email:", recipientEmail);
        console.log("Recipient Name:", recipientName);
        console.log("Revision Reason:", revisionReason);
        console.log("Revision Deadline:", revisionDeadline);
        console.log("========================================");

        if (req.file && req.file.path) {
          try {
            const fileContent = fs.readFileSync(req.file.path);

            attachments.push({
              name: req.file.originalname,
              content: fileContent.toString("base64"),
            });
          } catch (err) {
            console.log("Attachment read error:", err);
          }
        }

        const emailData = {
          sender: {
            email: "editor@pjmtr.in",
            name: "PACIFIC JOURNAL OF MODERN THEORIES AND RESEARCH",
          },

          to: [
            {
              email: recipientEmail,
              name: recipientName,
            },
          ],

          templateId: 4,

          params: {
            author_name: recipientName,
            title: paper.title,
            applicationId: paper.applicationId,
            revision_reason: revisionReason,
            revision_deadline: revisionDeadline,
          },
        };

        if (attachments.length > 0) {
          emailData.attachment = attachments;
        }

        await tranEmailApi.sendTransacEmail(emailData);

        console.log("✅ REVISION EMAIL SUCCESSFULLY SENT");
      }
    } catch (mailError) {
      console.log("❌ BREVO REVISION ERROR:");
      console.log(JSON.stringify(mailError, null, 2));
    }

    res.json({
      message: "Paper sent to revision successfully",
      paper,
    });
  } catch (error) {
    console.log("Revision failed:", error);

    res.status(500).json({
      message: "Revision failed",
      error: error.message,
    });
  }
};
exports.deletePaper = async (req, res) => {

  try {

    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!paper) {

      return res.status(404).json({
        message: "Paper not found",
      });

    }

    res.json({
      message: "Paper moved to trash",
      paper,
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to delete paper",
      error: error.message,
    });

  }
};
exports.getTrashPapers = async (req, res) => {
  try {
    const papers = await Paper.find({ isDeleted: true })
      .select(
        "-file.data -coverLetter.data -supplementaryFile.data"
      )
      .sort({ deletedAt: -1 })
      .lean();

    res.json(papers);
  } catch (error) {
    console.error("Trash fetch error:", error);

    res.status(500).json({
      message: "Failed to fetch trash papers",
    });
  }
};

exports.restorePaper = async (req, res) => {

  try {

    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: false,
        deletedAt: null,
      },
      { new: true }
    );

    if (!paper) {

      return res.status(404).json({
        message: "Paper not found",
      });

    }

    res.json({
      message: "Paper restored successfully",
      paper,
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to restore paper",
      error: error.message,
    });

  }
};
exports.permanentDeletePaper = async (
  req,
  res
) => {

  try {

    const paper =
      await Paper.findByIdAndDelete(
        req.params.id
      );

    if (!paper) {

      return res.status(404).json({
        message: "Paper not found",
      });

    }

    res.json({
      message:
        "Paper permanently deleted",
    });

  } catch (error) {

    res.status(500).json({
      message:
        "Failed to permanently delete paper",
      error: error.message,
    });

  }

};

exports.bulkPermanentDelete = async (
  req,
  res
) => {

  try {

    const { ids } = req.body;

    if (
      !ids ||
      !Array.isArray(ids)
    ) {

      return res.status(400).json({
        message: "Invalid IDs",
      });

    }

    await Paper.deleteMany({
      _id: { $in: ids },
    });

    res.json({
      message:
        "Selected papers permanently deleted",
    });

  } catch (error) {

    res.status(500).json({
      message:
        "Bulk delete failed",
      error: error.message,
    });

  }

};

exports.markPaperAsRead = async (
  req,
  res
) => {

  try {

    const paper =
      await Paper.findById(
        req.params.id
      );

    if (!paper) {

      return res.status(404).json({
        message: "Paper not found",
      });

    }

    paper.isRead = true;

    await paper.save();

    res.json({
      success: true,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });

  }

};
 // ==============================
// Assign reviewer 
// ==============================
exports.assignReviewer = async (req, res) => {
  try {

    const { reviewerId } = req.body;

    const paper = await Paper.findById(
      req.params.paperId
    );

    if (!paper) {
      return res.status(404).json({
        message: "Paper not found",
      });
    }

    const reviewer =
      await Reviewer.findById(reviewerId);

   
    
    // ==============================
// REVIEW FORM ATTACHMENT
// ==============================

const reviewFormPath = path.join(
  __dirname,
  "../uploads/review-forms/PJMTR_Peer_Review_Form.docx"
);

let attachments = [];
    // ==============================
// MANUSCRIPT ATTACHMENT
// ==============================

if (paper.file?.data) {

  attachments.push({

    name:
      paper.file.filename ||
      "Manuscript",

    content:
      paper.file.data.toString(
        "base64"
      ),

  });

}
    

if (fs.existsSync(reviewFormPath)) {
  

  const reviewFormContent =
    fs.readFileSync(reviewFormPath);

  attachments.push({
    name: "PJMTR_Peer_Review_Form.docx",
    content:
      reviewFormContent.toString("base64"),
  });

}

    if (!reviewer) {
      return res.status(404).json({
        message: "Reviewer not found",
      });
    }

    if (!paper.assignedReviewers) {
  paper.assignedReviewers = [];
}

// Duplicate reviewer check
const alreadyAssigned =
  paper.assignedReviewers.find(
    (r) =>
      r.reviewerId?.toString() ===
      reviewer._id.toString()
  );

if (alreadyAssigned) {
  return res.status(400).json({
    message:
      "Reviewer already assigned",
  });
}

paper.assignedReviewers.push({
  reviewerId: reviewer._id,
  reviewerName: reviewer.name,
  reviewerEmail:
    reviewer.officialEmail || reviewer.email,
  assignedAt: new Date(),
});

    await paper.save();
 try {

  await tranEmailApi.sendTransacEmail({

    sender: {
      email: "editor@pjmtr.in",
      name:
        "PACIFIC JOURNAL OF MODERN THEORIES AND RESEARCH",
    },

    to: [
      {
        email: reviewer.officialEmail,
        name: reviewer.name,
      },
    ],

    templateId: 7,

    attachment: attachments,

    params: {
      reviewer_name:
        reviewer.name,
    },

  });

  console.log(
    "Reviewer email sent successfully"
  );

} catch (mailError) {

  console.log(
    "Reviewer mail error:",
    mailError
  );

}

    res.json({
      success: true,
      message:
        "Reviewer assigned successfully",
      paper,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Assignment failed",
      error: error.message,
    });

  } 
};

 //remark 
exports.saveRemark = async (req, res) => {

  try {

    const paper = await Paper.findById(
      req.params.id
    );

    if (!paper) {

      return res.status(404).json({
        message: "Paper not found",
      });

    }

    paper.adminRemark =
      req.body.adminRemark || "";

    await paper.save();

    res.status(200).json({
      success: true,
      message: "Remark saved successfully",
      adminRemark: paper.adminRemark,
    });

  } catch (error) {

    console.error(
      "Save Remark Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to save remark",
    });

  }

};
exports.getApprovedPapers = async (req, res) => {
  try {

    const papers = await Paper.find({
      status: "Approved"
    })
    .select(`
      applicationId
      title
      abstract
      keywords
      authors
      correspondingAuthor
      country
      researchArea
      createdAt
      revisionAt
      approvedAt
      publishedAt
    `)
    .sort({ approvedAt: -1 });

    res.json(papers);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch approved papers",
      error: error.message,
    });

  }
};
exports.getAllPayments = async (req, res) => {

  try {

    const payments = await Payment.find()
      .sort({ createdAt: -1 });

    res.json(payments);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch payments",
      error: error.message,
    });

  }

};

 // ==============================
// Wave off function
// ==============================

exports.updateWaveOff = async (req, res) => {

  try {

    const { paymentId } = req.params;

    const { waveOffAmount } = req.body;

    const payment =
      await Payment.findById(paymentId);

    if (!payment) {

      return res.status(404).json({
        message: "Payment not found",
      });

    }

  const waive =
  Number(waveOffAmount) || 0;

payment.waveOffAmount = waive;

const taxableAmount =
  Math.max(
    payment.subtotal - waive,
    0
  );

payment.cgstAmount =
  (taxableAmount * 9) / 100;

payment.sgstAmount =
  (taxableAmount * 9) / 100;

payment.finalAmount =
  taxableAmount +
  payment.cgstAmount +
  payment.sgstAmount;

await payment.save();

let recipientEmail = "";
let recipientName = "";

if (
  payment?.correspondingAuthor?.email
) {

  recipientEmail =
    payment.correspondingAuthor.email;

  recipientName =
    `${payment.correspondingAuthor.firstName || ""} ${
      payment.correspondingAuthor.lastName || ""
    }`.trim();

} else if (
  payment?.author?.length > 0 &&
  payment.author[0].email
) {

  recipientEmail =
    payment.author[0].email;

  recipientName =
    `${payment.author[0].firstName || ""} ${
      payment.author[0].lastName || ""
    }`.trim();

}

if (recipientEmail) {

  try {

    await tranEmailApi.sendTransacEmail({

      sender: {
        email: "editor@pjmtr.in",
        name:
          "PACIFIC JOURNAL OF MODERN THEORIES AND RESEARCH",
      },

      to: [
        {
          email: recipientEmail,
          name: recipientName,
        },
      ],

      templateId: 8,

      params: {
        author_name: recipientName,
        paper_title: payment.title,
        paper_id: payment.applicationId,
      },

    });

    console.log(
      "Wave off email sent successfully"
    );

  } catch (mailError) {

    console.log(
      "Wave off mail error:",
      mailError
    );

  }

}

res.json({
  success: true,
  payment,
});

  } catch (error) {

    res.status(500).json({
      message: "Wave off update failed",
      error: error.message,
    });

  }

};
exports.uploadPaperFiles = async (
  req,
  res
) => {

  try {

    const paper =
      await Paper.findById(
        req.params.paperId
      );

    if (!paper) {

      return res.status(404).json({
        message: "Paper not found",
      });

    }

    if (!paper.adminFiles) {
      paper.adminFiles = [];
    }

    const existingFiles =
      paper.adminFiles.length;

    const newFiles =
      req.files || [];

    if (
      existingFiles +
        newFiles.length >
      5
    ) {

      return res.status(400).json({
        message:
          "Maximum 5 files allowed",
      });

    }

    newFiles.forEach((file) => {

      paper.adminFiles.push({

        fileName:
          file.originalname,

        fileUrl:
          `/uploads/admin-files/${file.filename}`,

      });

    });

    await paper.save();

    res.json({
      success: true,
      files: paper.adminFiles,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "File upload failed",
    });

  }

};
exports.deletePaperFile = async (
  req,
  res
) => {

  try {

    const {
      paperId,
      fileId,
    } = req.params;

    const paper =
      await Paper.findById(
        paperId
      );

    if (!paper) {

      return res.status(404).json({
        message: "Paper not found",
      });

    }

    const file =
      paper.adminFiles.id(
        fileId
      );

    if (!file) {

      return res.status(404).json({
        message: "File not found",
      });

    }

    const filePath =
      path.join(
        __dirname,
        "..",
        file.fileUrl
      );

    if (
      fs.existsSync(filePath)
    ) {

      fs.unlinkSync(
        filePath
      );

    }

    paper.adminFiles.pull(
      fileId
    );

    await paper.save();

    res.json({
      success: true,
      message:
        "File deleted successfully",
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "File delete failed",
    });

  }

};
exports.downloadRevisionFileAdmin = async (req, res) => {
  try {
    const { paperId, revisionNumber } = req.params;

    const paper = await Paper.findById(paperId);

    if (!paper) {
      return res.status(404).json({
        message: "Paper not found",
      });
    }

    const revision = paper.revisionHistory?.find(
      (rev) =>
        Number(rev.revisionNumber) === Number(revisionNumber)
    );

    if (!revision || !revision.revisedFile?.data) {
      return res.status(404).json({
        message: "Revised file not found",
      });
    }
    // Mark revised file as downloaded by admin
    revision.revisedFile.adminDownloaded = true;
    await paper.save();

    res.set({
      "Content-Type":
        revision.revisedFile.contentType ||
        "application/octet-stream",

      "Content-Disposition": `attachment; filename="${revision.revisedFile.filename}"`,
    });

    res.send(revision.revisedFile.data);
  } catch (error) {
    console.error("Admin revision download error:", error);

    res.status(500).json({
      message: "File download failed",
    });
  }
};
