const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
  },
  author: {
    type: String,
    required: [true, "L'auteur est requis"],
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'La description courte ne peut pas dépasser 500 caractères']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Le prix ne peut pas être négatif']
  },
  currency: {
    type: String,
    default: 'XAF',
    enum: ['XAF', 'EUR', 'USD']
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['digital', 'management', 'finance', 'marketing', 'leadership', 'technology', 'business']
  },
  subcategory: [String],
  coverImage: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  formats: [{
    type: String,
    enum: ['Papier', 'PDF', 'EPUB', 'Audiobook']
  }],
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewsCount: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true
  },
  pages: {
    type: Number,
    min: 1
  },
  publishedDate: {
    type: Date
  },
  publisher: String,
  language: {
    type: String,
    default: 'Français'
  },
  weight: Number, // en grammes
  dimensions: {
    height: Number, // en cm
    width: Number,
    depth: Number
  },
  status: {
    type: String,
    enum: ['active', 'out_of_stock', 'discontinued', 'draft'],
    default: 'active'
  },
  metadata: {
    views: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    addedToCart: { type: Number, default: 0 }
  },
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour la recherche
bookSchema.index({ title: 'text', author: 'text', description: 'text', tags: 'text' });
bookSchema.index({ category: 1, status: 1, featured: 1 });
bookSchema.index({ price: 1, rating: -1 });
bookSchema.index({ createdAt: -1 });

// Virtual pour le slug
bookSchema.virtual('slug').get(function() {
  return this.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
});

// Méthode pour vérifier la disponibilité
bookSchema.methods.isAvailable = function() {
  return this.stock > 0 && this.status === 'active';
};

// Méthode pour mettre à jour le stock
bookSchema.methods.updateStock = async function(quantity) {
  this.stock += quantity;
  
  if (this.stock <= 0) {
    this.status = 'out_of_stock';
  } else if (this.status === 'out_of_stock') {
    this.status = 'active';
  }
  
  await this.save();
  return this;
};

// Middleware pré-save
bookSchema.pre('save', function(next) {
  if (this.stock === 0 && this.status === 'active') {
    this.status = 'out_of_stock';
  }
  
  if (!this.shortDescription && this.description) {
    this.shortDescription = this.description.substring(0, 200) + '...';
  }
  
  next();
});

module.exports = mongoose.model('Book', bookSchema);