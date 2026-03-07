const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  total: {
    type: Number,
    required: true
  },
  coverImage: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'XAF',
    enum: ['XAF', 'EUR', 'USD']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'mobile_money', 'cash', 'bank_transfer'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    provider: String,
    paidAt: Date
  },
  shippingAddress: {
    street: String,
    city: String,
    postalCode: String,
    country: {
      type: String,
      default: 'Cameroun'
    },
    phone: String,
    additionalInfo: String
  },
  billingAddress: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  },
  trackingNumber: String,
  shippingProvider: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
  notes: String,
  customerNotes: String,
  metadata: {
    ipAddress: String,
    userAgent: String,
    referralSource: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour la recherche

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'paymentDetails.transactionId': 1 });

// Middleware pré-save pour générer le numéro de commande
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `SOFIA-${year}${month}${day}-${random}`;
  }
  
  // Calculer le total si les items changent
  if (this.isModified('items')) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    this.totalAmount = this.subtotal + this.shippingCost + this.tax;
  }
  
  next();
});

// Méthode pour mettre à jour le statut
orderSchema.methods.updateStatus = async function(newStatus, notes = '') {
  const oldStatus = this.status;
  this.status = newStatus;
  
  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
  }
  
  if (notes) {
    this.notes = this.notes ? `${this.notes}\n${new Date().toISOString()}: ${notes}` : notes;
  }
  
  await this.save();
  
  // Log de l'historique des statuts
  await mongoose.model('OrderHistory').create({
    order: this._id,
    fromStatus: oldStatus,
    toStatus: newStatus,
    notes: notes,
    changedBy: 'system'
  });
  
  return this;
};

module.exports = mongoose.model('Order', orderSchema);

// Modèle pour l'historique des commandes
const orderHistorySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  fromStatus: String,
  toStatus: String,
  notes: String,
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

mongoose.model('OrderHistory', orderHistorySchema);