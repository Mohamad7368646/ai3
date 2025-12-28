import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  user_id: {
    type: String,
    required: true,
    ref: 'User',
  },
  design_id: {
    type: String,
    required: false, // Made optional - can create order without saved design
    ref: 'Design',
  },
  design_image_base64: String,
  prompt: String,
  phone_number: String,
  size: String,
  color: String,
  price: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  final_price: {
    type: Number,
    default: 0,
  },
  coupon_code: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
  collection: 'orders'
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
