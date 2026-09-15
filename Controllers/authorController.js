const Author = require('../Models/Author');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];

apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

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

    // Send OTP Email
try {
  await tranEmailApi.sendTransacEmail({
    sender: {
      email: 'editor@pjmtr.in',
      name: 'PACIFIC JOURNAL OF MODERN THEORIES AND RESEARCH'
    },

    to: [
      {
        email: normalizedEmail,
        name: name.trim()
      }
    ],

    templateId: 9,

    params: {
      author_name: name.trim(),
      otp: otp
    }
  });

  console.log(`Author OTP email sent to ${normalizedEmail}`);

} catch (mailError) {
  console.error('Brevo Author OTP Mail Error:', mailError);

  return res.status(500).json({
    message: 'Account created, but OTP email could not be sent. Please try registration again.'
  });
}

res.status(200).json({
  message: 'OTP sent successfully to your email'
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

    const token = jwt.sign(
      {
        id: author._id,
        role: 'author'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
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
// Get Author Profile
const getAuthorProfile = async (req, res) => {
  try {
    const author = await Author.findById(req.author.id).select('-password -emailOTP -emailOTPExpires');

    if (!author) {
      return res.status(404).json({
        message: 'Author not found'
      });
    }

    res.status(200).json({
      author
    });
  } catch (error) {
    console.error('Get Author Profile Error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
};
// Update Author Profile
const updateAuthorProfile = async (req, res) => {
  try {
    const {
      mobile,
      designation,
      department,
      institution,
      qualification,
      researchInterest,
      orcidId,
      address,
      city,
      state,
      country,
      postalCode
    } = req.body;

    const author = await Author.findById(req.author.id);

    if (!author) {
      return res.status(404).json({
        message: 'Author not found'
      });
    }

    author.mobile = mobile ?? author.mobile;
    author.designation = designation ?? author.designation;
    author.department = department ?? author.department;
    author.institution = institution ?? author.institution;
    author.qualification = qualification ?? author.qualification;
    author.researchInterest = researchInterest ?? author.researchInterest;
    author.orcidId = orcidId ?? author.orcidId;
    author.address = address ?? author.address;
    author.city = city ?? author.city;
    author.state = state ?? author.state;
    author.country = country ?? author.country;
    author.postalCode = postalCode ?? author.postalCode;

    await author.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      author: {
        id: author._id,
        name: author.name,
        email: author.email,
        mobile: author.mobile,
        designation: author.designation,
        department: author.department,
        institution: author.institution,
        qualification: author.qualification,
        researchInterest: author.researchInterest,
        orcidId: author.orcidId,
        address: author.address,
        city: author.city,
        state: author.state,
        country: author.country,
        postalCode: author.postalCode
      }
    });
  } catch (error) {
    console.error('Update Author Profile Error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
};

module.exports = {
  registerAuthor,verifyAuthorOTP,loginAuthor,getAuthorProfile,updateAuthorProfile
};
