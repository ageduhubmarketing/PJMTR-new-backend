const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({

  authorId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Author",
  required: true,
  index: true,
},
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Paper",
    required: true,
  },

  applicationId: {
    type: String,
    required: true,
  },

  paperTitle: {
    type: String,
    required: true,
  },

  authorName: {
    type: String,
    required: true,
  },

  certificateLink: {
    type: String,
    required: true,
  },

  doi: {
    type: String,
    default: "",
  },
certificateFile: {
  filename: {
    type: String,
  },
  contentType: {
    type: String,
  },
  data: {
    type: Buffer,
  },
},
  createdAt: {
    type: Date,
    default: Date.now,
  },

});

module.exports =
  mongoose.models.Certificate ||
  mongoose.model(
    "Certificate",
    certificateSchema
  );
