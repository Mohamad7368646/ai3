import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/oauth/google
// @desc    Google OAuth login/register
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ detail: 'يرجى تقديم بيانات Google' });
    }

    // Verify Google token
    const googleResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    const { email, name, email_verified } = googleResponse.data;

    if (!email_verified) {
      return res.status(400).json({ detail: 'البريد الإلكتروني غير مُحقق من Google' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists, login
      const token = generateToken(user.id);

      return res.json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_admin: user.is_admin,
          designs_limit: user.designs_limit,
          designs_used: user.designs_used,
          email_verified: true,
        },
      });
    } else {
      // Create new user
      const username = email.split('@')[0] + '_' + Date.now().toString().slice(-4);
      const randomPassword = uuidv4(); // Random password for OAuth users

      user = await User.create({
        id: uuidv4(),
        username,
        email,
        password: randomPassword,
        email_verified: true,
        designs_limit: 3,
        designs_used: 0,
        is_admin: false,
      });

      const token = generateToken(user.id);

      return res.status(201).json({
        access_token: token,
        token_type: 'bearer',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_admin: user.is_admin,
          designs_limit: user.designs_limit,
          designs_used: user.designs_used,
          email_verified: true,
        },
      });
    }
  } catch (error) {
    console.error('Google OAuth Error:', error.response?.data || error.message);
    res.status(500).json({ 
      detail: 'خطأ في تسجيل الدخول عبر Google: ' + (error.response?.data?.error_description || error.message)
    });
  }
});

export default router;
