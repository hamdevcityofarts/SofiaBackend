const Order = require('../models/Order.model');
const Book = require('../models/Book.model');
const logger = require('../utils/logger');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, customerNotes } = req.body;
    const userId = req.user.id;

    // Validate items and check stock
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const book = await Book.findById(item.book);
      
      if (!book) {
        return res.status(404).json({
          status: 'error',
          message: `Livre avec ID ${item.book} non trouvé`
        });
      }

      if (!book.isAvailable()) {
        return res.status(400).json({
          status: 'error',
          message: `Le livre "${book.title}" n'est plus disponible`
        });
      }

      if (book.stock < item.quantity) {
        return res.status(400).json({
          status: 'error',
          message: `Stock insuffisant pour "${book.title}". Disponible: ${book.stock}, Demandé: ${item.quantity}`
        });
      }

      const itemTotal = book.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        book: book._id,
        title: book.title,
        price: book.price,
        quantity: item.quantity,
        total: itemTotal,
        coverImage: book.coverImage
      });
    }

    // Calculate shipping cost (simplified)
    const shippingCost = subtotal > 50000 ? 0 : 2000; // Free shipping above 50,000 XAF

    // Calculate tax (19% VAT for Cameroon)
    const tax = subtotal * 0.19;

    // Create order
    const order = await Order.create({
      user: userId,
      items: orderItems,
      subtotal,
      shippingCost,
      tax,
      totalAmount: subtotal + shippingCost + tax,
      paymentMethod,
      shippingAddress,
      customerNotes,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    // Update book stock
    for (const item of items) {
      await Book.findByIdAndUpdate(item.book, {
        $inc: { 
          stock: -item.quantity,
          'metadata.purchases': item.quantity
        }
      });
    }

    res.status(201).json({
      status: 'success',
      data: {
        order
      }
    });

  } catch (error) {
    logger.error(`Erreur création commande: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création de la commande'
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort('-createdAt')
      .populate('items.book', 'title coverImage');

    res.status(200).json({
      status: 'success',
      data: {
        orders
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération commandes: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des commandes'
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('items.book', 'title author coverImage');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Commande non trouvée'
      });
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Non autorisé à accéder à cette commande'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        order
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération commande: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération de la commande'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Commande non trouvée'
      });
    }

    await order.updateStatus(status, notes);

    res.status(200).json({
      status: 'success',
      data: {
        order
      }
    });

  } catch (error) {
    logger.error(`Erreur mise à jour statut commande: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Execute query
    const ordersQuery = Order.find(query)
      .populate('user', 'firstName lastName email')
      .sort('-createdAt');

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    ordersQuery.skip(skip).limit(limitNum);

    // Get orders and count
    const [orders, total] = await Promise.all([
      ordersQuery,
      Order.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        orders,
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
    logger.error(`Erreur récupération toutes commandes: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des commandes'
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private/Admin
exports.getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          processingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get monthly revenue
    const monthlyRevenue = await Order.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: stats[0] || {},
        monthlyRevenue
      }
    });

  } catch (error) {
    logger.error(`Erreur statistiques commandes: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};