const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
require('dotenv').config();
require('express-async-errors');

// Import DB
const connectDB = require('./src/config/database');

// Import des routes
const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/admin.routes');
const booksRoutes = require('./src/routes/books.routes');
const hotelsRoutes = require('./src/routes/hotels.routes');
const servicesRoutes = require('./src/routes/services.routes');
const ordersRoutes = require('./src/routes/orders.routes');

// Import middleware d'erreur
const errorHandler = require('./src/middleware/error.middleware');
const logger = require('./src/utils/logger');

// Initialisation de l'application
const app = express();
app.set('trust proxy', 1);

// Configuration CORS
const corsOptions = {
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Configuration Helmet
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

// Swagger UI (disponible en production aussi)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware globaux
app.use(cors(corsOptions));
app.use(helmet(helmetConfig));
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sécurité MongoDB
app.use(mongoSanitize({ replaceWith: '_' }));

// Protection XSS — NE PAS encoder les champs sensibles (password, token)
app.use((req, res, next) => {
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'resetToken'];

  const cleanObject = (obj) => {
    if (!obj) return obj;
    for (let key in obj) {
      if (sensitiveFields.includes(key)) continue; // ← Ignorer les mots de passe
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        cleanObject(obj[key]);
      }
    }
  };

  if (req.body) cleanObject(req.body);
  if (req.query) cleanObject(req.query);
  if (req.params) cleanObject(req.params);

  next();
});

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Rate limiting auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: 'error', message: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
  skipSuccessfulRequests: true
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Logging des requêtes
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user ? req.user.id : 'anonymous'
    });
  });
  next();
});

// Headers de sécurité supplémentaires
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Sofia Smart Solutions API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/hotels', hotelsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/admin', adminRoutes);

// Route de bienvenue
app.get('/', (req, res) => {
  res.status(200).json({
    message: "Bienvenue sur l'API Sofia Smart Solutions",
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      auth: '/api/auth',
      books: '/api/books',
      orders: '/api/orders',
      hotels: '/api/hotels',
      services: '/api/services',
      admin: '/api/admin',
      docs: '/api/docs',
      health: '/api/health'
    }
  });
});

// 404
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} non trouvée`,
    availableEndpoints: ['/api/auth', '/api/books', '/api/orders', '/api/hotels', '/api/services', '/api/admin']
  });
});

// Middleware erreurs
app.use(errorHandler);

// ─── DÉMARRAGE UNIQUE DU SERVEUR ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    logger.info('🔄 Connexion à MongoDB en cours...');
    await connectDB();
    logger.info('✅ MongoDB connecté avec succès');

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Serveur démarré sur le port ${PORT} en mode ${process.env.NODE_ENV}`);
      logger.info(`🌐 URL: http://localhost:${PORT}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`📚 Documentation: http://localhost:${PORT}/api/docs`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Le port ${PORT} est déjà utilisé.`);
      } else {
        logger.error(`❌ Erreur de démarrage: ${error.message}`);
      }
      process.exit(1);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM reçu, arrêt propre du serveur');
      server.close(() => { logger.info('Serveur arrêté'); process.exit(0); });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT reçu, arrêt du serveur');
      server.close(() => { logger.info('Serveur arrêté'); process.exit(0); });
    });

  } catch (error) {
    logger.error(`❌ Impossible de démarrer — MongoDB inaccessible: ${error.message}`);
    logger.error(`🔍 MONGODB_URI: ${process.env.MONGODB_URI ? 'définie ✓' : 'MANQUANTE ✗'}`);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  logger.error(`❌ Erreur non catchée: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`❌ Rejet non géré: ${reason}`);
  process.exit(1);
});

startServer();

module.exports = app;