import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  discount_percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  expiry_date: {
    type: Date,
    required: true,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  max_uses: {
    type: Number,
    default: null, // null = unlimited
  },
  current_uses: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
  collection: 'coupons'
});

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
