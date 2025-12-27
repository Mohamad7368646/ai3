import mongoose from 'mongoose';

const showcaseDesignSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
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
  color: String,
  template_id: String,
  tags: [String],
  likes_count: {
    type: Number,
    default: 0,
  },
  is_featured: {
    type: Boolean,
    default: false,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: Date,
}, {
  timestamps: false,
  collection: 'showcase_designs'
});

const ShowcaseDesign = mongoose.model('ShowcaseDesign', showcaseDesignSchema);

export default ShowcaseDesign;
