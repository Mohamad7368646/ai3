import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Order from '../models/Order.js';
import Design from '../models/Design.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import CouponUsage from '../models/CouponUsage.js';
import { protect } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// @route   POST /api/orders/create
// @desc    Create a new order from generated design
// @access  Private
router.post('/create', protect, async (req, res) => {
  try {
    const {
      design_image_base64,
      prompt,
      phone_number,
      size,
      design_id,
      color,
      coupon_code
    } = req.body;

    if (!design_image_base64 || !prompt || !phone_number) {
      return res.status(400).json({ 
        detail: 'يرجى إدخال جميع البيانات المطلوبة' 
      });
    }

    // Create order
    const orderId = uuidv4();
    const order = await Order.create({
      id: orderId,
      user_id: req.user.id,
      design_id: design_id || null,
      design_image_base64,
      prompt,
      phone_number,
      size: size || 'M',
      color: color || '',
      price: 0,
      discount: 0,
      final_price: 0,
      status: 'pending',
      coupon_code: coupon_code || null,
    });

    // Record coupon usage if coupon was used
    if (coupon_code) {
      const coupon = await Coupon.findOne({ code: coupon_code.toUpperCase() });
      if (coupon) {
        await CouponUsage.create({
          id: uuidv4(),
          coupon_id: coupon.id,
          coupon_code: coupon.code,
          user_id: req.user.id,
          order_id: orderId,
        });
        
        // Increment coupon usage count
        await Coupon.findOneAndUpdate(
          { id: coupon.id },
          { $inc: { current_uses: 1 } }
        );
      }
    }

    // Create notification for user
    await createNotification(
      req.user.id,
      'تم إرسال طلبك بنجاح! 🎉',
      'سيتم التواصل معك قريباً لتأكيد الطلب والتفاصيل.',
      'success'
    );

    res.status(201).json({
      success: true,
      message: 'تم إرسال الطلب بنجاح',
      order_id: orderId,
      order: {
        id: order.id,
        status: order.status,
        phone_number: order.phone_number,
        size: order.size,
        created_at: order.created_at.toISOString()
      }
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في إرسال الطلب: ' + error.message 
    });
  }
});

// @route   GET /api/orders/my-orders
// @desc    Get user's orders
// @access  Private
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id })
      .select('-_id')
      .sort({ created_at: -1 });

    const response = orders.map(order => ({
      id: order.id,
      design_id: order.design_id,
      design_image_base64: order.design_image_base64,
      prompt: order.prompt,
      phone_number: order.phone_number,
      size: order.size,
      color: order.color,
      price: order.price,
      final_price: order.final_price,
      status: order.status,
      created_at: order.created_at.toISOString()
    }));

    res.json(response);
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ 
      detail: 'خطأ في جلب الطلبات' 
    });
  }
});

export default router;
