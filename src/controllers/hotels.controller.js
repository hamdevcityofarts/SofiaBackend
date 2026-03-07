const Hotel = require('../models/Hotel.model');
const logger = require('../utils/logger');

// @desc    Get all hotels
// @route   GET /api/hotels
// @access  Public
exports.getAllHotels = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      city,
      stars,
      minPrice,
      maxPrice,
      amenities,
      search
    } = req.query;

    // Build query
    const query = { isActive: true, status: 'active' };

    // City filter
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    // Stars filter
    if (stars) {
      query.stars = { $gte: parseInt(stars) };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query['rooms.pricePerNight'] = {};
      if (minPrice) query['rooms.pricePerNight'].$gte = parseFloat(minPrice);
      if (maxPrice) query['rooms.pricePerNight'].$lte = parseFloat(maxPrice);
    }

    // Amenities filter
    if (amenities) {
      const amenitiesArray = amenities.split(',');
      query.amenities = { $all: amenitiesArray };
    }

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query
    const hotelsQuery = Hotel.find(query);

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    hotelsQuery.skip(skip).limit(limitNum);

    // Get hotels and count
    const [hotels, total] = await Promise.all([
      hotelsQuery,
      Hotel.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        hotels,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération hôtels: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des hôtels'
    });
  }
};

// @desc    Get single hotel
// @route   GET /api/hotels/:id
// @access  Public
exports.getHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        status: 'error',
        message: 'Hôtel non trouvé'
      });
    }

    // Increment views
    hotel.metadata.views += 1;
    await hotel.save();

    res.status(200).json({
      status: 'success',
      data: {
        hotel
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération hôtel: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération de l\'hôtel'
    });
  }
};

// @desc    Create hotel
// @route   POST /api/hotels
// @access  Private/Admin
exports.createHotel = async (req, res) => {
  try {
    const hotel = await Hotel.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        hotel
      }
    });

  } catch (error) {
    logger.error(`Erreur création hôtel: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création de l\'hôtel'
    });
  }
};

// @desc    Update hotel
// @route   PUT /api/hotels/:id
// @access  Private/Admin
exports.updateHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!hotel) {
      return res.status(404).json({
        status: 'error',
        message: 'Hôtel non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        hotel
      }
    });

  } catch (error) {
    logger.error(`Erreur mise à jour hôtel: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour de l\'hôtel'
    });
  }
};

// @desc    Delete hotel
// @route   DELETE /api/hotels/:id
// @access  Private/Admin
exports.deleteHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        status: 'error',
        message: 'Hôtel non trouvé'
      });
    }

    // Soft delete
    hotel.isActive = false;
    hotel.status = 'inactive';
    await hotel.save();

    res.status(200).json({
      status: 'success',
      message: 'Hôtel désactivé avec succès'
    });

  } catch (error) {
    logger.error(`Erreur suppression hôtel: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression de l\'hôtel'
    });
  }
};

// @desc    Check room availability
// @route   POST /api/hotels/:id/check-availability
// @access  Public
exports.checkAvailability = async (req, res) => {
  try {
    const { roomType, checkIn, checkOut, guests } = req.body;
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        status: 'error',
        message: 'Hôtel non trouvé'
      });
    }

    const availability = hotel.checkAvailability(roomType, checkIn, checkOut);

    res.status(200).json({
      status: 'success',
      data: {
        availability,
        hotel: {
          name: hotel.name,
          address: hotel.address
        }
      }
    });

  } catch (error) {
    logger.error(`Erreur vérification disponibilité: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la vérification de la disponibilité'
    });
  }
};

// @desc    Get hotel statistics
// @route   GET /api/hotels/stats
// @access  Private/Admin
exports.getHotelStats = async (req, res) => {
  try {
    const stats = await Hotel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalHotels: { $sum: 1 },
          totalRooms: {
            $sum: {
              $sum: '$rooms.totalRooms'
            }
          },
          averageRating: { $avg: '$stars' },
          byCity: {
            $push: {
              city: '$address.city',
              hotels: 1
            }
          }
        }
      },
      {
        $unwind: '$byCity'
      },
      {
        $group: {
          _id: '$byCity.city',
          hotels: { $sum: 1 },
          parent: { $first: '$$ROOT' }
        }
      },
      {
        $group: {
          _id: null,
          totalHotels: { $first: '$parent.totalHotels' },
          totalRooms: { $first: '$parent.totalRooms' },
          averageRating: { $first: '$parent.averageRating' },
          cities: {
            $push: {
              city: '$_id',
              hotels: '$hotels'
            }
          }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: stats[0] || {}
      }
    });

  } catch (error) {
    logger.error(`Erreur statistiques hôtels: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};