const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const authorSchema = new mongoose.Schema(
  {
    // Registration Details
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    // Email OTP Verification
    isEmailVerified: {
      type: Boolean,
      default: false
    },

    emailOTP: {
      type: String,
      default: null
    },

    emailOTPExpires: {
      type: Date,
      default: null
    },
    // Profile Image
        profileImage: {
          data: Buffer,
          contentType: String
        },

    // Profile Details
    mobile: {
      type: String,
      trim: true,
      default: ''
    },

    designation: {
      type: String,
      trim: true,
      default: ''
    },

    department: {
      type: String,
      trim: true,
      default: ''
    },

    institution: {
      type: String,
      trim: true,
      default: ''
    },

    qualification: {
      type: String,
      trim: true,
      default: ''
    },

    researchInterest: {
      type: String,
      trim: true,
      default: ''
    },

    orcidId: {
      type: String,
      trim: true,
      default: ''
    },

    address: {
      type: String,
      trim: true,
      default: ''
    },

    city: {
      type: String,
      trim: true,
      default: ''
    },

    state: {
      type: String,
      trim: true,
      default: ''
    },

    country: {
      type: String,
      trim: true,
      default: ''
    },

    postalCode: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Password Hash
authorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('Author', authorSchema);
