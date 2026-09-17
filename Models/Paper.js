// backend/Models/Paper.js
const mongoose = require("mongoose");

// ==============================
// Sub-schemas
// ==============================

// Author sub-schema
const authorSchema = new mongoose.Schema({
  salutation: String,
  firstName: String,
  middleName: String,
  lastName: String,
  designation: String,
  department: String,
  organization: String,
  email: String,
  mobile: String,
  country: String,
  address: String,
  orcid: String,
});

// Reviewer sub-schema
const reviewerSchema = new mongoose.Schema({
  name: String,
  email: String,
  institution: String,
});

// File sub-schema
const fileSchema = new mongoose.Schema({
  filename: String,
  contentType: String,
  data: Buffer,
});

// ==============================
// Main Paper Schema
// ==============================
const paperSchema = new mongoose.Schema({
  // Basic details
    manuscriptType: { type: String, required: true }, 
  title: { type: String, required: true },
  abstract: { type: String, required: true },
  keywords: { type: String, required: true },
  researchArea: { type: String, required: true },

  // Authors array
  authors: [authorSchema],
  correspondingAuthor: authorSchema,
  
// Author Ownership
authorId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Author",
  default: null,
},
  
  // Contact info
  country: String,
  state: String,
  city: String,
  postalCode: String,
  address: String,
  message: String,

  // Questionnaire / Declarations
  ethicalApproval: { type: String },
  ethicalApprovalNumber: { type: String },
  conflictOfInterest: { type: String },
  conflictDetails: { type: String },
  fundingSupport: { type: String },
  fundingAmount: { type: String },
  fundingInstitution: { type: String },

 // Reviewers
reviewers: [reviewerSchema],
nonPreferredReviewer: { type: String },
assignedReviewers: [
  {
    reviewerId: String,
    reviewerName: String,
    reviewerEmail: String,
    assignedAt: Date,
  }
],

  // Agreement
agreement: { type: Boolean, default: false },

// Declarations
generativeAIUsageDeclaration: {
  type: Boolean,
  default: false,
},

apcPaymentDeclaration: {
  type: Boolean,
  default: false,
},

  // Uploaded files
  file: fileSchema,
  coverLetter: fileSchema,
  supplementaryFile: fileSchema,
  // Publication Links
paperLink: { type: String },   // PDF / paper URL
doi: { type: String },         // DOI link
  sourcePaperId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Paper",
  default: null
},
ojsSubmissionId: {
  type: Number,
  default: null
},

ojsPublicationId: {
  type: Number,
  default: null
},
  ojsFileId: {
  type: Number,
  default: null
},
  ojsContributorsSynced: {
  type: Boolean,
  default: false
},
  ojsSyncStatus: {
  type: String,
  enum: ["pending", "synced", "failed"],
  default: "pending"
},

ojsSyncedAt: {
  type: Date,
  default: null
},

ojsSyncError: {
  type: String,
  default: ""
},
  ojsPublishStatus: {
  type: String,
  enum: ["pending", "publishing", "published", "failed"],
  default: "pending"
},
ojsPublishingStartedAt: {
  type: Date,
  default: null
},


ojsPublishedAt: {
  type: Date,
  default: null
},

ojsPublishError: {
  type: String,
  default: ""
},
  ojsDoiSyncStatus: {
  type: String,
  enum: ["pending", "synced", "failed"],
  default: "pending"
},

ojsDoiSyncedAt: {
  type: Date,
  default: null
},

ojsDoiSyncError: {
  type: String,
  default: ""
},
  adminFiles: [ { fileName: String, fileUrl: String, uploadedAt: { type: Date, default: Date.now,
    },
  },
],
  // Application ID (auto-generated)
  applicationId: {
    type: String,
    default: () => {
      const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit number
      return `PJMTR${randomDigits}`;
    },
    unique: true,
  },

  // Status tracking
status: {
  type: String,
  enum: [
    "Under Reviewing",
    "Approved",
    "Rejected",
    "Revision",
    "Published"
  ],
  default: "Under Reviewing",
}, 
  // Author Status Tracking
authorStatus: {
  type: String,
  enum: [
    "Under Reviewing",
    "Approved",
    "Rejected",
    "Revision",
    "Published"
  ],
  default: "Under Reviewing",
},
  adminRemark: {
  type: String,
  default: "",
},
  // 👈 THIS COMMA IS VERY IMPORTANT
isRead: {
  type: Boolean,
  default: false,
},
  rejectionReason: {
  type: String,
  default: "",
},

rejectedAt: {
  type: Date,
  default: null,
},
  approvedAt: {
  type: Date,
  default: null,
},

revisionAt: {
  type: Date,
  default: null,
},

publishedAt: {
  type: Date,
  default: null,
},
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  isDeleted: {
  type: Boolean,
  default: false,
},

deletedAt: {
  type: Date,
  default: null,
},

// Revision History
revisionHistory: [
  {
    revisionNumber: {
      type: Number,
      default: 1,
    },

    revisionReason: {
      type: String,
      default: "",
    },

    revisionDeadline: {
      type: Date,
      default: null,
    },

    adminAttachment: {
      fileName: {
        type: String,
        default: "",
      },
      fileUrl: {
        type: String,
        default: "",
      },
    },

    revisedFile: {
      filename: {
        type: String,
        default: "",
      },
      contentType: {
        type: String,
        default: "",
      },
      data: {
        type: Buffer,
        default: null,
      },
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Revision Required",
        "Submitted",
        "Approved",
        "Revision Again",
        "Rejected",
      ],
      default: "Revision Required",
    },
  },
],

});


// ==============================
// Export model
// ==============================
module.exports = mongoose.models.Paper || mongoose.model("Paper", paperSchema);
