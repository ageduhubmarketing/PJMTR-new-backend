const mongoose = require("mongoose");

const reviewerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    designation: {
      type: String,
      required: true,
    },

    department: {
      type: String,
      required: true,
    },

    officialEmail: {
      type: String,
      required: true,
    },

    university: {
      type: String,
      required: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    experience: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Reviewer",
  reviewerSchema
);
