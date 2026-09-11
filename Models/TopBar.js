const mongoose = require("mongoose");

const topBarSchema = new mongoose.Schema({
  message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("TopBar", topBarSchema);
