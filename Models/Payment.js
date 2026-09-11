const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

   author: {
  type: Object,
  required: true,
},

    correspondingAuthor: {
  type: Object,
  required: true,
},

    amount: {
      type: Number,
      default: 2500,
    },

    status: {
      type: String,
      default: "Pending",
    },

    paymentId: {
      type: String,
      default: "",
    },
    paymentDate: {
      type: Date,
      default: null,
    },

    invoice: {
  type: String,
  default: "",
},

authorCount: {
  type: Number,
  default: 0,
},

countryType: {
  type: String,
  default: "",
},

baseAmount: {
  type: Number,
  default: 0,
},


cgstAmount: {
  type: Number,
  default: 0,
},

sgstAmount: {
  type: Number,
  default: 0,
},

finalAmount: {
  type: Number,
  default: 0,
},
    extraAuthors: {
  type: Number,
  default: 0,
},

extraAuthorCharge: {
  type: Number,
  default: 0,
},

subtotal: {
  type: Number,
  default: 0,
},
    waveOffAmount: {
  type: Number,
  default: 0,
},
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Payment",
  paymentSchema
);
