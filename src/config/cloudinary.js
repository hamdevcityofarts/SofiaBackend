const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Fonction pour uploader une image
const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'sofia-smart-solutions',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      resource_type: 'auto',
      ...options
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    logger.error(`Erreur Cloudinary: ${error.message}`);
    throw new Error('Échec de l\'upload vers Cloudinary');
  }
};

// Fonction pour supprimer une image
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    logger.error(`Erreur suppression Cloudinary: ${error.message}`);
    throw new Error('Échec de la suppression de l\'image');
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary
};