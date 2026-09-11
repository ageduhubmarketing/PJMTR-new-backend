const express = require("express");
const router = express.Router();
const TopBar = require("../Models/TopBar");

// Get current top bar message
router.get("/", async (req, res) => {
  const message = await TopBar.findOne().sort({ updatedAt: -1 });
  res.json(message);
});

// Update top bar message
router.post("/", async (req, res) => {
  const { message } = req.body;
  const newMsg = await TopBar.findOneAndUpdate({}, { message }, { new: true, upsert: true });
  res.json(newMsg);
});

module.exports = router;
