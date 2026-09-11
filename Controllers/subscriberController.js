const Subscriber = require("../Models/Subscriber");

// Subscribe User
exports.subscribeUser = async (req, res) => {
  try {

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    // Check existing email
    const existing = await Subscriber.findOne({ email });

    if (existing) {
      return res.status(400).json({
        message: "Email already subscribed",
      });
    }

    // Save
    const subscriber = await Subscriber.create({
      email,
    });

    res.status(201).json({
      success: true,
      subscriber,
    });

  } catch (err) {

    res.status(500).json({
      message: "Subscription failed",
      error: err.message,
    });

  }
};

// Get All Subscribers
exports.getSubscribers = async (req, res) => {
  try {

    const subscribers = await Subscriber.find()
      .sort({ createdAt: -1 });

    res.json(subscribers);

  } catch (err) {

    res.status(500).json({
      message: "Failed to fetch subscribers",
      error: err.message,
    });

  }
};
