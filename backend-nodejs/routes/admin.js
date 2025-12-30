import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import Design from '../models/Design.js';
import Order from '../models/Order.js';
import ShowcaseDesign from '../models/ShowcaseDesign.js';
import Coupon from '../models/Coupon.js';
import CouponUsage from '../models/CouponUsage.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrders,
      totalDesigns,
      totalShowcase,
      pendingOrders,
      completedOrders,
      orders
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Design.countDocuments(),
      ShowcaseDesign.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'completed' }),
      Order.find({}).select('final_price')
    ]);

    const totalRevenue = orders.reduce((sum, order) => sum + (order.final_price || 0), 0);

    res.json({
      total_users: totalUsers,
      total_orders: totalOrders,
      total_designs: totalDesigns,
      total_showcase: totalShowcase,
      pending_orders: pendingOrders,
      completed_orders: completedOrders,
      total_revenue: totalRevenue,
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({ detail: 'خطأ في جلب الإحصائيات' });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders with user details
// @access  Private/Admin
router.get('/orders', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .select('-_id')
      .sort({ created_at: -1 });

    // Get user details for each order
    const ordersWithUsers = await Promise.all(
      orders.map(async (order) => {
        const user = await User.findOne({ id: order.user_id }).select('-_id -password');
        return {
          id: order.id,
          user_id: order.user_id,
          user_name: user?.username || 'Unknown',
          user_email: user?.email || 'Unknown',
          design_id: order.design_id,
          design_image_base64: order.design_image_base64,
          prompt: order.prompt,
          phone_number: order.phone_number,
          size: order.size,
          color: order.color,
          price: order.price,
          discount: order.discount,
          final_price: order.final_price,
          status: order.status,
          created_at: order.created_at.toISOString(),
        };
      })
    );

    res.json(ordersWithUsers);
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ detail: 'خطأ في جلب الطلبات' });
  }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/orders/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ detail: 'حالة غير صالحة' });
    }

    const order = await Order.findOne({ id: req.params.id });

    if (!order) {
      return res.status(404).json({ detail: 'الطلب غير موجود' });
    }

    order.status = status;
    await order.save();

    res.json({ message: 'تم تحديث حالة الطلب بنجاح', status });
  } catch (error) {
    console.error('Update Order Status Error:', error);
    res.status(500).json({ detail: 'خطأ في تحديث حالة الطلب' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-_id -password')
      .sort({ created_at: -1 });

    const usersResponse = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      designs_limit: user.designs_limit,
      designs_used: user.designs_used,
      is_unlimited: user.is_unlimited,
      email_verified: user.email_verified,
      created_at: user.created_at.toISOString(),
    }));

    res.json(usersResponse);
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ detail: 'خطأ في جلب المستخدمين' });
  }
});

// @route   PUT /api/admin/users/:id/designs-limit
// @desc    Update user's design limit
// @access  Private/Admin
router.put('/users/:id/designs-limit', protect, admin, async (req, res) => {
  try {
    const { designs_limit, is_unlimited } = req.body;

    const user = await User.findOne({ id: req.params.id });

    if (!user) {
      return res.status(404).json({ detail: 'المستخدم غير موجود' });
    }

    if (is_unlimited !== undefined) {
      user.is_unlimited = is_unlimited;
    }

    if (designs_limit !== undefined && designs_limit >= 0) {
      user.designs_limit = designs_limit;
    }

    await user.save();

    res.json({
      message: 'تم تحديث حصة التصاميم بنجاح',
      designs_limit: user.designs_limit,
      is_unlimited: user.is_unlimited,
    });
  } catch (error) {
    console.error('Update Designs Limit Error:', error);
    res.status(500).json({ detail: 'خطأ في تحديث حصة التصاميم' });
  }
});

// @route   GET /api/admin/designs
// @desc    Get all designs with user details
// @access  Private/Admin
router.get('/designs', protect, admin, async (req, res) => {
  try {
    const designs = await Design.find({})
      .select('-_id')
      .sort({ created_at: -1 });

    // Get user details for each design
    const designsWithUsers = await Promise.all(
      designs.map(async (design) => {
        const user = await User.findOne({ id: design.user_id }).select('username email');
        return {
          id: design.id,
          user_id: design.user_id,
          user_name: user?.username || 'Unknown',
          user_email: user?.email || 'Unknown',
          prompt: design.prompt,
          image_base64: design.image_base64,
          clothing_type: design.clothing_type,
          color: design.color,
          phone_number: design.phone_number,
          is_favorite: design.is_favorite,
          created_at: design.created_at.toISOString(),
        };
      })
    );

    res.json(designsWithUsers);
  } catch (error) {
    console.error('Get Designs Error:', error);
    res.status(500).json({ detail: 'خطأ في جلب التصاميم' });
  }
});

// @route   DELETE /api/admin/designs/:id
// @desc    Delete any design (admin)
// @access  Private/Admin
router.delete('/designs/:id', protect, admin, async (req, res) => {
  try {
    const design = await Design.findOne({ id: req.params.id });

    if (!design) {
      return res.status(404).json({ detail: 'التصميم غير موجود' });
    }

    // Decrement user's designs count
    await User.findOneAndUpdate(
      { id: design.user_id },
      { $inc: { designs_used: -1 } }
    );

    await Design.deleteOne({ id: req.params.id });

    res.json({ message: 'تم حذف التصميم بنجاح' });
  } catch (error) {
    console.error('Delete Design Error:', error);
    res.status(500).json({ detail: 'خطأ في حذف التصميم' });
  }
});

// ===== Showcase Designs Management =====

// @route   GET /api/admin/showcase-designs
// @desc    Get all showcase designs
// @access  Private/Admin
router.get('/showcase-designs', protect, admin, async (req, res) => {
  try {
    const designs = await ShowcaseDesign.find({})
      .select('-_id')
      .sort({ created_at: -1 });

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
      updated_at: d.updated_at ? d.updated_at.toISOString() : null,
    }));

    res.json(response);
  } catch (error) {
    console.error('Get Showcase Designs Error:', error);
    res.status(500).json({ detail: 'خطأ في جلب التصاميم الملهمة' });
  }
});

// @route   POST /api/admin/showcase-designs
// @desc    Create new showcase design
// @access  Private/Admin
router.post('/showcase-designs', protect, admin, async (req, res) => {
  try {
    const {
      title,
      description,
      prompt,
      image_base64,
      clothing_type,
      color,
      template_id,
      tags,
      is_featured,
    } = req.body;

    if (!title || !description || !prompt || !image_base64 || !clothing_type) {
      return res.status(400).json({ detail: 'يرجى إدخال جميع الحقول المطلوبة' });
    }

    const design = await ShowcaseDesign.create({
      id: uuidv4(),
      title,
      description,
      prompt,
      image_base64,
      clothing_type,
      color,
      template_id,
      tags: tags || [],
      is_featured: is_featured || false,
      is_active: true,
      likes_count: 0,
    });

    res.status(201).json({
      message: 'تم إضافة التصميم الملهم بنجاح',
      id: design.id,
    });
  } catch (error) {
    console.error('Create Showcase Design Error:', error);
    res.status(500).json({ detail: 'خطأ في إضافة التصميم: ' + error.message });
  }
});

// @route   PUT /api/admin/showcase-designs/:id
// @desc    Update showcase design
// @access  Private/Admin
router.put('/showcase-designs/:id', protect, admin, async (req, res) => {
  try {
    const design = await ShowcaseDesign.findOne({ id: req.params.id });

    if (!design) {
      return res.status(404).json({ detail: 'التصميم غير موجود' });
    }

    const {
      title,
      description,
      prompt,
      image_base64,
      clothing_type,
      color,
      template_id,
      tags,
      is_featured,
      is_active,
    } = req.body;

    // Update only provided fields
    if (title !== undefined) design.title = title;
    if (description !== undefined) design.description = description;
    if (prompt !== undefined) design.prompt = prompt;
    if (image_base64 !== undefined) design.image_base64 = image_base64;
    if (clothing_type !== undefined) design.clothing_type = clothing_type;
    if (color !== undefined) design.color = color;
    if (template_id !== undefined) design.template_id = template_id;
    if (tags !== undefined) design.tags = tags;
    if (is_featured !== undefined) design.is_featured = is_featured;
    if (is_active !== undefined) design.is_active = is_active;

    design.updated_at = new Date();
    await design.save();

    res.json({ message: 'تم تحديث التصميم بنجاح' });
  } catch (error) {
    console.error('Update Showcase Design Error:', error);
    res.status(500).json({ detail: 'خطأ في تحديث التصميم: ' + error.message });
  }
});

// @route   DELETE /api/admin/showcase-designs/:id
// @desc    Delete showcase design
// @access  Private/Admin
router.delete('/showcase-designs/:id', protect, admin, async (req, res) => {
  try {
    const result = await ShowcaseDesign.deleteOne({ id: req.params.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'التصميم غير موجود' });
    }

    res.json({ message: 'تم حذف التصميم بنجاح' });
  } catch (error) {
    console.error('Delete Showcase Design Error:', error);
    res.status(500).json({ detail: 'خطأ في حذف التصميم: ' + error.message });
  }
});

// @route   PUT /api/admin/showcase-designs/:id/toggle-featured
// @desc    Toggle featured status of showcase design
// @access  Private/Admin
router.put('/showcase-designs/:id/toggle-featured', protect, admin, async (req, res) => {
  try {
    const design = await ShowcaseDesign.findOne({ id: req.params.id });

    if (!design) {
      return res.status(404).json({ detail: 'التصميم غير موجود' });
    }

    design.is_featured = !design.is_featured;
    design.updated_at = new Date();
    await design.save();

    const statusText = design.is_featured ? 'مميز' : 'عادي';
    res.json({
      message: `تم تغيير حالة التصميم إلى ${statusText}`,
      is_featured: design.is_featured,
    });
  } catch (error) {
    console.error('Toggle Featured Error:', error);
    res.status(500).json({ detail: 'خطأ في تغيير الحالة: ' + error.message });
  }
});

export default router;
