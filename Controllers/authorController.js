const Author = require('../models/Author');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// AUTHOR REGISTER
const registerAuthor = async (req, res) => {
  try {
    const { name, email, password, mobile, institution } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    const existingAuthor = await Author.findOne({ email });

    if (existingAuthor) {
      return res.status(400).json({
        message: 'Author with this email already exists'
      });
    }

    const author = await Author.create({
      name,
      email,
      password,
      mobile,
      institution
    });

    res.status(201).json({
      message: 'Author registered successfully',
      author: {
        id: author._id,
        name: author.name,
        email: author.email,
        mobile: author.mobile,
        institution: author.institution
      }
    });
  } catch (error) {
    console.error('Author Register Error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
};


// AUTHOR LOGIN
const loginAuthor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const author = await Author.findOne({ email });

    if (!author) {
      return res.status(401).json({
        message: 'Invalid email or password'
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
        email: author.email,
        mobile: author.mobile,
        institution: author.institution
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
  loginAuthor
};
