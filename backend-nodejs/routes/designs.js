import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import Design from '../models/Design.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import ShowcaseDesign from '../models/ShowcaseDesign.js';
import { protect } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// Image Generator Service URL
const IMAGE_GENERATOR_URL = process.env.IMAGE_GENERATOR_URL || 'http://localhost:8002';

// AI Image Generation Helper - calls Python microservice
const generateImageWithAI = async (prompt, clothingType, color, options = {}) => {
  try {
    const { logo_base64, logo_position, user_photo_base64, view_angle } = options;
    
    const response = await axios.post(
      `${IMAGE_GENERATOR_URL}/generate`,
      {
        prompt: prompt,
        clothing_type: clothingType,
        color: color || '',
        logo_base64: logo_base64 || null,
        logo_position: logo_position || 'center',
        user_photo_base64: user_photo_base64 || null,
        view_angle: view_angle || 'front'
      },
      {
        timeout: 180000 // 3 minutes timeout for AI generation
      }
    );

    if (response.data?.success && response.data?.image_base64) {
      return {
        image_base64: response.data.image_base64,
        composite_image_base64: response.data.composite_image_base64 || '',
        revised_prompt: response.data.revised_prompt || prompt
      };
    }

    throw new Error(response.data?.error || 'فشل في توليد الصورة');
  } catch (error) {
    console.error('Image Generator Error:', error.response?.data || error.message);
    throw error;
  }
};

// @route   GET /api/designs/showcase
// @desc    Get showcase designs for homepage
// @access  Public
router.get('/showcase', async (req, res) => {
  try {
    const designs = await ShowcaseDesign.find({ is_active: true })
      .select('-_id')
      .sort({ is_featured: -1, likes_count: -1 })
      .limit(20);

    const response = designs.map(d => ({
      id: d.id,
      title: d.title,
      description: d.description,
      prompt: d.prompt,
      image_base64: d.image_base64,
      clothing_type: d.clothing_type,
      color: d.color,
      template_id: d.template_id,
      tags: d.tags || [],
      likes_count: d.likes_count,
      is_featured: d.is_featured,
      is_active: d.is_active,
      created_at: d.created_at.toISOString(),
    }));

    res.json(response);
  } catch (error) {
    console.error('Get Showcase Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في جلب التصاميم الملهمة' 
    });
  }
});

// @route   POST /api/designs/enhance-prompt
// @desc    Enhance design prompt using AI
// @access  Private
router.post('/enhance-prompt', protect, async (req, res) => {
  try {
    const { prompt, clothing_type } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        detail: 'يرجى إدخال الوصف' 
      });
    }

    // Translate clothing type
    const clothingTypeMap = {
      'tshirt': 'تيشيرت',
      'shirt': 'قميص',
      'hoodie': 'هودي',
      'dress': 'فستان',
      'jacket': 'جاكيت',
      'pants': 'بنطلون'
    };
    const arabicClothingType = clothingTypeMap[clothing_type] || clothing_type;

    // Enhance the prompt with fashion-specific details
    const enhancedPrompt = `${prompt}، ${arabicClothingType} بتصميم احترافي، خامة قطنية عالية الجودة، ألوان متناسقة، مناسب للموسم الحالي، تفاصيل دقيقة ومميزة، إطلالة عصرية وأنيقة`;

    res.json({
      success: true,
      enhanced_prompt: enhancedPrompt,
      original_prompt: prompt
    });
  } catch (error) {
    console.error('Enhance Prompt Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في تحسين الوصف' 
    });
  }
});

// @route   POST /api/designs/preview
// @desc    Generate design preview with AI, logo blending, and user photo composition
// @access  Private
router.post('/preview', protect, async (req, res) => {
  try {
    const { prompt, clothing_type, color, logo_base64, logo_position, user_photo_base64, view_angle } = req.body;

    if (!prompt || !clothing_type) {
      return res.status(400).json({ 
        detail: 'يرجى إدخال الوصف ونوع الملبس' 
      });
    }

    // Check user's design quota
    const user = await User.findOne({ id: req.user.id });
    
    if (!user.is_unlimited && user.designs_used >= user.designs_limit) {
      return res.status(403).json({ 
        detail: 'لقد وصلت إلى الحد الأقصى من التصاميم المجانية' 
      });
    }

    // Translate clothing type to English for better AI results
    const clothingTypeMap = {
      'tshirt': 't-shirt',
      'shirt': 'formal shirt',
      'hoodie': 'hoodie sweatshirt',
      'dress': 'dress',
      'jacket': 'jacket',
      'pants': 'pants'
    };
    const englishClothingType = clothingTypeMap[clothing_type] || clothing_type;

    // Generate image using OpenAI with logo and user photo options
    const result = await generateImageWithAI(prompt, englishClothingType, color, {
      logo_base64,
      logo_position: logo_position || 'center',
      user_photo_base64,
      view_angle: view_angle || 'front'
    });

    // Increment designs_used after successful generation
    await User.findOneAndUpdate(
      { id: req.user.id },
      { $inc: { designs_used: 1 } }
    );

    // Get updated user data for response
    const updatedUser = await User.findOne({ id: req.user.id });
    const designsRemaining = updatedUser.is_unlimited ? 999 : (updatedUser.designs_limit - updatedUser.designs_used);

    res.json({
      success: true,
      image_base64: result.image_base64,
      composite_image_base64: result.composite_image_base64 || '',
      prompt: result.revised_prompt || prompt,
      message: 'تم إنشاء التصميم بنجاح',
      designs_remaining: designsRemaining,
      designs_used: updatedUser.designs_used,
      designs_limit: updatedUser.designs_limit
    });
  } catch (error) {
    console.error('Preview Error:', error);
    
    // Handle specific API errors
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        detail: 'الوصف غير مناسب. يرجى تعديله والمحاولة مرة أخرى.' 
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        detail: 'تم تجاوز الحد المسموح. يرجى الانتظار والمحاولة لاحقاً.' 
      });
    }
    
    res.status(500).json({ 
      detail: 'خطأ في إنشاء التصميم. يرجى المحاولة مرة أخرى.' 
    });
  }
});

// @route   POST /api/designs/save
// @desc    Save design and create order
// @access  Private
router.post('/save', protect, async (req, res) => {
  try {
    const {
      prompt,
      image_base64,
      clothing_type,
      template_id,
      color,
      phone_number,
      user_photo_base64,
      logo_base64,
    } = req.body;

    if (!prompt || !image_base64 || !clothing_type) {
      return res.status(400).json({ 
        detail: 'يرجى إدخال جميع البيانات المطلوبة' 
      });
    }

    // Create design
    const designId = uuidv4();
    const design = await Design.create({
      id: designId,
      user_id: req.user.id,
      prompt,
      image_base64,
      clothing_type,
      template_id,
      color,
      phone_number,
      user_photo_base64,
      logo_base64,
      is_favorite: false,
    });

    // Update user's designs count
    await User.findOneAndUpdate(
      { id: req.user.id },
      { $inc: { designs_used: 1 } }
    );

    // Automatically create an order
    const orderId = uuidv4();
    await Order.create({
      id: orderId,
      user_id: req.user.id,
      design_id: designId,
      design_image_base64: image_base64,
      prompt,
      phone_number: phone_number || 'غير محدد',
      size: 'M',
      color,
      price: 0,
      discount: 0,
      final_price: 0,
      status: 'pending',
    });

    // Create notification for user
    await createNotification(
      req.user.id,
      'تم حفظ التصميم بنجاح',
      'تم حفظ تصميمك الجديد وإنشاء طلب. سنتواصل معك قريباً!',
      'success'
    );

    res.status(201).json({
      id: design.id,
      user_id: design.user_id,
      prompt: design.prompt,
      image_base64: design.image_base64,
      created_at: design.created_at.toISOString(),
      is_favorite: design.is_favorite,
      clothing_type: design.clothing_type,
      color: design.color,
    });
  } catch (error) {
    console.error('Save Design Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في حفظ التصميم: ' + error.message 
    });
  }
});

// @route   GET /api/designs
// @desc    Get user's designs
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const designs = await Design.find({ user_id: req.user.id })
      .select('-_id')
      .sort({ created_at: -1 });

    const response = designs.map(d => ({
      id: d.id,
      user_id: d.user_id,
      prompt: d.prompt,
      image_base64: d.image_base64,
      clothing_type: d.clothing_type,
      template_id: d.template_id,
      color: d.color,
      phone_number: d.phone_number,
      is_favorite: d.is_favorite,
      created_at: d.created_at.toISOString(),
    }));

    res.json(response);
  } catch (error) {
    console.error('Get Designs Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في جلب التصاميم' 
    });
  }
});

// @route   PUT /api/designs/:id/favorite
// @desc    Toggle favorite status of design
// @access  Private
router.put('/:id/favorite', protect, async (req, res) => {
  try {
    const design = await Design.findOne({ 
      id: req.params.id, 
      user_id: req.user.id 
    });

    if (!design) {
      return res.status(404).json({ 
        detail: 'التصميم غير موجود' 
      });
    }

    design.is_favorite = !design.is_favorite;
    await design.save();

    res.json({
      message: design.is_favorite ? 'تمت الإضافة للمفضلة' : 'تمت الإزالة من المفضلة',
      is_favorite: design.is_favorite,
    });
  } catch (error) {
    console.error('Toggle Favorite Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في تحديث المفضلة' 
    });
  }
});

// @route   DELETE /api/designs/:id
// @desc    Delete user's design
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await Design.deleteOne({ 
      id: req.params.id, 
      user_id: req.user.id 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        detail: 'التصميم غير موجود' 
      });
    }

    // Decrement user's designs count
    await User.findOneAndUpdate(
      { id: req.user.id },
      { $inc: { designs_used: -1 } }
    );

    res.json({ 
      message: 'تم حذف التصميم بنجاح' 
    });
  } catch (error) {
    console.error('Delete Design Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في حذف التصميم' 
    });
  }
});

export default router;
