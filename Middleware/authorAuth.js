const jwt = require('jsonwebtoken');

// Author Authentication
const authorAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id || decoded.role !== 'author') {
      return res.status(401).json({
        message: 'Invalid author token'
      });
    }

    req.author = {
      id: decoded.id,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('Author Auth Error:', error);

    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }
};

module.exports = authorAuth;
