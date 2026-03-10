const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const Book = require('../models/Book.model');
const Order = require('../models/Order.model');
const Hotel = require('../models/Hotel.model');
const { protect, authorize } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

// Toutes les routes admin sont protégées
router.use(protect);
router.use(authorize('admin'));

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [usersCount, booksCount, ordersCount, hotelsCount, revenueStats] = await Promise.all([
      User.countDocuments(),
      Book.countDocuments(),
      Order.countDocuments(),
      Hotel.countDocuments({ isActive: true }),
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            monthlyRevenue: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', new Date(new Date().setDate(new Date().getDate() - 30))] },
                  '$totalAmount',
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const recentOrders = await Order.find()
      .sort('-createdAt')
      .limit(5)
      .populate('user', 'firstName lastName email');

    const lowStockBooks = await Book.find({ stock: { $lt: 10 }, status: 'active' })
      .limit(5)
      .select('title stock price');

    res.status(200).json({
      status: 'success',
      data: {
        counts: { users: usersCount, books: booksCount, orders: ordersCount, hotels: hotelsCount },
        revenue: revenueStats[0] || { totalRevenue: 0, monthlyRevenue: 0 },
        recentOrders,
        lowStockBooks
      }
    });
  } catch (error) {
    logger.error(`Erreur statistiques admin: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la récupération des statistiques' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS — CRUD COMPLET
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
        { email:     { $regex: search, $options: 'i' } },
      ];
    }

    if (role) query.role = role;

    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true';
    }

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error(`Admin getUsers: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur serveur' });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });
    }

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    logger.error(`Admin getUser: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur serveur' });
  }
});

// POST /api/admin/users
router.post('/users', async (req, res) => {
  try {
    const {
      firstName, lastName, email, password,
      role, phone, isActive, emailVerified
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Prénom, nom, email et mot de passe sont requis'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // User.create déclenche pre('save') → hash automatique du password
    const user = await User.create({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.toLowerCase().trim(),
      password,
      role:          role          || 'user',
      phone:         phone         || '',
      isActive:      isActive      !== undefined ? isActive      : true,
      emailVerified: emailVerified !== undefined ? emailVerified : false,
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;

    res.status(201).json({ status: 'success', data: { user: userObj } });
  } catch (error) {
    logger.error(`Admin createUser: ${error.message}`);
    if (error.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'Email déjà utilisé' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ status: 'error', message: messages.join(', ') });
    }
    res.status(500).json({ status: 'error', message: 'Erreur serveur' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const {
      firstName, lastName, email, password,
      role, phone, isActive, emailVerified
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });
    }

    // Mise à jour champ par champ
    if (firstName     !== undefined) user.firstName     = firstName.trim();
    if (lastName      !== undefined) user.lastName      = lastName.trim();
    if (email         !== undefined) user.email         = email.toLowerCase().trim();
    if (role          !== undefined) user.role          = role;
    if (phone         !== undefined) user.phone         = phone;
    if (isActive      !== undefined) user.isActive      = isActive;
    if (emailVerified !== undefined) user.emailVerified = emailVerified;

    // Mot de passe uniquement si fourni → pre('save') gère le hash
    if (password && password.trim() !== '') {
      user.password = password;
    }

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;

    res.status(200).json({ status: 'success', data: { user: userObj } });
  } catch (error) {
    logger.error(`Admin updateUser: ${error.message}`);
    if (error.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'Email déjà utilisé' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ status: 'error', message: messages.join(', ') });
    }
    res.status(500).json({ status: 'error', message: 'Erreur serveur' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    // Empêcher l'admin de se supprimer lui-même
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });
    }

    await user.deleteOne();

    res.status(200).json({ status: 'success', message: 'Utilisateur supprimé' });
  } catch (error) {
    logger.error(`Admin deleteUser: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur serveur' });
  }
});

// PATCH /api/admin/users/:id/toggle-status
router.patch('/users/:id/toggle-status', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });
    }

    user.isActive = !user.isActive;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({ status: 'success', data: { user: userObj } });
  } catch (error) {
    logger.error(`Admin toggleStatus: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur serveur' });
  }
});

// PUT /api/admin/users/:id/role  (conservé pour compatibilité)
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'hotel_manager'].includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Rôle invalide' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });
    }

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    logger.error(`Admin updateRole: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur serveur' });
  }
});

// PUT /api/admin/users/:id/toggle-active (conservé pour compatibilité)
router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    logger.error(`Admin toggleActive: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors du changement de statut' });
  }
});

module.exports = router;