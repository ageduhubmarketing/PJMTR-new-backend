const express = require("express");

const router = express.Router();

const {
  subscribeUser,
  getSubscribers,
} = require("../Controllers/subscriberController");

// Subscribe
router.post("/", subscribeUser);

// Get all subscribers
router.get("/", getSubscribers);

module.exports = router;
