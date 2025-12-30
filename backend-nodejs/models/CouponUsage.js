import mongoose from 'mongoose';

const couponUsageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  coupon_id: {
    type: String,
    required: true,
    ref: 'Coupon',
  },
  coupon_code: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
    ref: 'User',
  },
  order_id: {
    type: String,
    ref: 'Order',
  },
  used_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
  collection: 'coupon_usages'
});

const CouponUsage = mongoose.model('CouponUsage', couponUsageSchema);

export default CouponUsage;
