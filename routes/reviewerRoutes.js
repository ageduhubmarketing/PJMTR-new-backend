const express = require("express");

const router = express.Router();

const Reviewer = require("../Models/reviewerModel");


// ADD REVIEWER
router.post("/", async (req, res) => {

  try {

    const reviewer = new Reviewer(req.body);

    await reviewer.save();

    res.status(201).json(reviewer);

  } catch (error) {

    res.status(500).json({
      message: "Failed to add reviewer",
    });

  }

});


// GET ALL REVIEWERS
router.get("/", async (req, res) => {

  try {

    const reviewers = await Reviewer.find()
      .sort({ createdAt: -1 });

    res.json(reviewers);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch reviewers",
    });

  }

});
// DELETE REVIEWER
router.delete("/:id", async (req, res) => {

  try {

    await Reviewer.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message:
        "Reviewer deleted successfully",
    });

  } catch (error) {

    res.status(500).json({
      message:
        "Failed to delete reviewer",
    });

  }

});

module.exports = router;
