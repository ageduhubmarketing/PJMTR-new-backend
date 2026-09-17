const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const Payment = require("../Models/Payment");
const Paper = require("../Models/Paper");
const generateInvoice = require("../utils/generateInvoice");

// createOrder
exports.createOrder = async (req, res) => {
  try {
    const { amount, countryType } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount"
      });
    }

    const currency = countryType === "Indian" ? "INR" : "USD";

    const options = {
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json(order);

  } catch (error) {
    console.error("Create Order Error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create order"
    });
  }
};
//payment api
exports.verifyPayment = async (req, res) => {
  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      applicationId
    } = req.body;

    const body =
      razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(body.toString())
        .digest("hex");

    if (
      expectedSignature !== razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

   const updatedPayment =
  await Payment.findOneAndUpdate(
    { applicationId },
    {
      status: "Paid",
      paymentId: razorpay_payment_id,
      paymentDate: new Date()
    },
    { new: true }
  );

const invoice =
  await generateInvoice(
    updatedPayment
  );
console.log("INVOICE RESULT:", invoice);
updatedPayment.invoice =
  invoice.fileName;

await updatedPayment.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully"
    });

  } catch (error) {

    console.error(
      "Verify Payment Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });

  }
};
// Get Logged-in Author Payments
exports.getAuthorPayments = async (req, res) => {
  try {
    console.log("========== AUTHOR PAYMENT DEBUG ==========");

    console.log("Logged-in Author ID:", req.author.id);

    const papers = await Paper.find({
      authorId: req.author.id,
    }).select("applicationId title authorId");

    console.log("Author Papers:", papers);

    const applicationIds = papers.map(
      (paper) => paper.applicationId
    );

    console.log("Application IDs:", applicationIds);

    const payments = await Payment.find({
      applicationId: { $in: applicationIds },
    }).sort({ createdAt: -1 });

    console.log("Payments Found:", payments);
    console.log("Total Payments:", payments.length);

    console.log("========== DEBUG END ==========");

    res.status(200).json({
      success: true,
      payments,
    });

  } catch (error) {
    console.error("Get Author Payments Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch author payments",
    });
  }
};
