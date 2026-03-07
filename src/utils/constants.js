// Application constants
module.exports = {
  // User roles
  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    HOTEL_MANAGER: 'hotel_manager'
  },

  // Book categories
  BOOK_CATEGORIES: [
    'digital',
    'management',
    'finance',
    'marketing',
    'leadership',
    'technology',
    'business'
  ],

  // Book formats
  BOOK_FORMATS: [
    'Papier',
    'PDF',
    'EPUB',
    'Audiobook'
  ],

  // Book status
  BOOK_STATUS: {
    ACTIVE: 'active',
    OUT_OF_STOCK: 'out_of_stock',
    DISCONTINUED: 'discontinued',
    DRAFT: 'draft'
  },

  // Order status
  ORDER_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },

  // Payment status
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  // Payment methods
  PAYMENT_METHODS: [
    'card',
    'mobile_money',
    'cash',
    'bank_transfer'
  ],

  // Hotel room types
  ROOM_TYPES: [
    'standard',
    'deluxe',
    'suite',
    'family',
    'presidential'
  ],

  // Hotel status
  HOTEL_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    UNDER_RENOVATION: 'under_renovation'
  },

  // Service categories
  SERVICE_CATEGORIES: [
    'digital',
    'consulting',
    'development',
    'marketing',
    'training'
  ],

  // Currencies
  CURRENCIES: [
    'XAF',
    'EUR',
    'USD'
  ],

  // Countries (focus on Africa)
  COUNTRIES: [
    'Cameroun',
    'Côte d\'Ivoire',
    'Sénégal',
    'Gabon',
    'Mali',
    'Bénin',
    'Togo',
    'Niger',
    'Burkina Faso',
    'Guinée',
    'Congo',
    'RDC',
    'Rwanda',
    'Burundi',
    'Tchad',
    'Centrafrique',
    'Guinée Équatoriale'
  ],

  // Cities in Cameroon
  CAMEROON_CITIES: [
    'Douala',
    'Yaoundé',
    'Garoua',
    'Bamenda',
    'Maroua',
    'Bafoussam',
    'Ngaoundéré',
    'Bertoua',
    'Loum',
    'Kumba',
    'Édéa',
    'Kribi',
    'Foumban',
    'Mbouda',
    'Dschang',
    'Limbé',
    'Ebolowa',
    'Sangmélima'
  ],

  // File upload limits
  FILE_LIMITS: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOC_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  // Cache TTL (in seconds)
  CACHE_TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 3600, // 1 hour
    LONG: 86400, // 24 hours
    VERY_LONG: 604800 // 1 week
  },

  // Validation messages
  VALIDATION_MESSAGES: {
    REQUIRED: 'Ce champ est requis',
    INVALID_EMAIL: 'Email invalide',
    INVALID_PHONE: 'Numéro de téléphone invalide',
    PASSWORD_TOO_SHORT: 'Le mot de passe doit contenir au moins 6 caractères',
    PASSWORD_WEAK: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
    PRICE_INVALID: 'Le prix doit être un nombre positif',
    STOCK_INVALID: 'Le stock doit être un nombre positif',
    DATE_INVALID: 'Date invalide'
  }
};