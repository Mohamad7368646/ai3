import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user.id })
      .select('-_id')
      .sort({ created_at: -1 })
      .limit(50);

    const response = notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at.toISOString(),
    }));

    res.json(response);
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ detail: 'خطأ في جلب الإشعارات' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      id: req.params.id,
      user_id: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ detail: 'الإشعار غير موجود' });
    }

    notification.is_read = true;
    await notification.save();

    res.json({ message: 'تم وضع علامة مقروء على الإشعار' });
  } catch (error) {
    console.error('Mark Read Error:', error);
    res.status(500).json({ detail: 'خطأ في تحديث الإشعار' });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await Notification.deleteOne({
      id: req.params.id,
      user_id: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'الإشعار غير موجود' });
    }

    res.json({ message: 'تم حذف الإشعار' });
  } catch (error) {
    console.error('Delete Notification Error:', error);
    res.status(500).json({ detail: 'خطأ في حذف الإشعار' });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user_id: req.user.id,
      is_read: false,
    });

    res.json({ count });
  } catch (error) {
    console.error('Unread Count Error:', error);
    res.status(500).json({ detail: 'خطأ في جلب عدد الإشعارات' });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user.id, is_read: false },
      { is_read: true }
    );

    res.json({ message: 'تم تحديد جميع الإشعارات كمقروءة' });
  } catch (error) {
    console.error('Mark All Read Error:', error);
    res.status(500).json({ detail: 'خطأ في تحديث الإشعارات' });
  }
});

// Helper function to create notification
export const createNotification = async (userId, title, message, type = 'info') => {
  try {
    await Notification.create({
      id: uuidv4(),
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
    });
  } catch (error) {
    console.error('Create Notification Error:', error);
  }
};

export default router;
