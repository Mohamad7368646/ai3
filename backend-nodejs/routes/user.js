import express from 'express';
import User from '../models/User.js';
import Design from '../models/Design.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/user/designs
// @desc    Get user's saved designs
// @access  Private
router.get('/designs', protect, async (req, res) => {
  try {
    const designs = await Design.find({ user_id: req.user.id })
      .select('-_id')
      .sort({ created_at: -1 });

    const response = designs.map(d => ({
      id: d.id,
      prompt: d.prompt,
      image_base64: d.image_base64,
      clothing_type: d.clothing_type,
      color: d.color,
      is_favorite: d.is_favorite,
      created_at: d.created_at.toISOString(),
    }));

    res.json(response);
  } catch (error) {
    console.error('Get User Designs Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في جلب التصاميم' 
    });
  }
});

// @route   GET /api/user/designs-quota
// @desc    Get user's design quota
// @access  Private
router.get('/designs-quota', protect, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });

    if (!user) {
      return res.status(404).json({ 
        detail: 'المستخدم غير موجود' 
      });
    }

    const remaining = user.is_unlimited 
      ? 999 
      : Math.max(0, user.designs_limit - user.designs_used);

    res.json({
      designs_limit: user.designs_limit,
      designs_used: user.designs_used,
      designs_remaining: remaining,
      is_unlimited: user.is_unlimited,
    });
  } catch (error) {
    console.error('Get Designs Quota Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في جلب حصة التصاميم' 
    });
  }
});

export default router;
