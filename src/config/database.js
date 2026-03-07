const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB connecté: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`❌ Erreur MongoDB: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB déconnecté');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('🔌 Connexion MongoDB fermée');
      process.exit(0);
    });

  } catch (error) {
    logger.error(`❌ Erreur de connexion MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;