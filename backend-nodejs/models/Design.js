import mongoose from 'mongoose';

const designSchema = new mongoose.Schema({
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
  prompt: {
    type: String,
    required: true,
  },
  image_base64: {
    type: String,
    required: true,
  },
  clothing_type: String,
  template_id: String,
  color: String,
  phone_number: String,
  user_photo_base64: String,
  logo_base64: String,
  is_favorite: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
  collection: 'designs'
});

const Design = mongoose.model('Design', designSchema);

export default Design;
