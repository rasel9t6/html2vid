import mongoose from 'mongoose';

const conversionSchema = new mongoose.Schema({
  html: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  progress: {
    type: Number,
    default: 0,
  },
  videoUrl: {
    type: String,
  },
  error: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
conversionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const Conversion = mongoose.model('Conversion', conversionSchema);
