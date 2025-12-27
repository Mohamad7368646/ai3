import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import { protect, generateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        detail: 'يرجى ملء جميع الحقول' 
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (userExists) {
      return res.status(400).json({ 
        detail: 'المستخدم موجود بالفعل' 
      });
    }

    // Create user
    const user = await User.create({
      id: uuidv4(),
      username,
      email,
      password,
      email_verified: false,
      designs_limit: 3,
      designs_used: 0,
      is_admin: false,
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin,
        designs_limit: user.designs_limit,
        designs_used: user.designs_used,
        email_verified: user.email_verified,
      },
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في التسجيل: ' + error.message 
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        detail: 'يرجى إدخال اسم المستخدم وكلمة المرور' 
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        detail: 'بيانات الدخول غير صحيحة' 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ 
        detail: 'بيانات الدخول غير صحيحة' 
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin,
        designs_limit: user.designs_limit,
        designs_used: user.designs_used,
        email_verified: user.email_verified,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في تسجيل الدخول: ' + error.message 
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      is_admin: req.user.is_admin,
      designs_limit: req.user.designs_limit,
      designs_used: req.user.designs_used,
      email_verified: req.user.email_verified,
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في جلب بيانات المستخدم' 
    });
  }
});

export default router;
