import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Coupon from '../models/Coupon.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/coupons
// @desc    Get all active coupons (admin)
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const coupons = await Coupon.find({})
      .select('-_id')
      .sort({ created_at: -1 });

    const response = coupons.map(c => ({
      id: c.id,
      code: c.code,
      discount_percentage: c.discount_percentage,
      expiry_date: c.expiry_date.toISOString(),
      is_active: c.is_active,
      max_uses: c.max_uses,
      current_uses: c.current_uses,
      created_at: c.created_at.toISOString(),
    }));

    res.json(response);
  } catch (error) {
    console.error('Get Coupons Error:', error);
    res.status(500).json({ detail: 'خطأ في جلب الكوبونات' });
  }
});

// @route   POST /api/coupons
// @desc    Create new coupon
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { code, discount_percentage, expiry_date, max_uses } = req.body;

    if (!code || !discount_percentage) {
      return res.status(400).json({ detail: 'يرجى إدخال كود الكوبون ونسبة الخصم' });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ detail: 'كود الكوبون موجود بالفعل' });
    }

    // Set default expiry date to 1 year from now if not provided
    const expiryDateValue = expiry_date ? new Date(expiry_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const coupon = await Coupon.create({
      id: uuidv4(),
      code: code.toUpperCase(),
      discount_percentage,
      expiry_date: expiryDateValue,
      is_active: true,
      max_uses: max_uses || null,
      current_uses: 0,
    });

    res.status(201).json({
      message: 'تم إنشاء الكوبون بنجاح',
      id: coupon.id,
    });
  } catch (error) {
    console.error('Create Coupon Error:', error);
    res.status(500).json({ detail: 'خطأ في إنشاء الكوبون: ' + error.message });
  }
});

// @route   PUT /api/coupons/:id
// @desc    Update coupon
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ id: req.params.id });

    if (!coupon) {
      return res.status(404).json({ detail: 'الكوبون غير موجود' });
    }

    const { discount_percentage, expiry_date, is_active, max_uses } = req.body;

    if (discount_percentage !== undefined) coupon.discount_percentage = discount_percentage;
    if (expiry_date !== undefined) coupon.expiry_date = new Date(expiry_date);
    if (is_active !== undefined) coupon.is_active = is_active;
    if (max_uses !== undefined) coupon.max_uses = max_uses;

    await coupon.save();

    res.json({ message: 'تم تحديث الكوبون بنجاح' });
  } catch (error) {
    console.error('Update Coupon Error:', error);
    res.status(500).json({ detail: 'خطأ في تحديث الكوبون: ' + error.message });
  }
});

// @route   DELETE /api/coupons/:id
// @desc    Delete coupon
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const result = await Coupon.deleteOne({ id: req.params.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'الكوبون غير موجود' });
    }

    res.json({ message: 'تم حذف الكوبون بنجاح' });
  } catch (error) {
    console.error('Delete Coupon Error:', error);
    res.status(500).json({ detail: 'خطأ في حذف الكوبون' });
  }
});

// @route   POST /api/coupons/validate
// @desc    Validate coupon code
// @access  Private
router.post('/validate', protect, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ detail: 'يرجى إدخال كود الكوبون' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ detail: 'كود الكوبون غير صحيح' });
    }

    // Check if active
    if (!coupon.is_active) {
      return res.status(400).json({ detail: 'الكوبون غير فعال' });
    }

    // Check if expired
    if (new Date() > coupon.expiry_date) {
      return res.status(400).json({ detail: 'الكوبون منتهي الصلاحية' });
    }

    // Check max uses
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return res.status(400).json({ detail: 'تم استخدام الكوبون بالكامل' });
    }

    res.json({
      valid: true,
      discount_percentage: coupon.discount_percentage,
      message: `خصم ${coupon.discount_percentage}٪`,
    });
  } catch (error) {
    console.error('Validate Coupon Error:', error);
    res.status(500).json({ detail: 'خطأ في التحقق من الكوبون' });
  }
});

export default router;
