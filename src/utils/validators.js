const validator = require('validator');

// Validation utilities
const Validators = {
  // Email validation
  isEmail: (value) => {
    return validator.isEmail(value);
  },

  // Phone validation (Cameroon format)
  isPhone: (value) => {
    const cameroonRegex = /^(?:(?:\+|00)237)?[67]\d{8}$/;
    return cameroonRegex.test(value);
  },

  // Strong password validation
  isStrongPassword: (password) => {
    return validator.isStrongPassword(password, {
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0
    });
  },

  // URL validation
  isURL: (value) => {
    return validator.isURL(value, {
      protocols: ['http', 'https'],
      require_protocol: true
    });
  },

  // ISBN validation
  isISBN: (value) => {
    return validator.isISBN(value);
  },

  // Price validation
  isPrice: (value) => {
    const price = parseFloat(value);
    return !isNaN(price) && price >= 0;
  },

  // Date validation
  isDate: (value) => {
    return validator.isDate(value, {
      format: 'YYYY-MM-DD',
      strictMode: true
    });
  },

  // ObjectId validation
  isObjectId: (value) => {
    return validator.isMongoId(value);
  },

  // Array validation
  isArray: (value, minLength = 1) => {
    return Array.isArray(value) && value.length >= minLength;
  },

  // File extension validation
  isFileType: (filename, allowedExtensions) => {
    const ext = filename.split('.').pop().toLowerCase();
    return allowedExtensions.includes(ext);
  },

  // File size validation
  isFileSize: (size, maxSizeInMB) => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return size <= maxSizeInBytes;
  }
};

// Custom validation functions
const CustomValidators = {
  // Check if array contains unique values
  hasUniqueValues: (array) => {
    return new Set(array).size === array.length;
  },

  // Check if value is within range
  isInRange: (value, min, max) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  },

  // Check if date is in the future
  isFutureDate: (date) => {
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate >= today;
  },

  // Check if date range is valid (end date after start date)
  isValidDateRange: (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return end > start;
  },

  // Validate Cameroon phone number
  validateCameroonPhone: (phone) => {
    // Remove spaces and special characters
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    
    // Check if starts with +237 or 237
    if (cleaned.startsWith('+237')) {
      return cleaned.length === 13;
    } else if (cleaned.startsWith('237')) {
      return cleaned.length === 12;
    } else if (cleaned.startsWith('6') || cleaned.startsWith('7')) {
      return cleaned.length === 9;
    }
    
    return false;
  }
};

module.exports = { ...Validators, ...CustomValidators };