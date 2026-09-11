const mongoose = require("mongoose");

const trendingPaperSchema = new mongoose.Schema(
  {
    papers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Paper",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "TrendingPaper",
  trendingPaperSchema
);
