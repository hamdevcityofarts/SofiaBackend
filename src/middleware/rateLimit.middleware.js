const rateLimit = require('express-rate-limit');

// Rate limiting pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: {
    status: 'error',
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
  },
  skipSuccessfulRequests: true
});

// Rate limiting pour les requêtes API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max
  message: {
    status: 'error',
    message: 'Trop de requêtes depuis cette IP. Veuillez réessayer dans 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting pour les uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 uploads max par heure
  message: {
    status: 'error',
    message: 'Trop de fichiers uploadés. Limite de 10 fichiers par heure.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter
};