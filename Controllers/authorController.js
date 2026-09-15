const Author = require('../Models/Author');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const registerAuthor = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingAuthor = await Author.findOne({
      email: normalizedEmail
    });

    if (existingAuthor?.isEmailVerified) {
      return res.status(400).json({
        message: 'An account with this email already exists'
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    const hashedPassword = await bcrypt.hash(password, 10);

    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (existingAuthor) {
      existingAuthor.name = name.trim();
      existingAuthor.password = hashedPassword;
      existingAuthor.emailOTP = otp;
      existingAuthor.emailOTPExpires = otpExpires;
      await existingAuthor.save();
    } else {
      await Author.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        isEmailVerified: false,
        emailOTP: otp,
        emailOTPExpires: otpExpires
      });
    }

    // TEMP: OTP will be connected to email service in the next step
    console.log(`Author OTP for ${normalizedEmail}: ${otp}`);

    res.status(200).json({
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('Author Register Error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
};

module.exports = {
  registerAuthor
};
