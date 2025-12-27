import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (without password)
      req.user = await User.findOne({ id: decoded.id }).select('-password');

      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          detail: 'المستخدم غير موجود' 
        });
      }

      next();
    } catch (error) {
      console.error('Auth Error:', error);
      return res.status(401).json({ 
        success: false, 
        detail: 'غير مصرح، رمز غير صالح' 
        });
    }
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      detail: 'غير مصرح، لا يوجد رمز' 
    });
  }
};

export const admin = async (req, res, next) => {
  if (req.user && req.user.is_admin) {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      detail: 'غير مصرح - مطلوب صلاحيات المدير' 
    });
  }
};

// Generate JWT Token
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};
