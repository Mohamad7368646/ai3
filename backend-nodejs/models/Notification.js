import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info',
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
  collection: 'notifications'
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
