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

    // Validate registration fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing author
    const existingAuthor = await Author.findOne({
      email: normalizedEmail
    });

    // Check verified account
    if (existingAuthor?.isEmailVerified) {
      return res.status(400).json({
        message: 'An account with this email already exists'
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Set OTP expiry
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Update existing unverified author
    if (existingAuthor) {
      existingAuthor.name = name.trim();
      existingAuthor.password = password;
      existingAuthor.emailOTP = otp;
      existingAuthor.emailOTPExpires = otpExpires;
      existingAuthor.isEmailVerified = false;

      await existingAuthor.save();
    } else {
      // Create new author
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

        subject: 'PJMTR Author Email Verification',

        htmlContent: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            color: #333;
          ">

            <h2 style="
              color: #07163A;
              margin-bottom: 20px;
            ">
              Welcome to PJMTR Author Portal
            </h2>

            <p>
              Dear ${name.trim()},
            </p>

            <p>
              Thank you for creating your author account with
              <strong>
                Pacific Journal of Modern Theories and Research
              </strong>.
            </p>

            <p>
              Please use the verification code below to verify
              your email address.
            </p>

            <div style="
              text-align: center;
              margin: 30px 0;
            ">

              <div style="
                font-size: 14px;
                color: #666;
                margin-bottom: 10px;
              ">
                Your Verification Code
              </div>

              <div style="
                display: inline-block;
                background: #F4F6FA;
                color: #07163A;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                padding: 15px 25px;
                border-radius: 8px;
              ">
                ${otp}
              </div>

            </div>

            <p>
              This verification code is valid for
              <strong>10 minutes</strong>.
              Please do not share this code with anyone.
            </p>

            <p>
              If you did not create this account,
              you can safely ignore this email.
            </p>

            <p style="margin-top: 30px;">
              Regards,<br>
              <strong>
                PACIFIC JOURNAL OF MODERN THEORIES AND RESEARCH
              </strong><br>
              PJMTR Author Portal
            </p>

          </div>
        `
      });

      console.log(
        `Author OTP email sent to ${normalizedEmail}`
      );

    } catch (mailError) {
      console.error(
        'Brevo Author OTP Mail Error:',
        mailError
      );

      return res.status(500).json({
        message:
          'Account created, but OTP email could not be sent. Please try registration again.'
      });
    }

    // Registration success response
    return res.status(200).json({
      message: 'OTP sent successfully to your email'
    });

  } catch (error) {
    console.error(
      'Author Register Error:',
      error
    );

    return res.status(500).json({
      message: 'Server error'
    });
  }
};

// Verify Author OTP
const verifyAuthorOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate OTP fields
    if (!email || !otp) {
      return res.status(400).json({
        message: 'Email and OTP are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find author
    const author = await Author.findOne({
      email: normalizedEmail
    });

    if (!author) {
      return res.status(404).json({
        message: 'Author account not found'
      });
    }

    // Check verification status
    if (author.isEmailVerified) {
      return res.status(400).json({
        message: 'Email is already verified'
      });
    }

    // Check OTP availability
    if (!author.emailOTP || !author.emailOTPExpires) {
      return res.status(400).json({
        message: 'OTP not found. Please register again'
      });
    }

    // Check OTP expiry
    if (new Date() > author.emailOTPExpires) {
      return res.status(400).json({
        message: 'OTP has expired. Please register again'
      });
    }

    // Check OTP value
    if (author.emailOTP !== otp.toString().trim()) {
      return res.status(400).json({
        message: 'Invalid OTP'
      });
    }

    // Verify author email
    author.isEmailVerified = true;
    author.emailOTP = null;
    author.emailOTPExpires = null;

    await author.save();

    return res.status(200).json({
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error(
      'Author OTP Verification Error:',
      error
    );

    return res.status(500).json({
      message: 'Server error'
    });
  }
};

// Login Author
const loginAuthor = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate login fields
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find author
    const author = await Author.findOne({
      email: normalizedEmail
    });

    if (!author) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check email verification
    if (!author.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before login'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(
      password,
      author.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Generate author JWT
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

    return res.status(200).json({
      message: 'Login successful',
      token,
      author: {
        id: author._id,
        name: author.name,
        email: author.email
      }
    });

  } catch (error) {
    console.error(
      'Author Login Error:',
      error
    );

    return res.status(500).json({
      message: 'Server error'
    });
  }
};

// Get Author Profile
const getAuthorProfile = async (req, res) => {
  try {
    // Find logged-in author
    const author = await Author.findById(req.author.id).select(
      '-password -emailOTP -emailOTPExpires'
    );

    if (!author) {
      return res.status(404).json({
        message: 'Author not found'
      });
    }

    // Prepare profile image
    let profileImage = null;

    if (author.profileImage?.data && author.profileImage?.contentType) {
      profileImage = {
        contentType: author.profileImage.contentType,
        data: author.profileImage.data.toString('base64')
      };
    }

    return res.status(200).json({
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
        postalCode: author.postalCode,
        profileImage
      }
    });
  } catch (error) {
    console.error('Get Author Profile Error:', error);

    return res.status(500).json({
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

    // Find logged-in author
    const author = await Author.findById(req.author.id);

    if (!author) {
      return res.status(404).json({
        message: 'Author not found'
      });
    }

    // Update profile fields
    author.mobile = mobile ?? author.mobile;
    author.designation = designation ?? author.designation;
    author.department = department ?? author.department;
    author.institution = institution ?? author.institution;
    author.qualification = qualification ?? author.qualification;
    author.researchInterest =
      researchInterest ?? author.researchInterest;
    author.orcidId = orcidId ?? author.orcidId;
    author.address = address ?? author.address;
    author.city = city ?? author.city;
    author.state = state ?? author.state;
    author.country = country ?? author.country;
    author.postalCode = postalCode ?? author.postalCode;

    // Update profile image
    if (req.file) {
      author.profileImage = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }

    await author.save();

    // Prepare profile image
    let profileImage = null;

    if (author.profileImage?.data && author.profileImage?.contentType) {
      profileImage = {
        contentType: author.profileImage.contentType,
        data: author.profileImage.data.toString('base64')
      };
    }

    return res.status(200).json({
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
        postalCode: author.postalCode,
        profileImage
      }
    });
  } catch (error) {
    console.error('Update Author Profile Error:', error);

    return res.status(500).json({
      message: 'Server error'
    });
  }
};

module.exports = {
  registerAuthor,
  verifyAuthorOTP,
  loginAuthor,
  getAuthorProfile,
  updateAuthorProfile
};
