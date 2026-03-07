const Service = require('../models/Service.model');
const logger = require('../utils/logger');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .sort('order')
      .select('-__v');

    res.status(200).json({
      status: 'success',
      data: {
        services
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération services: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des services'
    });
  }
};

// @desc    Get single service
// @route   GET /api/services/:id
// @access  Public
exports.getService = async (req, res) => {
  try {
    const service = await Service.findOne({
      $or: [
        { _id: req.params.id },
        { slug: req.params.id }
      ],
      isActive: true
    });

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service non trouvé'
      });
    }

    // Increment views
    service.metadata.views += 1;
    await service.save();

    res.status(200).json({
      status: 'success',
      data: {
        service
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération service: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du service'
    });
  }
};

// @desc    Create service
// @route   POST /api/services
// @access  Private/Admin
exports.createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        service
      }
    });

  } catch (error) {
    logger.error(`Erreur création service: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création du service'
    });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private/Admin
exports.updateService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        service
      }
    });

  } catch (error) {
    logger.error(`Erreur mise à jour service: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour du service'
    });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private/Admin
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service non trouvé'
      });
    }

    // Soft delete
    service.isActive = false;
    await service.save();

    res.status(200).json({
      status: 'success',
      message: 'Service désactivé avec succès'
    });

  } catch (error) {
    logger.error(`Erreur suppression service: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression du service'
    });
  }
};

// @desc    Get service categories
// @route   GET /api/services/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Service.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération catégories services: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des catégories'
    });
  }
};

// @desc    Submit service inquiry
// @route   POST /api/services/:id/inquire
// @access  Public
exports.submitInquiry = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service non trouvé'
      });
    }

    // Increment inquiries
    service.metadata.inquiries += 1;
    await service.save();

    // TODO: Send email notification
    // await sendEmail({
    //   to: process.env.ADMIN_EMAIL,
    //   subject: `Nouvelle demande pour ${service.title}`,
    //   template: 'service-inquiry',
    //   context: {
    //     service: service.title,
    //     name,
    //     email,
    //     phone,
    //     message
    //   }
    // });

    res.status(200).json({
      status: 'success',
      message: 'Votre demande a été envoyée avec succès'
    });

  } catch (error) {
    logger.error(`Erreur soumission demande: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'envoi de la demande'
    });
  }
};