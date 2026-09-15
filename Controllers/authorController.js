const Author = require('../Models/Author');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Register Author
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
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (existingAuthor) {
      existingAuthor.name = name.trim();
      existingAuthor.password = password;
      existingAuthor.emailOTP = otp;
      existingAuthor.emailOTPExpires = otpExpires;

      await existingAuthor.save();
    } else {
      await Author.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        isEmailVerified: false,
        emailOTP: otp,
        emailOTPExpires: otpExpires
      });
    }

    console.log(`Author OTP for ${normalizedEmail}: ${otp}`);

    res.status(200).json({
      message: 'OTP generated successfully'
    });
  } catch (error) {
    console.error('Author Register Error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
};

// Verify Author OTP
const verifyAuthorOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: 'Email and OTP are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const author = await Author.findOne({
      email: normalizedEmail
    });

    if (!author) {
      return res.status(404).json({
        message: 'Author account not found'
      });
    }

    if (author.isEmailVerified) {
      return res.status(400).json({
        message: 'Email is already verified'
      });
    }

    if (!author.emailOTP || !author.emailOTPExpires) {
      return res.status(400).json({
        message: 'OTP not found. Please register again'
      });
    }

    if (new Date() > author.emailOTPExpires) {
      return res.status(400).json({
        message: 'OTP has expired. Please register again'
      });
    }

    if (author.emailOTP !== otp.toString().trim()) {
      return res.status(400).json({
        message: 'Invalid OTP'
      });
    }

    author.isEmailVerified = true;
    author.emailOTP = null;
    author.emailOTPExpires = null;

    await author.save();

    res.status(200).json({
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Author OTP Verification Error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
};

// Login Author
const loginAuthor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const author = await Author.findOne({
      email: normalizedEmail
    });

    if (!author) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    if (!author.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before login'
      });
    }

    const isMatch = await bcrypt.compare(password, author.password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    res.status(200).json({
      message: 'Login successful',
      author: {
        id: author._id,
        name: author.name,
        email: author.email
      }
    });
  } catch (error) {
    console.error('Author Login Error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
};

module.exports = {
  registerAuthor,
  verifyAuthorOTP,
  loginAuthor
};
