const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre du service est requis'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  tagline: String,
  description: {
    type: String,
    required: true
  },
  heroText: String,
  icon: {
    type: String,
    default: 'MonitorSmartphone'
  },
  coverImage: String,
  images: [String],
  features: [{
    title: String,
    description: String,
    icon: String
  }],
  testimonials: [{
    name: String,
    role: String,
    quote: String,
    avatar: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  }],
  pricing: [{
    plan: String,
    price: Number,
    currency: {
      type: String,
      default: 'XAF'
    },
    period: {
      type: String,
      enum: ['one_time', 'monthly', 'yearly']
    },
    features: [String]
  }],
  faqs: [{
    question: String,
    answer: String
  }],
  category: {
    type: String,
    enum: ['digital', 'consulting', 'development', 'marketing', 'training'],
    default: 'digital'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  metadata: {
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour la recherche
serviceSchema.index({ title: 'text', description: 'text', tagline: 'text' });
serviceSchema.index({ category: 1, isActive: 1, order: 1 });
serviceSchema.index({ createdAt: -1 });

// Middleware pré-save pour générer le slug
serviceSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

module.exports = mongoose.model('Service', serviceSchema);