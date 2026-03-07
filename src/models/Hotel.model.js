const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['standard', 'deluxe', 'suite', 'family', 'presidential']
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  pricePerNight: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'XAF',
    enum: ['XAF', 'EUR', 'USD']
  },
  capacity: {
    adults: {
      type: Number,
      default: 2
    },
    children: {
      type: Number,
      default: 0
    }
  },
  amenities: [String],
  images: [String],
  totalRooms: {
    type: Number,
    required: true,
    min: 1
  },
  availableRooms: {
    type: Number,
    default: function() {
      return this.totalRooms;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Le nom de l'hôtel est requis"],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: String,
  address: {
    street: String,
    city: {
      type: String,
      required: true
    },
    postalCode: String,
    country: {
      type: String,
      default: 'Cameroun'
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  stars: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  amenities: [String],
  images: [String],
  coverImage: String,
  rooms: [roomSchema],
  policies: {
    checkIn: String,
    checkOut: String,
    cancellation: String,
    children: String,
    pets: String
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'under_renovation'],
    default: 'active'
  },
  metadata: {
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    bookings: { type: Number, default: 0 }
  },
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    tripadvisor: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour la recherche
hotelSchema.index({ name: 'text', description: 'text', 'address.city': 'text' });
hotelSchema.index({ 'address.city': 1, stars: -1 });
hotelSchema.index({ isActive: 1, status: 1 });

// Middleware pré-save pour générer le slug
hotelSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

// Méthode pour vérifier la disponibilité
hotelSchema.methods.checkAvailability = function(roomType, checkIn, checkOut) {
  const room = this.rooms.find(r => r.type === roomType && r.isActive);
  
  if (!room) {
    return {
      available: false,
      message: 'Type de chambre non disponible'
    };
  }
  
  // Ici, on devrait vérifier les réservations existantes
  // Pour l'instant, on retourne simplement la disponibilité actuelle
  return {
    available: room.availableRooms > 0,
    availableRooms: room.availableRooms,
    pricePerNight: room.pricePerNight,
    room: room
  };
};

module.exports = mongoose.model('Hotel', hotelSchema);