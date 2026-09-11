const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema({
  title: { type: String, required: true },
  abstract: String,
  keywords: String,
  authors: [{ name: String }],
  publishedOn: { type: String },
  publishedIn: { type: String },
  country: { type: String },

  researchArea: {
    type: String,
    trim: true
  },

  language: {
    type: String,
    trim: true
  },

  affiliationAddress: {
    type: String,
    trim: true
  },

  correspondingEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  timestampHistory: {
  type: String,
  trim: true
},
  doi: {
  type: String,
  trim: true
},
  doi: {
  type: String,
  trim: true
},

sourcePaperId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Paper",
  default: null
},

ojsSubmissionId: {
  type: Number,
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
  ojsGalleyId: {
  type: Number,
  default: null
},

ojsGalleyFileId: {
  type: Number,
  default: null
},

ojsGalleySyncStatus: {
  type: String,
  enum: ["pending", "synced", "failed"],
  default: "pending"
},

ojsGalleySyncError: {
  type: String,
  default: ""
},

ojsSyncStatus: {
  type: String,
  enum: ["pending", "synced", "failed"],
  default: "pending"
},

ojsSyncError: {
  type: String,
  default: ""
},

ojsSyncedAt: {
  type: Date,
  default: null
},
views: {
  type: Number,
  default: 0
},
downloads: {
  type: Number,
  default: 0
},

pdf: { type: Buffer }
}); // ✅ correct now

const issueSchema = new mongoose.Schema({
  issueNumber: { type: Number, required: true },
  month: String,
  year: Number,

  ojsIssueId: {
    type: Number,
    default: null
  },

  papers: [paperSchema]
});

const volumeSchema = new mongoose.Schema({
  volumeNumber: { type: Number, required: true, unique: true },
  issues: [issueSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Volume", volumeSchema);
